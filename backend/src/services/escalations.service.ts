import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { eventBus, EVENTS } from '../events/eventBus';
import { risksRepo } from '../repositories/risks.repo';
import { notificationsService } from './notifications.service';

export type EscalationLifecycleStatus =
  | 'Open'
  | 'Under Review'
  | 'Actions Implemented'
  | 'Monitoring Effectiveness'
  | 'Closed'
  | 'Reopened';

// Time-bound escalation SLAs (spec module 4). Hours until an escalation is "due by".
// Defaults; the authoritative values live in escalation_sla_rules and are loaded into
// slaCache (refreshEscalationSLAs), so the Escalation SLAs admin screen can tune them.
const ESCALATION_DUE_HOURS: Record<string, number> = {
  SIMILAR_SIGNALS_14_DAYS: 72,
  HIGH_SAFEGUARDING: 24,
  CROSS_SERVICE_PATTERN: 72,
  ACTION_INEFFECTIVE_TWICE: 72,
  SERIOUS_INCIDENT: 24,
  REOPENED_RISK: 72,
};
let slaCache: Record<string, number> = { ...ESCALATION_DUE_HOURS };

// Reload the SLA cache from the config table (called at startup and after admin edits).
export async function refreshEscalationSLAs(): Promise<Record<string, number>> {
  try {
    const r = await query(`SELECT trigger_type, hours FROM escalation_sla_rules WHERE is_active = true`);
    if (r.rows.length) {
      const next: Record<string, number> = { ...ESCALATION_DUE_HOURS };
      for (const row of r.rows) next[row.trigger_type] = Number(row.hours);
      slaCache = next;
    }
  } catch { /* table may not exist yet (pre-migration) — keep defaults */ }
  return slaCache;
}

export function escalationDueBy(triggerType: string | undefined | null, now = new Date()): Date {
  const hours = (triggerType && slaCache[triggerType]) || 72;
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

// Allowed lifecycle transitions for time-bound escalations.
const LIFECYCLE_TRANSITIONS: Record<EscalationLifecycleStatus, EscalationLifecycleStatus[]> = {
  'Open': ['Under Review'],
  'Under Review': ['Actions Implemented', 'Reopened'],
  'Actions Implemented': ['Monitoring Effectiveness'],
  'Monitoring Effectiveness': ['Closed', 'Reopened'],
  'Reopened': ['Under Review'],
  'Closed': [],
};

export class EscalationsService {
  /**
   * Close the loop back to the front-line worker who raised the originating signal,
   * so they see their concern was picked up and progressed. Best-effort.
   */
  private async notifyOriginator(escalation: any, company_id: string, actorId: string, type: string, title: string, verb: string) {
    try {
      if (!escalation?.source_pulse_id) return;
      const pulseRes = await query(
        'SELECT created_by, related_person, risk_domain FROM governance_pulses WHERE id = $1',
        [escalation.source_pulse_id]
      );
      const originator = pulseRes.rows[0]?.created_by;
      if (!originator || originator === actorId) return; // don't notify yourself
      const actorRes = await query('SELECT first_name, last_name FROM users WHERE id = $1', [actorId]);
      const actor = actorRes.rows[0] ? `${actorRes.rows[0].first_name} ${actorRes.rows[0].last_name}`.trim() : 'A manager';
      const person = pulseRes.rows[0]?.related_person;
      const rd = pulseRes.rows[0]?.risk_domain;
      const domain = Array.isArray(rd) ? rd[0] : (rd || 'governance');
      await notificationsService.create({
        company_id, user_id: originator, type, title,
        body: `${actor} ${verb} the ${domain} escalation${person ? ` for ${person}` : ''}.`,
        link: '/escalation-log',
      });
    } catch { /* best-effort: never block the lifecycle action */ }
  }

  async findAll(company_id: string, filters: Record<string, unknown> = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const conditions = ['e.company_id = $1'];
    const params: unknown[] = [company_id];
    let idx = 2;
    // Match either the lifecycle status (Open/Under Review/Closed…) or the legacy
    // status (Pending/Acknowledged/Resolved…) so dashboard filters work regardless.
    if (filters.status) { conditions.push(`(e.lifecycle_status::text = $${idx} OR e.status = $${idx})`); params.push(filters.status); idx++; }
    // Finding E: narrow to a single risk server-side (governance-review modal).
    if (filters.risk_id) { conditions.push(`e.risk_id = $${idx}`); params.push(filters.risk_id); idx++; }
    const where = conditions.join(' AND ');

    const [esc, countResult] = await Promise.all([
      query(
        `SELECT e.*,
          u1.first_name || ' ' || u1.last_name AS escalated_by_name,
          u2.first_name || ' ' || u2.last_name AS escalated_to_name,
          r.title AS risk_title,
          i.title AS incident_title,
          h.name AS house_name,
          h.name AS service_name,
          COALESCE(e.house_id, r.house_id, i.house_id) AS house_id,
          (e.due_by IS NOT NULL AND e.due_by < NOW() AND e.lifecycle_status <> 'Closed') AS overdue,
          -- Originating signal — the decision-making evidence the detail pane needs.
          p.description AS observation,
          p.immediate_action AS signal_immediate_action,
          p.severity AS signal_severity,
          p.related_person AS signal_related_person,
          p.risk_domain AS signal_risk_domain,
          p.signal_type AS signal_type,
          p.created_at AS signal_logged_at,
          pu.first_name || ' ' || pu.last_name AS signal_logged_by_name
         FROM escalations e
         JOIN users u1 ON u1.id = e.escalated_by
         LEFT JOIN users u2 ON u2.id = e.escalated_to
         LEFT JOIN risks r ON r.id = e.risk_id
         LEFT JOIN incidents i ON i.id = e.incident_id
         LEFT JOIN houses h ON h.id = COALESCE(e.house_id, r.house_id, i.house_id)
         LEFT JOIN governance_pulses p ON p.id = e.source_pulse_id
         LEFT JOIN users pu ON pu.id = p.created_by
         WHERE ${where}
         ORDER BY
           CASE
             WHEN COALESCE(e.lifecycle_status::text, e.status) IN ('Closed', 'Resolved', 'resolved', 'closed') THEN 2
             WHEN e.status = 'pending' OR e.lifecycle_status::text = 'Open' THEN 0
             ELSE 1
           END,
           (e.due_by IS NOT NULL AND e.due_by < NOW()) DESC,
           e.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
      ),
      query(`SELECT COUNT(*) FROM escalations e WHERE ${where}`, params),
    ]);

    return { escalations: esc.rows, total: parseInt(countResult.rows[0].count), page, limit, pages: Math.ceil(parseInt(countResult.rows[0].count) / limit) };
  }

  async findById(id: string, company_id: string) {
    const result = await query(
      `SELECT e.*,
        u1.first_name || ' ' || u1.last_name AS escalated_by_name,
        u2.first_name || ' ' || u2.last_name AS escalated_to_name,
        p.description AS observation,
        p.immediate_action AS signal_immediate_action,
        p.severity AS signal_severity,
        p.related_person AS signal_related_person,
        p.risk_domain AS signal_risk_domain,
        p.signal_type AS signal_type,
        p.created_at AS signal_logged_at,
        pu.first_name || ' ' || pu.last_name AS signal_logged_by_name
       FROM escalations e
       JOIN users u1 ON u1.id = e.escalated_by
       LEFT JOIN users u2 ON u2.id = e.escalated_to
       LEFT JOIN governance_pulses p ON p.id = e.source_pulse_id
       LEFT JOIN users pu ON pu.id = p.created_by
       WHERE e.id = $1 AND e.company_id = $2`,
      [id, company_id]
    );
    if (!result.rows[0]) throw new Error('Escalation not found');

    // Join the actor so the Action History can show WHO took each action, not just
    // what and when — core to the audit trail (Well-Led).
    const actions = await query(
      `SELECT ea.*, COALESCE(u.first_name || ' ' || u.last_name, 'System') AS taken_by_name
         FROM escalation_actions ea
         LEFT JOIN users u ON u.id = ea.taken_by
        WHERE ea.escalation_id = $1
        ORDER BY ea.created_at DESC`,
      [id]
    );
    // Also resolve the name of whoever closed/resolved it for the summary block.
    let closed_by_name: string | null = null;
    if (result.rows[0].closed_by) {
      const cb = await query(`SELECT first_name || ' ' || last_name AS name FROM users WHERE id = $1`, [result.rows[0].closed_by]);
      closed_by_name = cb.rows[0]?.name || null;
    }
    return { ...result.rows[0], closed_by_name, actions: actions.rows };
  }

  async resolve(id: string, company_id: string, user_id: string, resolution_notes: string) {
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    if (escalation.rows[0].status === 'resolved' || escalation.rows[0].status === 'closed') {
      throw new Error('This record is locked and cannot be modified (Governance Integrity Rule Section 7.2)');
    }

    const status = 'Resolved';
    // Keep lifecycle_status in sync with the legacy status. Dashboards treat any
    // escalation whose lifecycle_status != 'Closed' as still open, so resolving
    // must also close the lifecycle or the item lingers in the queue as "Open".
    await query(
      `UPDATE escalations
         SET status = $1, lifecycle_status = 'Closed',
             resolved_at = NOW(), closed_at = NOW(), closed_by = $4,
             resolution_notes = $2, updated_at = NOW()
       WHERE id = $3`,
      [status, resolution_notes, id, user_id]
    );

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'Resolved',$4,$5)`,
      [uuidv4(), id, company_id, resolution_notes, user_id]
    );

    // Close the loop back to the Team Leader who raised the signal.
    await this.notifyOriginator(escalation.rows[0], company_id, user_id, 'ESCALATION_RESOLVED', 'Your escalation was resolved', 'resolved');

    await eventBus.emitEvent(EVENTS.ESCALATION_RESOLVED, { escalation_id: id, company_id, resolved_by: user_id });

    // Chapter 5 — Escalation Closure asks only "was the urgent response completed?".
    // It must NEVER close the underlying risk. Instead it requires a return-to-risk review:
    // flag it, so the RM is prompted to decide Close / Keep open / Re-escalate.
    // The linked risk can come from risk_id or from the source pattern's linked risk.
    let riskId = escalation.rows[0].risk_id as string | null;
    if (!riskId && escalation.rows[0].source_cluster_id) {
      const c = await query(`SELECT linked_risk_id FROM signal_clusters WHERE id = $1`, [escalation.rows[0].source_cluster_id]);
      riskId = c.rows[0]?.linked_risk_id || null;
    }
    if (riskId) {
      await query(`UPDATE escalations SET post_closure_risk_review_required = TRUE WHERE id = $1`, [id]);
      const openRes = await query(`SELECT COUNT(*) FROM escalations WHERE risk_id = $1 AND status NOT IN ('Resolved','Closed')`, [riskId]);
      const openCount = parseInt(openRes.rows[0].count || '0');
      if (openCount === 0) {
        try {
          // Return the risk to active monitoring (NOT closed) — closure is a separate,
          // evidence-based decision made on the risk itself (Chapter 6).
          await risksRepo.updateStatus(riskId, company_id, 'Open');
          await risksRepo.addEvent(riskId, company_id, 'escalation_resolved', `Urgent response complete — risk returned to monitoring for review`, user_id);
        } catch (err) {
          console.warn('Failed to update risk status after escalation resolved:', err);
        }
      }
    }

    // Return the linked risk so the UI can offer "review the linked risk now?".
    return { message: 'Escalation resolved successfully', linked_risk_id: riskId, post_closure_risk_review_required: !!riskId };
  }

  // Chapter 5/6 (§4) — after an escalation is closed, the RM must decide what happens to the
  // underlying risk. Closing the urgent response never closes the risk; this mandatory review
  // records one of four outcomes and creates the matching record. It is the ONLY thing that
  // clears the post-closure review flag.
  async postClosureRiskReview(id: string, company_id: string, user_id: string, input: { outcome: string; note?: string; due_at?: string }) {
    const OUTCOMES = ['Keep Open', 'Add Controls', 'Re-escalate', 'Request Risk Closure'];
    if (!OUTCOMES.includes(input.outcome)) throw new Error('Choose a valid post-escalation review outcome.');
    const note = (input.note || '').trim();
    if (input.outcome !== 'Keep Open' && note.length < 10) throw new Error('This outcome needs a short explanation (at least a sentence).');

    const esc = (await query(`SELECT * FROM escalations WHERE id = $1 AND company_id = $2`, [id, company_id])).rows[0];
    if (!esc) throw new Error('Escalation not found.');
    if (!esc.post_closure_risk_review_required) throw new Error('This escalation is not awaiting a post-closure risk review.');

    // Resolve the linked risk (direct, or via the source pattern's promoted risk).
    let riskId: string | null = esc.risk_id || null;
    if (!riskId && esc.source_cluster_id) {
      riskId = (await query(`SELECT linked_risk_id FROM signal_clusters WHERE id = $1`, [esc.source_cluster_id])).rows[0]?.linked_risk_id || null;
    }

    let created: any = {};
    if (input.outcome === 'Keep Open') {
      if (riskId) {
        await risksRepo.updateStatus(riskId, company_id, 'Open');
        await risksRepo.addEvent(riskId, company_id, 'post_escalation_review', `Kept open after escalation closure — continued monitoring.${note ? ` ${note}` : ''}`.trim(), user_id);
      }
    } else if (input.outcome === 'Add Controls') {
      if (!riskId) throw new Error('No linked risk to add controls to.');
      const actionId = uuidv4();
      await query(
        `INSERT INTO risk_actions (id, risk_id, company_id, house_id, title, description, assigned_to, due_date, created_by, status, source_cluster_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending',$10)`,
        [actionId, riskId, company_id, esc.house_id || null, note.slice(0, 255), note, user_id, input.due_at || null, user_id, esc.source_cluster_id || null]
      );
      await risksRepo.updateStatus(riskId, company_id, 'Open');
      await risksRepo.addEvent(riskId, company_id, 'post_escalation_review', `New control added after escalation closure: ${note}`, user_id);
      created = { action_id: actionId };
    } else if (input.outcome === 'Re-escalate') {
      if (!riskId) throw new Error('No linked risk to re-escalate.');
      const dup = await query(`SELECT id FROM escalations WHERE company_id=$1 AND risk_id=$2 AND COALESCE(lifecycle_status::text,status,'Open') NOT IN ('Closed','Resolved','closed','resolved') LIMIT 1`, [company_id, riskId]);
      if (dup.rows[0]) {
        created = { escalation_id: dup.rows[0].id, reused: true };
      } else {
        const target = (await query(`SELECT id FROM users WHERE company_id=$1 AND status='active' AND role = ANY(ARRAY['REGISTERED_MANAGER','DIRECTOR']) ORDER BY CASE role WHEN 'REGISTERED_MANAGER' THEN 0 ELSE 1 END LIMIT 1`, [company_id])).rows[0]?.id;
        if (!target) throw new Error('No manager available to re-escalate to.');
        const newId = uuidv4();
        await query(
          `INSERT INTO escalations (id, company_id, risk_id, source_cluster_id, house_id, escalated_by, escalated_to, reason, status, lifecycle_status, priority, due_by, trigger_type)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pending','Open','Urgent', NOW() + INTERVAL '48 hours','POST_CLOSURE_REVIEW')`,
          [newId, company_id, riskId, esc.source_cluster_id || null, esc.house_id || null, user_id, target, `Re-escalated after review: ${note}`.slice(0, 1000)]
        );
        await risksRepo.addEvent(riskId, company_id, 'post_escalation_review', `Re-escalated after review: ${note}`, user_id);
        created = { escalation_id: newId };
      }
    } else if (input.outcome === 'Request Risk Closure') {
      if (!riskId) throw new Error('No linked risk to request closure for.');
      await query(`UPDATE risks SET closure_eligible = true, last_governance_review_at = NOW(), updated_at = NOW() WHERE id = $1 AND company_id = $2`, [riskId, company_id]);
      await risksRepo.addEvent(riskId, company_id, 'post_escalation_review', `Risk closure requested after escalation review: ${note}`, user_id);
      created = { risk_id: riskId, closure_requested: true };
    }

    // A supplied next-review date schedules the linked risk's next governance review.
    if (input.due_at && riskId) {
      await query(`UPDATE risks SET next_review_date = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`, [input.due_at, riskId, company_id]);
    }

    // Record the review as an escalation action and clear the flag (audit + one-time gate).
    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'PostClosureReview',$4,$5)`,
      [uuidv4(), id, company_id, `${input.outcome}${note ? ` — ${note}` : ''}`.slice(0, 1000), user_id]
    );
    await query(`UPDATE escalations SET post_closure_risk_review_required = FALSE, updated_at = NOW() WHERE id = $1`, [id]);

    return { message: 'Post-escalation risk review recorded.', outcome: input.outcome, linked_risk_id: riskId, ...created };
  }

  async acknowledge(id: string, company_id: string, user_id: string) {
    const res = await query(
      `UPDATE escalations
          SET status = 'Acknowledged',
              acknowledged_at = NOW(),
              -- Keep the lifecycle state machine in step: an acknowledged escalation is no
              -- longer 'Open' (the triage queue buckets on lifecycle_status, so leaving it
              -- 'Open' mis-files an in-hand item back under "Needs action").
              lifecycle_status = CASE WHEN lifecycle_status = 'Open'
                                      THEN 'Under Review'::escalation_lifecycle_status
                                      ELSE lifecycle_status END,
              reviewed_at = COALESCE(reviewed_at, NOW()),
              updated_at = NOW()
        WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id]
    );
    const escalation = res.rows[0];

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by) VALUES ($1,$2,$3,'Acknowledged','Escalation acknowledged',$4)`,
      [uuidv4(), id, company_id, user_id]
    );

    // Close the loop back to the Team Leader who raised the signal.
    await this.notifyOriginator(escalation, company_id, user_id, 'ESCALATION_ACKNOWLEDGED', 'Your escalation was acknowledged', 'acknowledged');

    // If escalation linked to a risk, mark the risk status to 'Escalated'
    try {
      const riskId = escalation?.risk_id;
      if (riskId) {
        await risksRepo.updateStatus(riskId, company_id, 'Escalated');
        await risksRepo.addEvent(riskId, company_id, 'escalation_acknowledged', `Escalation acknowledged for this risk`, user_id);
      }
    } catch (err) {
      console.warn('Failed to update risk status after escalation acknowledged:', err);
    }

    return { message: 'Escalation acknowledged' };
  }

  async addAction(id: string, company_id: string, user_id: string, data: { action_type: string; description: string }) {
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    if (escalation.rows[0].status === 'Resolved' || escalation.rows[0].status === 'Closed') {
      throw new Error('This record is locked and cannot be modified (Governance Integrity Rule Section 7.2)');
    }

    const result = await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [uuidv4(), id, company_id, data.action_type, data.description, user_id]
    );
    return result.rows[0];
  }

  async getActions(id: string, company_id: string) {
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    const actions = await query(
      `SELECT ea.*, u.first_name || ' ' || u.last_name AS taken_by_name
       FROM escalation_actions ea
       JOIN users u ON u.id = ea.taken_by
       WHERE ea.escalation_id = $1 AND ea.company_id = $2
       ORDER BY ea.created_at DESC`,
      [id, company_id]
    );
    return actions.rows;
  }

  async assignEscalation(id: string, company_id: string, user_id: string, assigned_to: string) {
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    if (escalation.rows[0].status === 'Resolved' || escalation.rows[0].status === 'Closed') {
      throw new Error('This record is locked and cannot be modified (Governance Integrity Rule Section 7.2)');
    }

    const result = await query(
      `UPDATE escalations SET escalated_to = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *`,
      [assigned_to, id, company_id]
    );

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'assigned','Escalation reassigned',$4)`,
      [uuidv4(), id, company_id, user_id]
    );

    return result.rows[0];
  }

  async updatePriority(id: string, company_id: string, user_id: string, priority: string) {
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    if (escalation.rows[0].status === 'Resolved' || escalation.rows[0].status === 'Closed') {
      throw new Error('This record is locked and cannot be modified (Governance Integrity Rule Section 7.2)');
    }

    // Normalize priority to capitalize first letter to match DB constraint
    const normalizedPriority = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
    const result = await query(
      `UPDATE escalations SET priority = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *`,
      [normalizedPriority, id, company_id]
    );

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'priority_updated',$4,$5)`,
      [uuidv4(), id, company_id, `Priority updated to ${priority}`, user_id]
    );

    return result.rows[0];
  }

  /**
   * Move an escalation through its time-bound lifecycle, enforcing valid transitions.
   * Closure is handled separately by ClosureService (requires an evidenced closure review).
   */
  async transition(id: string, company_id: string, user_id: string, nextStatus: EscalationLifecycleStatus) {
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    const current: EscalationLifecycleStatus = escalation.rows[0].lifecycle_status || 'Open';
    if (current === 'Closed') {
      throw new Error('This escalation is closed and cannot be modified (Governance Integrity Rule).');
    }
    if (!LIFECYCLE_TRANSITIONS[current]?.includes(nextStatus)) {
      throw new Error(`Invalid escalation transition: ${current} -> ${nextStatus}`);
    }
    if (nextStatus === 'Closed') {
      throw new Error('Use the closure review flow to close an escalation.');
    }

    const result = await query(
      `UPDATE escalations
         SET lifecycle_status = $1::escalation_lifecycle_status,
             reviewed_at = CASE WHEN $1::text = 'Under Review' AND reviewed_at IS NULL THEN NOW() ELSE reviewed_at END,
             actions_implemented_at = CASE WHEN $1::text = 'Actions Implemented' THEN NOW() ELSE actions_implemented_at END,
             effectiveness_review_due = CASE WHEN $1::text = 'Monitoring Effectiveness' THEN NOW() + INTERVAL '72 hours' ELSE effectiveness_review_due END,
             updated_at = NOW()
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      [nextStatus, id, company_id]
    );

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'lifecycle_transition',$4,$5)`,
      [uuidv4(), id, company_id, `Lifecycle moved to ${nextStatus}`, user_id]
    );

    return result.rows[0];
  }

  async reopen(id: string, company_id: string, user_id: string, reopened_reason: string) {
    if (!reopened_reason || reopened_reason.trim().length < 5) {
      throw new Error('A reason is required to reopen an escalation.');
    }
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    const result = await query(
      `UPDATE escalations
         SET lifecycle_status = 'Reopened',
             status = 'In Progress',
             reopened_at = NOW(),
             reopened_reason = $1,
             closed_at = NULL,
             due_by = $2,
             updated_at = NOW()
       WHERE id = $3 AND company_id = $4
       RETURNING *`,
      [reopened_reason, escalationDueBy('REOPENED_RISK'), id, company_id]
    );

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'reopened',$4,$5)`,
      [uuidv4(), id, company_id, `Escalation reopened: ${reopened_reason}`, user_id]
    );

    return result.rows[0];
  }

  /**
   * Manually climb the accountability ladder (RM → Director → RI), independent of
   * the overdue sweep. Resets the SLA clock, audits, and notifies the next role.
   * This is the "Escalate further" action — distinct from closing.
   */
  async escalateFurther(id: string, company_id: string, user_id: string, reason?: string) {
    // Doctrine: moving accountability upward (RM → Director → RI) requires a meaningful rationale.
    if (!reason || !reason.trim() || reason.trim().length < 3) {
      throw new Error('A reason is required to escalate further up the accountability ladder.');
    }
    const escRes = await query(
      `SELECT e.*, u.role AS current_role
         FROM escalations e LEFT JOIN users u ON u.id = e.escalated_to
        WHERE e.id = $1 AND e.company_id = $2`,
      [id, company_id]
    );
    const esc = escRes.rows[0];
    if (!esc) throw new Error('Escalation not found');
    if ((esc.lifecycle_status || '') === 'Closed') throw new Error('This escalation is closed.');

    const NEXT: Record<string, string> = { REGISTERED_MANAGER: 'DIRECTOR', RM: 'DIRECTOR', DIRECTOR: 'RESPONSIBLE_INDIVIDUAL' };
    const nextRole = NEXT[String(esc.current_role || '').toUpperCase()];
    if (!nextRole) throw new Error('This escalation is already at the top of the ladder (Responsible Individual).');

    const roles = nextRole === 'RESPONSIBLE_INDIVIDUAL' ? ['RESPONSIBLE_INDIVIDUAL', 'RI'] : [nextRole];
    const uRes = await query(
      `SELECT id FROM users WHERE company_id = $1 AND role = ANY($2::text[]) AND status = 'active' LIMIT 1`,
      [company_id, roles]
    );
    const nextUser = uRes.rows[0]?.id;
    const niceRole = nextRole.replace(/_/g, ' ').toLowerCase();
    if (!nextUser) throw new Error(`No active ${niceRole} is available to escalate to.`);

    await query(
      `UPDATE escalations
          SET escalated_to = $1, due_by = $2, status = 'In Progress',
              -- Same rule as acknowledge: escalating up means it's being worked, so it must
              -- leave 'Open' or the triage queue keeps it under "Needs action".
              lifecycle_status = CASE WHEN lifecycle_status = 'Open'
                                      THEN 'Under Review'::escalation_lifecycle_status
                                      ELSE lifecycle_status END,
              reviewed_at = COALESCE(reviewed_at, NOW()),
              priority = CASE WHEN priority = 'Critical' THEN priority ELSE 'Urgent' END,
              updated_at = NOW()
        WHERE id = $3`,
      [nextUser, escalationDueBy(esc.trigger_type), id]
    );
    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'escalate_further',$4,$5)`,
      [uuidv4(), id, company_id, `Escalated up to ${niceRole}${reason ? `: ${reason}` : ''}`, user_id]
    );
    try {
      await notificationsService.create({
        company_id, user_id: nextUser, type: 'ESCALATION_LADDER',
        title: 'Escalation escalated to you',
        body: `An escalation has been escalated up to you${reason ? `: ${reason}` : ''}.`,
        link: '/escalation-log',
      });
    } catch { /* best-effort */ }
    return { message: `Escalated to ${niceRole}.` };
  }

  // Add an assignable task (risk_action) from an escalation — WITH or WITHOUT a linked
  // risk. The task carries the escalation's house + source lineage, so a control/action can
  // be assigned for effectiveness even when the escalation isn't yet tied to a formal risk.
  async addTask(id: string, company_id: string, user_id: string, body: { title?: string; assigned_to?: string; due_date?: string; intended_outcome?: string }) {
    const e = (await query(`SELECT id, house_id, risk_id, source_governance_review_id, source_pulse_id, source_cluster_id, reason FROM escalations WHERE id = $1 AND company_id = $2`, [id, company_id])).rows[0];
    if (!e) throw new Error('Escalation not found');
    const title = String(body.title || '').trim() || `Action from escalation: ${(e.reason || '').slice(0, 120)}`;
    if (!body.assigned_to) throw new Error('Choose who is responsible for this task.');
    const actionId = uuidv4();
    const r = await query(
      `INSERT INTO risk_actions (id, risk_id, company_id, house_id, title, description, assigned_to, due_date, created_by,
         status, governance_review_id, source_pulse_id, source_cluster_id, intended_outcome)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending',$10,$11,$12,$13) RETURNING *`,
      [actionId, e.risk_id || null, company_id, e.house_id || null, title, title, body.assigned_to, body.due_date || null, user_id,
       e.source_governance_review_id || null, e.source_pulse_id || null, e.source_cluster_id || null, body.intended_outcome || null]
    );
    try {
      const { notificationsService } = await import('./notifications.service');
      await notificationsService.create({ company_id, user_id: body.assigned_to, type: 'task_assigned', title: 'Task assigned to you', body: title, link: '/my-actions' });
    } catch { /* best-effort */ }
    return r.rows[0];
  }

  async getEscalationStats(company_id: string) {
    // SSOT for "open": either lifecycle or legacy status may be set, so an escalation is
    // open unless one of them says Closed/Resolved. My Work, the nav badge and the daily
    // board all use this identical definition so the numbers can never disagree.
    const OPEN = `COALESCE(lifecycle_status::text, status, 'Open') NOT IN ('Closed','Resolved','closed','resolved')`;
    const result = await query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE ${OPEN}) AS open,
        COUNT(*) FILTER (WHERE lifecycle_status = 'Open') AS new_open,
        COUNT(*) FILTER (WHERE lifecycle_status = 'Under Review') AS under_review,
        COUNT(*) FILTER (WHERE lifecycle_status = 'Actions Implemented') AS actions_implemented,
        COUNT(*) FILTER (WHERE lifecycle_status = 'Monitoring Effectiveness') AS monitoring_effectiveness,
        COUNT(*) FILTER (WHERE NOT (${OPEN})) AS closed,
        COUNT(*) FILTER (WHERE ${OPEN} AND due_by IS NOT NULL AND due_by < NOW()) AS overdue,
        COUNT(*) FILTER (WHERE ${OPEN} AND (due_by IS NULL OR due_by >= NOW())) AS on_time,
        COUNT(*) FILTER (WHERE ${OPEN} AND (priority = 'Critical' OR priority = 'Urgent')) AS urgent_count
       FROM escalations
       WHERE company_id = $1`,
      [company_id]
    );
    return result.rows[0];
  }
}

export const escalationsService = new EscalationsService();
