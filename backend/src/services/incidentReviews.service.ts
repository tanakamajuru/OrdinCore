import { v4 as uuidv4 } from 'uuid';
import { query, getClient } from '../config/database';
import { incidentsRepo } from '../repositories/incidents.repo';
import { canonicalGovernanceActionService } from './canonicalGovernanceAction.service';
import { notificationsService } from './notifications.service';
import logger from '../utils/logger';

// 22 Nov 2026 brief -> Serious Incident workflow, Steps 3-4. Replaces the purely status-derived
// "Review Incident" guided-work item (migration 215 / guidedWork.service.ts) with a real,
// assignable review: a named owner distinct from whoever clicked "Start Investigation", a due
// date a manager actually set, assignment history, a reviewer-declared Waiting state, and a
// decision (outcome + rationale) that produces a versioned, immutable completed record.

export type DecisionOutcome =
  | 'Further investigation required'
  | 'Actions or checks outstanding'
  | 'Ready for resolution'
  | 'Refer for leadership oversight';

const OUTCOMES: DecisionOutcome[] = [
  'Further investigation required',
  'Actions or checks outstanding',
  'Ready for resolution',
  'Refer for leadership oversight',
];
// Terminal outcomes close THIS review round (leadership oversight / resolution are each their
// own separate, explicitly authorised next step -- never automatic). Non-terminal outcomes mean
// another round of review is needed, which requires a next_review_at.
const TERMINAL_OUTCOMES: DecisionOutcome[] = ['Ready for resolution', 'Refer for leadership oversight'];

// Matches the role set this brief names explicitly ("Registered Manager, Director, Admin, Super
// Admin") -- a superset of the narrower role lists incidents.routes.ts already uses for
// assign/resolve (which omit Director), because this brief specifically asks for Director to be
// included as an authorised reviewer/assigner.
export const AUTHORISED_REVIEWER_ROLES = ['REGISTERED_MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'];
const OPEN_INCIDENT_STATUSES = ['Open', 'In Progress'];

// Same accountability ladder escalations.service.ts escalateFurther() climbs (RM -> Director ->
// Responsible Individual) -- reused rather than reinvented for "Refer for leadership oversight".
const LEADERSHIP_LADDER: Record<string, string> = {
  REGISTERED_MANAGER: 'DIRECTOR',
  DIRECTOR: 'RESPONSIBLE_INDIVIDUAL',
};

function fullName(first?: string | null, last?: string | null): string | null {
  return [first, last].filter(Boolean).join(' ').trim() || null;
}

async function getIncidentScoped(incidentId: string, companyId: string) {
  const incident = await incidentsRepo.findById(incidentId, companyId);
  if (!incident) throw new Error('Incident not found');
  return incident;
}

// A completed row is an immutable record (same doctrine as governance_reconstructions'
// status='Locked'); only the assigned reviewer (or an administrator) may edit an in-progress one.
function assertEditable(review: any, actorId: string, actorRole: string): void {
  if (review.status === 'Completed') {
    throw new Error('This review is completed and is now an immutable record.');
  }
  const role = String(actorRole || '').toUpperCase();
  if (review.assigned_to !== actorId && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    throw new Error('Only the assigned reviewer (or an administrator) can edit this review.');
  }
}

const DRAFT_FIELDS = [
  'facts', 'impact', 'warning_signs', 'contributing_factors', 'evidence_gaps',
  'timeliness_notes', 'response_evaluation', 'effectiveness_notes', 'effectiveness_evidence_needed',
  'effectiveness_recheck_at', 'external_reference_notes', 'decision_outcome', 'decision_rationale',
  'next_review_at',
];

async function fetchActionsForIncident(incidentId: string, companyId: string) {
  return (await query(
    `SELECT ra.id, ra.title, ra.status, ra.due_date, ra.completed_at, ra.assigned_to,
            COALESCE(NULLIF(TRIM(u.first_name||' '||u.last_name),''),'Unassigned') AS assigned_to_name,
            eff.outcome AS effectiveness_outcome, eff.effectiveness_evidence, eff.review_state
       FROM risk_actions ra
       LEFT JOIN users u ON u.id = ra.assigned_to
       LEFT JOIN canonical_action_effectiveness_v eff ON eff.action_id = ra.id AND eff.company_id = ra.company_id
      WHERE ra.company_id = $1 AND ra.incident_id = $2
      ORDER BY ra.created_at`,
    [companyId, incidentId]
  )).rows;
}

export const incidentReviewsService = {
  // Read-only case/evidence bundle for the review screen. Attachments are split by whether they
  // predate the incident, using the same incident.occurred_at cutoff comparison already used
  // elsewhere in the incident-evidence code (incidents.repo.ts reconstruction timeline queries
  // compare against incident.occurred_at, not a separately invented cutoff).
  async getCaseSummary(incidentId: string, companyId: string) {
    const incident = await getIncidentScoped(incidentId, companyId);
    const attachments = await incidentsRepo.getAttachments(incidentId, companyId);
    const occurredAtMs = new Date(incident.occurred_at).getTime();
    const taggedAttachments = attachments.map((a: any) => ({
      ...a,
      predates_incident: !Number.isNaN(occurredAtMs) ? new Date(a.created_at).getTime() <= occurredAtMs : null,
    }));
    const actions = await fetchActionsForIncident(incidentId, companyId);
    return {
      incident: {
        id: incident.id, reference: incident.reference, title: incident.title, severity: incident.severity,
        status: incident.status, house_id: incident.house_id, house_name: incident.house_name,
        occurred_at: incident.occurred_at, description: incident.description, location: incident.location,
        persons_involved: incident.persons_involved, immediate_action: incident.immediate_action,
        warning_signals: incident.warning_signals,
      },
      attachments: taggedAttachments,
      linked_risks: incident.linked_risks || [],
      linked_escalations: incident.linked_escalations || [],
      linked_signals: incident.linked_signals || [],
      actions,
    };
  },

  async listEligibleReviewers(companyId: string) {
    const res = await query(
      `SELECT id, first_name, last_name, role FROM users
        WHERE company_id = $1 AND LOWER(COALESCE(status,'active')) = 'active' AND role = ANY($2::text[])
        ORDER BY first_name, last_name`,
      [companyId, AUTHORISED_REVIEWER_ROLES]
    );
    return res.rows;
  },

  // Current active (non-completed) review + full completed-version history + assignment log —
  // everything the Incident Detail / review screen needs to show owner, due date and history.
  async getActive(incidentId: string, companyId: string) {
    await getIncidentScoped(incidentId, companyId);
    const active = (await query(
      `SELECT ir.*, COALESCE(NULLIF(TRIM(au.first_name||' '||au.last_name),''),'Unassigned') AS assigned_to_name,
              NULLIF(TRIM(ab.first_name||' '||ab.last_name),'') AS assigned_by_name
         FROM incident_reviews ir
         LEFT JOIN users au ON au.id = ir.assigned_to
         LEFT JOIN users ab ON ab.id = ir.assigned_by
        WHERE ir.incident_id = $1 AND ir.company_id = $2 AND ir.status <> 'Completed'
        LIMIT 1`,
      [incidentId, companyId]
    )).rows[0] || null;
    const completedReviews = (await query(
      `SELECT ir.*, NULLIF(TRIM(cu.first_name||' '||cu.last_name),'') AS completed_by_name
         FROM incident_reviews ir LEFT JOIN users cu ON cu.id = ir.completed_by
        WHERE ir.incident_id = $1 AND ir.company_id = $2 AND ir.status = 'Completed'
        ORDER BY ir.version DESC`,
      [incidentId, companyId]
    )).rows;
    const assignmentHistory = (await query(
      `SELECT a.*, NULLIF(TRIM(bu.first_name||' '||bu.last_name),'') AS assigned_by_name,
              NULLIF(TRIM(tu.first_name||' '||tu.last_name),'') AS assigned_to_name
         FROM incident_review_assignments a
         LEFT JOIN users bu ON bu.id = a.assigned_by
         LEFT JOIN users tu ON tu.id = a.assigned_to
        WHERE a.incident_id = $1 AND a.company_id = $2
        ORDER BY a.assigned_at DESC`,
      [incidentId, companyId]
    )).rows;
    return { active, completedReviews, assignmentHistory };
  },

  async getById(reviewId: string, companyId: string) {
    const row = (await query(
      `SELECT ir.*, i.reference AS incident_reference, i.title AS incident_title, i.severity AS incident_severity,
              i.occurred_at AS incident_occurred_at, i.house_id AS incident_house_id, h.name AS service_name,
              COALESCE(NULLIF(TRIM(au.first_name||' '||au.last_name),''),'Unassigned') AS assigned_to_name,
              au.role AS assigned_to_role,
              NULLIF(TRIM(cu.first_name||' '||cu.last_name),'') AS completed_by_name,
              cu.role AS completed_by_role
         FROM incident_reviews ir
         JOIN incidents i ON i.id = ir.incident_id
         LEFT JOIN houses h ON h.id = i.house_id
         LEFT JOIN users au ON au.id = ir.assigned_to
         LEFT JOIN users cu ON cu.id = ir.completed_by
        WHERE ir.id = $1 AND ir.company_id = $2`,
      [reviewId, companyId]
    )).rows[0];
    if (!row) throw new Error('Incident review not found');
    return row;
  },

  // Assign or reassign the ONE active review for this incident. Reassigning updates the SAME
  // row in place (never a second active row -- enforced at the DB layer by
  // uq_incident_reviews_one_active) and logs the change to incident_review_assignments, so the
  // previous owner's guided-work item disappears (it is derived from assigned_to = userId) the
  // moment the new owner's appears.
  async assign(incidentId: string, companyId: string, actorId: string, body: { assignedTo: string; dueAt?: string | null; note?: string | null }) {
    const incident = await getIncidentScoped(incidentId, companyId);
    if (!OPEN_INCIDENT_STATUSES.includes(incident.status)) {
      throw new Error('A review can only be assigned while the incident is Open or In Progress.');
    }
    if (!body.assignedTo) throw new Error('Choose who should review this incident.');
    const reviewer = (await query(`SELECT id, role, status FROM users WHERE id = $1 AND company_id = $2`, [body.assignedTo, companyId])).rows[0];
    if (!reviewer) throw new Error('Reviewer not found.');
    if (!AUTHORISED_REVIEWER_ROLES.includes(String(reviewer.role || '').toUpperCase())) {
      throw new Error('The reviewer must be a Registered Manager, Director, Admin or Super Admin.');
    }
    if (String(reviewer.status || 'active').toLowerCase() !== 'active') {
      throw new Error('The reviewer is not an active user.');
    }

    const existing = (await query(
      `SELECT * FROM incident_reviews WHERE incident_id = $1 AND company_id = $2 AND status <> 'Completed'`,
      [incidentId, companyId]
    )).rows[0];

    let review: any;
    if (existing) {
      review = (await query(
        `UPDATE incident_reviews
            SET assigned_to = $1, assigned_by = $2, assigned_at = NOW(), due_at = $3,
                is_waiting = FALSE, waiting_reason = NULL, waiting_since = NULL, updated_at = NOW()
          WHERE id = $4 RETURNING *`,
        [body.assignedTo, actorId, body.dueAt || null, existing.id]
      )).rows[0];
    } else {
      review = (await query(
        `INSERT INTO incident_reviews (id, company_id, incident_id, version, status, assigned_to, assigned_by, due_at)
         VALUES ($1,$2,$3,1,'Assigned',$4,$5,$6) RETURNING *`,
        [uuidv4(), companyId, incidentId, body.assignedTo, actorId, body.dueAt || null]
      )).rows[0];
    }

    await query(
      `INSERT INTO incident_review_assignments (id, review_id, incident_id, company_id, assigned_by, assigned_to, due_at, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [uuidv4(), review.id, incidentId, companyId, actorId, body.assignedTo, body.dueAt || null, body.note || null]
    );

    await incidentsRepo.addEvent(incidentId, companyId, {
      event_type: 'review_assigned',
      title: 'Serious incident review assigned',
      description: `Review assigned${body.dueAt ? `, due ${new Date(body.dueAt).toLocaleDateString('en-GB')}` : ''}.`,
      metadata: { review_id: review.id, assigned_to: body.assignedTo },
      created_by: actorId,
    });

    if (body.assignedTo !== actorId) {
      try {
        await notificationsService.create({
          company_id: companyId, user_id: body.assignedTo, type: 'INCIDENT_REVIEW_ASSIGNED',
          title: 'Incident review assigned to you', body: `"${incident.title}" needs a serious incident review.`,
          link: `/incidents/${incidentId}/review`,
        });
      } catch { /* best-effort */ }
    }
    return review;
  },

  async saveDraft(reviewId: string, companyId: string, actorId: string, actorRole: string, fields: Record<string, unknown>) {
    const review = await this.getById(reviewId, companyId);
    assertEditable(review, actorId, actorRole);
    if (fields.decision_outcome && !OUTCOMES.includes(fields.decision_outcome as DecisionOutcome)) {
      throw new Error('Invalid decision outcome.');
    }
    const params: unknown[] = [reviewId];
    const sets: string[] = [];
    for (const key of DRAFT_FIELDS) {
      if (key in fields) {
        params.push((fields as any)[key] ?? null);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (!sets.length) return review;
    const updated = (await query(
      `UPDATE incident_reviews SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      params
    )).rows[0];
    return updated;
  },

  // Reviewer-declared Waiting state — never inferred. Toggling off clears the reason/since stamp.
  async setWaiting(reviewId: string, companyId: string, actorId: string, actorRole: string, body: { isWaiting: boolean; reason?: string }) {
    const review = await this.getById(reviewId, companyId);
    assertEditable(review, actorId, actorRole);
    if (body.isWaiting && !String(body.reason || '').trim()) {
      throw new Error('Explain what evidence this review is waiting on.');
    }
    const updated = (await query(
      `UPDATE incident_reviews
          SET is_waiting = $2, waiting_reason = $3,
              waiting_since = CASE WHEN $2 THEN COALESCE(waiting_since, NOW()) ELSE NULL END,
              updated_at = NOW()
        WHERE id = $1 RETURNING *`,
      [reviewId, !!body.isWaiting, body.isWaiting ? String(body.reason).trim() : null]
    )).rows[0];
    return updated;
  },

  // Add an assignable action from this review (owner + deadline), on the ONE canonical action
  // spine (incident-linked), mirroring escalations.service.ts addTask()'s transaction shape so a
  // failure partway through never leaves a half-committed action.
  async addAction(reviewId: string, companyId: string, actorId: string, actorRole: string, body: { title?: string; assigned_to?: string; due_date?: string | null; rationale?: string }) {
    const review = await this.getById(reviewId, companyId);
    assertEditable(review, actorId, actorRole);
    const rationale = String(body.rationale || '').trim();
    if (!rationale) throw new Error('Explain what this review found and why this action is needed.');
    if (!body.assigned_to) throw new Error('Choose who is responsible for this action.');
    const incident = await incidentsRepo.findById(review.incident_id, companyId);
    if (!incident) throw new Error('Incident not found');
    const title = (String(body.title || '').trim() || `Action from serious incident review: ${incident.title}`).slice(0, 255);

    const client = await getClient();
    let action: any;
    try {
      await client.query('BEGIN');
      action = await canonicalGovernanceActionService.create({
        companyId, createdBy: actorId, title, description: rationale,
        assignedTo: body.assigned_to, dueDate: body.due_date || null,
        houseId: incident.house_id || null, incidentId: incident.id,
        reviewRequirement: 'COMPLETION_ONLY',
      }, client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    if (!(action as any).__replayed) {
      try {
        await notificationsService.create({
          company_id: companyId, user_id: action.assigned_to || body.assigned_to, type: 'task_assigned',
          title: 'Task assigned to you', body: title, link: '/my-actions',
        });
      } catch { /* best-effort */ }
    }
    return action;
  },

  // Links a learning record created through the existing learning.service.ts create() flow
  // (source_type 'INCIDENT') -- never duplicates that creation logic here.
  async linkLearning(reviewId: string, companyId: string, actorId: string, actorRole: string, learningRecordId: string) {
    const review = await this.getById(reviewId, companyId);
    assertEditable(review, actorId, actorRole);
    const lr = (await query(`SELECT id FROM learning_records WHERE id = $1 AND company_id = $2`, [learningRecordId, companyId])).rows[0];
    if (!lr) throw new Error('Learning record not found.');
    const updated = (await query(
      `UPDATE incident_reviews SET learning_record_id = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [reviewId, learningRecordId]
    )).rows[0];
    return updated;
  },

  // Complete the review: requires outcome + rationale, snapshots the linked actions (so the PDF
  // never has to live-recompute them later), stamps an immutable completed_at/completed_by, and
  // — if the outcome is not terminal — creates the next review round, routed to its owner via a
  // fresh guided-work item (incidentReview_reviews row with status='Assigned').
  async complete(reviewId: string, companyId: string, actorId: string, actorRole: string, body: { decision_outcome?: string; decision_rationale?: string; next_review_at?: string | null }) {
    const review = await this.getById(reviewId, companyId);
    assertEditable(review, actorId, actorRole);

    const outcome = (body.decision_outcome || review.decision_outcome) as DecisionOutcome;
    if (!outcome || !OUTCOMES.includes(outcome)) {
      throw new Error('Choose a decision outcome: Further investigation required, Actions or checks outstanding, Ready for resolution, or Refer for leadership oversight.');
    }
    const rationale = String(body.decision_rationale || review.decision_rationale || '').trim();
    if (!rationale) throw new Error('A rationale is required to complete this review.');
    const isTerminal = TERMINAL_OUTCOMES.includes(outcome);
    const nextReviewAt = (body.next_review_at ?? review.next_review_at) || null;
    if (!isTerminal && !nextReviewAt) {
      throw new Error('A next review date is required when another review round is needed.');
    }

    const actionsSnapshot = await fetchActionsForIncident(review.incident_id, companyId);

    const completed = (await query(
      `UPDATE incident_reviews
          SET decision_outcome = $2, decision_rationale = $3, next_review_at = $4,
              actions_snapshot = $5::jsonb, status = 'Completed', completed_at = NOW(), completed_by = $6,
              updated_at = NOW()
        WHERE id = $1 AND status <> 'Completed' RETURNING *`,
      [reviewId, outcome, rationale, isTerminal ? null : nextReviewAt, JSON.stringify(actionsSnapshot), actorId]
    )).rows[0];
    if (!completed) throw new Error('This review is already completed.');

    const incident = await incidentsRepo.findById(review.incident_id, companyId);
    const completerRow = (await query(`SELECT first_name, last_name FROM users WHERE id = $1`, [actorId])).rows[0];
    const completerDisplay = fullName(completerRow?.first_name, completerRow?.last_name) || 'A reviewer';

    // Updates both the simple Incident Timeline (incident_events, shown on Incident Detail) and
    // — because getGovernanceTimeline() reads frozen reconstruction snapshots first and live
    // incident_events-independent evidence otherwise — remains visible to anyone viewing the
    // incident's governance history via the same addEvent() path every other incident lifecycle
    // change already uses (reassigned/resolved/etc.).
    await incidentsRepo.addEvent(review.incident_id, companyId, {
      event_type: 'review_completed',
      title: 'Serious incident review completed',
      description: `${completerDisplay} completed review v${review.version}: ${outcome}.`,
      metadata: { review_id: reviewId, version: review.version, outcome },
      created_by: actorId,
    });

    let followUpReview: any = null;
    if (!isTerminal) {
      followUpReview = (await query(
        `INSERT INTO incident_reviews (id, company_id, incident_id, version, status, assigned_to, assigned_by, due_at)
         VALUES ($1,$2,$3,$4,'Assigned',$5,$6,$7) RETURNING *`,
        [uuidv4(), companyId, review.incident_id, review.version + 1, review.assigned_to, actorId, nextReviewAt]
      )).rows[0];
      await query(
        `INSERT INTO incident_review_assignments (id, review_id, incident_id, company_id, assigned_by, assigned_to, due_at, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uuidv4(), followUpReview.id, review.incident_id, companyId, actorId, review.assigned_to, nextReviewAt, 'Follow-up review round created on completion.']
      );
      if (review.assigned_to) {
        try {
          await notificationsService.create({
            company_id: companyId, user_id: review.assigned_to, type: 'INCIDENT_REVIEW_ASSIGNED',
            title: 'Follow-up incident review due', body: `A further review round is needed for "${incident?.title || 'this incident'}".`,
            link: `/incidents/${review.incident_id}/review`,
          });
        } catch { /* best-effort */ }
      }
    }

    if (outcome === 'Refer for leadership oversight') {
      try {
        const reviewerRole = review.assigned_to
          ? (await query(`SELECT role FROM users WHERE id = $1`, [review.assigned_to])).rows[0]?.role
          : null;
        const nextRole = LEADERSHIP_LADDER[String(reviewerRole || '').toUpperCase()] || 'DIRECTOR';
        const roles = nextRole === 'RESPONSIBLE_INDIVIDUAL' ? ['RESPONSIBLE_INDIVIDUAL', 'RI'] : [nextRole];
        const targets = (await query(
          `SELECT id FROM users WHERE company_id = $1 AND role = ANY($2::text[]) AND LOWER(COALESCE(status,'active')) = 'active'`,
          [companyId, roles]
        )).rows;
        for (const t of targets) {
          await notificationsService.create({
            company_id: companyId, user_id: t.id, type: 'INCIDENT_REVIEW_LEADERSHIP',
            title: 'Serious incident referred for leadership oversight',
            body: `"${incident?.title || 'An incident'}" has been referred for leadership oversight following its review.`,
            link: `/incidents/${review.incident_id}`,
          });
        }
      } catch (e: any) {
        logger.error(`Failed to notify leadership of referred incident review ${reviewId}: ${e?.message || e}`);
      }
    }

    return { review: completed, followUpReview };
  },
};
