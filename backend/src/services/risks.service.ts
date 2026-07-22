import { risksRepo } from '../repositories/risks.repo';
import { eventBus, EVENTS } from '../events/eventBus';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { escalationDueBy } from './escalations.service';
import { notificationsService } from './notifications.service';
import { trajectoryForRisk } from './trajectory.service';
import { riskMetricsService } from './riskMetrics.service';
import { PROMOTION_THRESHOLD } from '../config/governance.constants';

// Map a severity band to a 5×5-matrix likelihood/impact pair so the derived risk_score
// (likelihood × impact) always agrees with the severity badge: Critical→25, High→16,
// Medium/Moderate→9, Low→4. Used at promotion so a Critical risk never scores like a Low one.
export function severityToScore(severity?: string): { likelihood: number; impact: number } {
  switch (String(severity || '').toLowerCase()) {
    case 'critical': return { likelihood: 5, impact: 5 };
    case 'high': return { likelihood: 4, impact: 4 };
    case 'low': return { likelihood: 2, impact: 2 };
    default: return { likelihood: 3, impact: 3 }; // Medium / Moderate
  }
}

export class RisksService {
  async create(company_id: string, created_by: string, data: {
    house_id: string; title: string; description?: string; severity?: string; category_id?: string;
    likelihood?: number; impact?: number; assigned_to?: string; review_due_date?: Date;
    source_cluster_id?: string; status?: string; trajectory?: string;
    risk_domain?: string;
    metadata?: any;
    linked_person?: string;
    critical_exception_reason?: string;
  }) {
    // [GOVERNANCE] Risk provenance: risks are never created out of thin air.
    // They must originate from a detected cluster (source_cluster_id) OR be a
    // documented critical exception. (Doctrine: "Risks never auto-created;
    // formal risks come from source cluster or critical exception.")
    const exceptionReason = (data.critical_exception_reason || data.metadata?.critical_exception_reason || '').trim();
    if (!data.source_cluster_id && exceptionReason.length < 10) {
      throw new Error('Risk provenance required: provide a source_cluster_id, or a critical exception reason (min 10 characters) to justify a manually-created risk.');
    }

    // Fold the exception reason into metadata so the provenance is auditable.
    const metadata = exceptionReason
      ? { ...(data.metadata || {}), critical_exception_reason: exceptionReason }
      : data.metadata;
    const { critical_exception_reason, ...rest } = data;

    const risk = await risksRepo.create({ company_id, created_by, ...rest, metadata });
    await risksRepo.addEvent(
      risk.id, company_id, 'created',
      data.source_cluster_id ? 'Risk created from source cluster' : `Risk created (critical exception): ${exceptionReason}`,
      created_by
    );
    await eventBus.emitEvent(EVENTS.RISK_CREATED, { risk_id: risk.id, company_id, created_by, severity: risk.severity });

    // [ENGINE] Automated Escalation Trigger
    await this.checkAutoEscalation(risk);

    return risk;
  }

  async findAll(company_id: string, filters: Record<string, unknown> = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [risks, total] = await Promise.all([
      risksRepo.findByCompany(company_id, filters, limit, offset),
      risksRepo.countByCompany(company_id, filters),
    ]);
    return { risks, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(id: string, company_id: string) {
    const risk = await risksRepo.findById(id, company_id);
    if (!risk) throw new Error('Risk not found');

    // Attach the previous chapter, if this risk is a recurrence. The detail view leads with it
    // so nobody re-investigates from scratch a concern that already has a history.
    if (risk.previous_risk_id) {
      const prev = (await query(
        `SELECT r.title, r.severity, r.created_at, COALESCE(r.closed_at, r.resolved_at) AS closed_on,
                r.resolution_outcome, r.resolution_reason, h.name AS house
           FROM risks r LEFT JOIN houses h ON h.id = r.house_id
          WHERE r.id = $1 AND r.company_id = $2`,
        [risk.previous_risk_id, company_id]
      )).rows[0];
      if (prev) {
        risk.previous_chapter = {
          ...prev,
          // The front end links by risk id but never renders it — ids are not presentable.
          risk_id: risk.previous_risk_id,
          occurrence: (Number(risk.recurrence_count) || 0) + 1,
        };
      }
    }
    return risk;
  }

  async update(id: string, company_id: string, user_id: string, data: Record<string, unknown>) {
    const risk = await risksRepo.findById(id, company_id);
    if (!risk) throw new Error('Risk not found');

    // [GOVERNANCE] Locked Means Locked
    if (['escalated', 'closed', 'resolved'].includes((risk.status || '').toLowerCase())) {
      throw new Error('This record is locked and cannot be modified (Governance Integrity Rule Section 7.2)');
    }

    const updated = await risksRepo.update(id, company_id, data);
    await risksRepo.addEvent(id, company_id, 'updated', `Risk updated`, user_id);

    // [ENGINE] Automated Escalation Trigger
    if (data.severity) {
      await this.checkAutoEscalation(updated);
    }

    return updated;
  }

  // Change the CURRENT severity (leadership judgement as the picture evolves). The initial
  // severity the risk was promoted at is preserved separately. Keeps likelihood/impact — and
  // therefore the generated risk_score — aligned to the new band, and logs the change.
  async updateSeverity(id: string, company_id: string, user_id: string, severity: string) {
    const risk = await risksRepo.findById(id, company_id);
    if (!risk) throw new Error('Risk not found');
    if (['closed', 'resolved'].includes((risk.status || '').toLowerCase())) {
      throw new Error('This record is closed and its severity can no longer be changed.');
    }
    const allowed = ['Low', 'Medium', 'Moderate', 'High', 'Critical'];
    const next = allowed.find((s) => s.toLowerCase() === String(severity || '').toLowerCase());
    if (!next) throw new Error('Severity must be Low, Medium, High or Critical.');
    const li = severityToScore(next);
    const updated = await risksRepo.update(id, company_id, { severity: next, likelihood: li.likelihood, impact: li.impact });
    await risksRepo.addEvent(id, company_id, 'severity_changed', `Current severity changed from ${risk.severity} to ${next}.`, user_id);
    return updated;
  }

  // Set the compulsory human Impact rating (High/Medium/Low). This is the consequence-if-it-
  // happens judgement — it drives S in the Risk Index, so the authoritative grade is recomputed.
  async updateImpactRating(id: string, company_id: string, user_id: string, rating: string) {
    const next = ['High', 'Medium', 'Low'].find((a) => a.toLowerCase() === String(rating || '').toLowerCase());
    if (!next) throw new Error('Impact must be High, Medium or Low.');
    const risk = await risksRepo.findById(id, company_id);
    if (!risk) throw new Error('Risk not found');
    await query(`UPDATE risks SET impact_rating = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`, [next, id, company_id]);
    await risksRepo.addEvent(id, company_id, 'impact_rated', `Impact rated ${next} (consequence if the risk materialises).`, user_id);
    try { await riskMetricsService.recompute(id, company_id); } catch { /* non-fatal */ }
    return risksRepo.findById(id, company_id);
  }

  // Update the risk's CQC analysis fields (impact / mitigation / root cause), merged
  // into metadata so other keys (provenance, source_pulse_id) are preserved. These are
  // optional inspector-facing fields; editable while the risk is active.
  async updateAssessment(id: string, company_id: string, user_id: string, data: { impact?: string; mitigation?: string; rootCause?: string }) {
    const risk = await risksRepo.findById(id, company_id);
    if (!risk) throw new Error('Risk not found');
    if (['closed', 'resolved'].includes((risk.status || '').toLowerCase())) {
      throw new Error('This record is closed and its assessment can no longer be edited (Governance Integrity Rule Section 7.2).');
    }

    const patch: Record<string, string> = {};
    if (typeof data.impact === 'string') patch.impact = data.impact;
    if (typeof data.mitigation === 'string') patch.mitigation = data.mitigation;
    if (typeof data.rootCause === 'string') patch.rootCause = data.rootCause;
    if (Object.keys(patch).length === 0) throw new Error('Nothing to update');

    const result = await query(
      `UPDATE risks SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb, updated_at = NOW()
        WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, JSON.stringify(patch)]
    );
    await risksRepo.addEvent(id, company_id, 'assessment_updated', `Risk assessment updated: ${Object.keys(patch).join(', ')}`, user_id);
    return result.rows[0];
  }

  async delete(id: string, company_id: string, user_id: string) {
    // [GOVERNANCE] No Deletion Implementation
    throw new Error('Hard deletion is prohibited for governance records (Governance Integrity Rule Section 7.1). Please resolve or close the risk instead.');
  }

  async addEvent(risk_id: string, company_id: string, user_id: string, data: { event_type: string; description: string }) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    return risksRepo.addEvent(risk_id, company_id, data.event_type, data.description, user_id);
  }

  async addAction(risk_id: string, company_id: string, user_id: string, data: { title: string; description?: string; assigned_to?: string; due_date?: Date }) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');

    let assigned_to = data.assigned_to;
    if (!assigned_to) {
      // Find Team Leader(s) mapped to this house — prefer an AVAILABLE one (Finding F),
      // falling back to any house TL, then any company TL.
      const tlRes = await query(
        `SELECT u.id FROM users u
         JOIN user_houses uh ON uh.user_id = u.id
         WHERE uh.house_id = $1 AND u.role IN ('TEAM_LEADER', 'TL') AND u.company_id = $2
           AND COALESCE(u.status,'active') = 'active'
         ORDER BY COALESCE(u.is_available, true) DESC
         LIMIT 1`,
        [risk.house_id, company_id]
      );
      assigned_to = tlRes.rows[0]?.id || null;
      if (!assigned_to) {
        // Fallback to any available TEAM_LEADER in the company if no house TL is mapped.
        const fallbackRes = await query(
          `SELECT id FROM users WHERE role IN ('TEAM_LEADER', 'TL') AND company_id = $1
             AND COALESCE(status,'active') = 'active'
           ORDER BY COALESCE(is_available, true) DESC LIMIT 1`,
          [company_id]
        );
        assigned_to = fallbackRes.rows[0]?.id || null;
      }
    }

    const action = await risksRepo.addAction(risk_id, company_id, { ...data, assigned_to, created_by: user_id });
    // Notify the Team Leader the action is now theirs — previously they only discovered
    // it by opening their queue (Finding F).
    if (assigned_to) {
      try {
        await notificationsService.create({
          company_id, user_id: assigned_to, type: 'action_assigned',
          title: 'Action assigned to you',
          body: `${data.title} — ${risk.title || 'risk'}`,
          link: `/risk-register/${risk_id}?section=actions`,
        });
      } catch { /* non-fatal */ }
    }
    return action;
  }

  // Move an open action to a different Team Leader (RM/Admin act). Validates the target
  // is an active TL (multi-role aware), notifies them, and writes an audit event (Finding F).
  async reassignAction(risk_id: string, action_id: string, company_id: string, user_id: string, assigned_to: string) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    const tl = await query(
      `SELECT id, first_name, last_name FROM users u
        WHERE u.id = $1 AND u.company_id = $2 AND u.status = 'active'
          AND (u.role IN ('TEAM_LEADER','TL') OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = 'TEAM_LEADER'))`,
      [assigned_to, company_id]
    );
    if (!tl.rows[0]) throw new Error('Assignee must be an active Team Leader');
    const upd = await query(
      `UPDATE risk_actions SET assigned_to = $1 WHERE id = $2 AND risk_id = $3 AND company_id = $4 RETURNING *`,
      [assigned_to, action_id, risk_id, company_id]
    );
    if (!upd.rows[0]) throw new Error('Action not found');
    const tlName = `${tl.rows[0].first_name || ''} ${tl.rows[0].last_name || ''}`.trim();
    await risksRepo.addEvent(risk_id, company_id, 'action_reassigned', `Action reassigned to ${tlName}`, user_id);
    try {
      await notificationsService.create({
        company_id, user_id: assigned_to, type: 'action_reassigned',
        title: 'Action reassigned to you',
        body: `${upd.rows[0].title} — ${risk.title || 'risk'}`,
        link: `/risk-register/${risk_id}?section=actions`,
      });
    } catch { /* non-fatal */ }
    return upd.rows[0];
  }

  async getActions(risk_id: string, company_id: string) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    return risksRepo.getActions(risk_id, company_id);
  }

  async findAllActions(company_id: string, filters: any = {}) {
    return risksRepo.findAllActions(company_id, filters);
  }

  async escalate(risk_id: string, company_id: string, escalated_by: string, data: { escalated_to: string; reason: string }) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');

    if (risk.status.toLowerCase() === 'escalated') {
      throw new Error('Risk is already escalated');
    }

    // Belt-and-braces: never raise a second live escalation for a risk that already has an
    // open one (guards against the status field drifting out of sync with the escalations
    // table). A resolved/closed escalation does not block re-escalation.
    const openEsc = await query(
      `SELECT 1 FROM escalations
        WHERE risk_id = $1 AND company_id = $2
          AND COALESCE(lifecycle_status::text, status) NOT IN ('Closed','Resolved','resolved','closed')
        LIMIT 1`,
      [risk_id, company_id]
    );
    if (openEsc.rows.length) {
      throw new Error('An open escalation already exists for this risk.');
    }

    // Find default target if missing
    let target = data.escalated_to;
    if (!target) {
      const adminRes = await query(
        "SELECT id FROM users WHERE company_id = $1 AND role IN ('ADMIN', 'SUPER_ADMIN') LIMIT 1",
        [company_id]
      );
      target = adminRes.rows[0]?.id || risk.created_by;
    }

    // Create escalation record with an SLA due date so the overdue sweep and
    // stats work (previously due_by was NULL -> never flagged overdue / always "on time").
    const domains: string[] = Array.isArray(risk.risk_domain) ? risk.risk_domain : (risk.risk_domain ? [risk.risk_domain] : []);
    const trigger = domains.some((d) => String(d).toLowerCase().includes('safeguard')) ? 'HIGH_SAFEGUARDING' : 'SIMILAR_SIGNALS_14_DAYS';
    const id = uuidv4();
    await query(
      `INSERT INTO escalations (id, company_id, risk_id, escalated_by, escalated_to, reason, status, lifecycle_status, due_by)
       VALUES ($1,$2,$3,$4,$5,$6,'Pending','Open',$7)`,
      [id, company_id, risk_id, escalated_by, target, data.reason, escalationDueBy(trigger)]
    );

    await risksRepo.update(risk_id, company_id, { status: 'Escalated' });
    // Confirmed escalation supersedes any prior recommendation flag.
    await query(
      `UPDATE risks SET escalation_recommended = FALSE, escalation_recommended_at = NULL WHERE id = $1 AND company_id = $2`,
      [risk_id, company_id]
    );
    await risksRepo.addEvent(risk_id, company_id, 'Escalated', `Risk escalated: ${data.reason}`, escalated_by);
    await eventBus.emitEvent(EVENTS.RISK_ESCALATED, { risk_id, company_id, escalated_by, escalated_to: target });

    return { escalation_id: id, message: 'Risk escalated successfully' };
  }

  async getTimeline(risk_id: string, company_id: string) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    return risksRepo.getTimeline(risk_id, company_id);
  }

  async getCategories(company_id: string) {
    return risksRepo.getCategories(company_id);
  }

  async createCategory(company_id: string, user_id: string, data: { name: string; description?: string; color?: string }) {
    return risksRepo.createCategory(company_id, { ...data, created_by: user_id });
  }

  async getAttachments(risk_id: string, company_id: string) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    return risksRepo.getAttachments(risk_id, company_id);
  }

  async addAttachment(risk_id: string, company_id: string, user_id: string, data: { file_name: string; file_url: string; file_type?: string; file_size?: number }) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    const attachment = await risksRepo.addAttachment(risk_id, company_id, { ...data, uploaded_by: user_id });
    await risksRepo.addEvent(risk_id, company_id, 'attachment_added', `Attachment added: ${data.file_name}`, user_id);
    return attachment;
  }

  async removeAttachment(risk_id: string, company_id: string, user_id: string, attachment_id: string) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    await risksRepo.removeAttachment(attachment_id, risk_id, company_id);
    await risksRepo.addEvent(risk_id, company_id, 'attachment_removed', `Attachment removed`, user_id);
  }

  async assignRisk(risk_id: string, company_id: string, user_id: string, assigned_to: string) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    const updated = await risksRepo.assignRisk(risk_id, company_id, assigned_to);
    await risksRepo.addEvent(risk_id, company_id, 'assigned', `Risk assigned`, user_id);
    return updated;
  }

  async getAssignedToMe(company_id: string, user_id: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const filters = { assigned_to: user_id, status: 'open' };
    const [risks, total] = await Promise.all([
      risksRepo.findByCompany(company_id, filters, limit, offset),
      risksRepo.countByCompany(company_id, filters),
    ]);
    return { risks, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async updateStatus(risk_id: string, company_id: string, user_id: string, status: string) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    const updated = await risksRepo.updateStatus(risk_id, company_id, status);
    await risksRepo.addEvent(risk_id, company_id, 'status_updated', `Status changed to ${status}`, user_id);
    if (['closed', 'resolved'].includes(status.toLowerCase())) {
      await risksRepo.update(risk_id, company_id, { resolved_at: new Date() });
    }
    return updated;
  }

  // Finding B — evidence-gated closure. A risk closes only with a verdict + rationale;
  // "controls effective" is refused unless a control was actually rated effective, and a
  // 60-day recurrence window is stamped (read by recurrenceWatch.worker).
  async closeRisk(risk_id: string, company_id: string, user_id: string, opts: { verdict: string; reason: string }) {
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) throw new Error('Risk not found');
    const VERDICTS = ['Resolved — controls effective', 'Resolved — no longer applicable', 'Tolerated — risk accepted'];
    const verdict = String(opts?.verdict || '');
    if (!VERDICTS.includes(verdict)) throw new Error('A resolution verdict is required.');
    const reason = String(opts?.reason || '').trim();
    if (reason.length < 20) throw new Error('A closure rationale of at least 20 characters is required.');
    if (verdict === 'Resolved — controls effective') {
      const rated = await query(
        `SELECT 1 FROM risk_actions
          WHERE risk_id = $1 AND (effectiveness_outcome IN ('Effective','Partially Effective') OR effectiveness IN ('Effective','Neutral'))
          LIMIT 1`,
        [risk_id]
      );
      if (!rated.rows[0]) {
        throw new Error("Cannot close as 'controls effective' — no control on this risk has been rated effective. Rate the control first, or choose another verdict.");
      }
    }
    const updated = await query(
      `UPDATE risks
          SET status = 'Closed', closed_at = NOW(), resolved_at = NOW(),
              resolution_outcome = $1, resolution_reason = $2, resolved_by = $3,
              recurrence_window_until = NOW() + INTERVAL '60 days'
        WHERE id = $4 AND company_id = $5 RETURNING *`,
      [verdict, reason, user_id, risk_id, company_id]
    );
    if (!updated.rows[0]) throw new Error('Risk not found');
    await risksRepo.addEvent(risk_id, company_id, 'risk_closed', `Closed — ${verdict}: ${reason}`, user_id);
    return updated.rows[0];
  }

  // Resolution Effectiveness Rate — of risks closed as Resolved, how many stayed resolved
  // (no reopen inside the recurrence window). The real Well-Led test: did it hold? (Finding B)
  async resolutionEffectivenessRate(company_id: string) {
    const r = await query(
      `SELECT COUNT(*) FILTER (WHERE resolution_outcome LIKE 'Resolved%')::int AS resolved,
              COUNT(*) FILTER (WHERE resolution_outcome LIKE 'Resolved%' AND reopened_at IS NULL)::int AS stayed
         FROM risks
        WHERE company_id = $1 AND resolution_outcome IS NOT NULL`,
      [company_id]
    );
    const resolved = Number(r.rows[0]?.resolved || 0);
    const stayed = Number(r.rows[0]?.stayed || 0);
    return { resolved, stayed, rate: resolved ? Math.round((stayed / resolved) * 100) : null };
  }

  async updateActionStatus(action_id: string, risk_id: string, company_id: string, user_id: string, status: string) {
    const action = await risksRepo.getActionById(action_id, company_id);
    if (!action || action.risk_id !== risk_id) throw new Error('Action not found');

    const updated = await risksRepo.updateAction(action_id, company_id, { status });
    await risksRepo.addEvent(risk_id, company_id, 'action_updated', `Action "${action.title}" status changed to ${status}`, user_id);
    
    if (status === 'Completed') {
      await risksRepo.updateAction(action_id, company_id, { completed_at: new Date() });
    }

    return updated;
  }

  async verifyAction(action_id: string, risk_id: string, company_id: string, user: { id: string; role: string }, data: { notes: string }) {
    const action = await risksRepo.getActionById(action_id, company_id);
    if (!action || action.risk_id !== risk_id) throw new Error('Action not found');

    // [GOVERNANCE] Four-Eyes Principle Section 8.1
    if (action.created_by === user.id) {
      throw new Error('Independent Verification Required: A user cannot verify an action they created themselves (Governance Integrity Rule Section 8.1).');
    }

    const updateData: Record<string, any> = { verification_notes: data.notes };

    if (user.role === 'REGISTERED_MANAGER') {
      updateData.verified_by_rm = user.id;
      updateData.verified_at_rm = new Date();
    } else if (user.role === 'DIRECTOR' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      updateData.verified_by_ri = user.id;
      updateData.verified_at_ri = new Date();
    } else {
      throw new Error('Unauthorized: Only Managers or Directors can verify governance actions.');
    }

    const updated = await risksRepo.updateAction(action_id, company_id, updateData);
    await risksRepo.addEvent(risk_id, company_id, 'action_verified', `Action "${action.title}" verified by ${user.role}`, user.id);

    return updated;
  }

  /**
   * Finds the most recent CLOSED risk this pattern descends from, so a recurrence continues the
   * existing story instead of starting a blank one.
   *
   * A closed risk is never deleted — it stays in the register under Closed Oversight with its
   * closure verdict and evidence. Within its recurrence window the watcher simply reopens it
   * (same record). AFTER that window a returning pattern is legitimately a new chapter, and this
   * is what stitches it to the previous one: same tenant, same risk domain, and — where the
   * pattern is about a named person — the same person. Without the person match a domiciliary
   * "medication" recurrence for one client would wrongly inherit another client's history.
   */
  private async priorClosedChapter(company_id: string, risk_domain: string | null, linked_person: string | null) {
    if (!risk_domain || !String(risk_domain).trim()) return null;
    const prior = (await query(
      `SELECT r.id, r.title, r.created_at, r.severity, r.recurrence_count,
              COALESCE(r.closed_at, r.resolved_at) AS closed_on,
              r.resolution_outcome, r.resolution_reason, h.name AS house
         FROM risks r LEFT JOIN houses h ON h.id = r.house_id
        WHERE r.company_id = $1
          AND LOWER(COALESCE(r.status::text, '')) IN ('closed', 'resolved')
          AND LOWER(TRIM(COALESCE(r.risk_domain, ''))) = LOWER(TRIM($2))
          AND ($3::text IS NULL OR COALESCE(r.linked_person, '') = $3)
        ORDER BY COALESCE(r.closed_at, r.resolved_at, r.updated_at) DESC
        LIMIT 1`,
      [company_id, risk_domain, linked_person || null]
    )).rows[0];
    if (!prior) return null;

    // Pull what was actually DONE last time. The point of continuity is not that the risk
    // returned — it is that these controls were signed off as effective and it returned anyway.
    const controls = (await query(
      `SELECT action_description, COALESCE(effectiveness_outcome, effectiveness::text) AS outcome
         FROM risk_actions
        WHERE risk_id = $1
        ORDER BY COALESCE(effectiveness_reviewed_at, completed_at, created_at) ASC
        LIMIT 10`,
      [prior.id]
    )).rows;

    const dt = (d: any) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
    const lines = [
      `⚠ RECURRENCE — this concern was previously raised and closed. The story continues here.`,
      ``,
      `Previous chapter: "${prior.title}"${prior.house ? ` (${prior.house})` : ''}`,
      `Raised ${dt(prior.created_at)} · Closed ${dt(prior.closed_on)}${prior.severity ? ` · Closed at ${prior.severity}` : ''}`,
      prior.resolution_outcome ? `Closure verdict: ${prior.resolution_outcome}` : null,
      prior.resolution_reason ? `Closure rationale: ${prior.resolution_reason}` : null,
      controls.length ? `` : null,
      controls.length ? `Controls put in place last time:` : null,
      ...controls.map((c: any) => `  • ${c.action_description || 'Control'}${c.outcome ? ` — rated ${c.outcome}` : ' — never rated'}`),
      ``,
      `Those controls did not hold: the same pattern has reached the promotion threshold again.`,
      `This is occurrence ${(Number(prior.recurrence_count) || 0) + 2} of this concern.`,
      ``,
      `─── NEW EVIDENCE ───`,
      ``,
    ].filter((l) => l !== null) as string[];

    return { prior, header: lines.join('\n') };
  }

  async promoteFromCluster(company_id: string, user_id: string, data: {
    cluster_id: string; title: string; severity: string; trajectory: string;
    description: string; house_id: string; category_id: string; likelihood: number; impact: number;
  }) {
    const clusterRes = await query(
      `SELECT id, signal_count, first_signal_date, last_signal_date, risk_domain, linked_person, linked_risk_id,
              scope, house_id, affected_house_ids FROM signal_clusters
       WHERE id = $1 AND company_id = $2`,
      [data.cluster_id, company_id]
    );
    if (clusterRes.rows.length === 0) throw new Error('Source cluster not found');
    const cluster = clusterRes.rows[0];

    // Idempotency: a pattern that has already been promoted must not spawn a second risk.
    // Point the caller at the existing risk instead of silently duplicating it.
    if (cluster.linked_risk_id) {
      throw new Error('This pattern has already been promoted to a risk — open it from "View risk".');
    }

    // [GOVERNANCE] Promotion evidentiary floor (Doctrine §9 / correction.md §2.1):
    // a cluster may only be promoted to a formal risk if it has ≥3 linked signals,
    // OR at least one of its signals is Critical. This keeps every risk anchored to
    // a genuine pattern (or a single critical event), never a one-off.
    // EXCEPTION: Safeguarding — a lone safeguarding concern should not have to wait
    // for a pattern; a single signal is promotable (doctrine: safeguarding 1/1).
    const linkCountRes = await query(
      `SELECT COUNT(*)::int AS count FROM risk_signal_links WHERE cluster_id = $1`,
      [data.cluster_id]
    );
    // COUNT() returns 0 (not null) when a cluster has no direct risk_signal_links — which
    // is the case for a cross-service (systemic) cluster whose evidence lives on its
    // per-service child clusters. Fall back to the cluster's own signal_count (the figure
    // the RM actually sees) so a genuine cross-service pattern isn't blocked as "0 signals".
    const linkedSignals = linkCountRes.rows[0]?.count || Number(cluster.signal_count) || 0;
    const criticalRes = await query(
      `SELECT 1
         FROM risk_signal_links rsl
         JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id
        WHERE rsl.cluster_id = $1 AND gp.severity = 'Critical'
        LIMIT 1`,
      [data.cluster_id]
    );
    const hasCritical = criticalRes.rows.length > 0;
    const isSafeguarding = String(cluster.risk_domain || '').toLowerCase().includes('safeguard');
    if (linkedSignals < PROMOTION_THRESHOLD && !hasCritical && !isSafeguarding) {
      throw new Error(
        `Cluster does not meet the promotion threshold: ${linkedSignals} signal(s) and no Critical signal. ` +
        `A risk requires at least ${PROMOTION_THRESHOLD} linked signals, or one Critical signal (Governance Integrity §9).`
      );
    }

    // Build the governance description from the FULL observation text of the linked
    // signals (attributed + dated), not a fixed template, so the inspector sees what
    // was actually observed.
    let sigRows = (await query(
      `SELECT gp.description, gp.immediate_action, gp.related_person, gp.entry_date, gp.entry_time, gp.severity, h.name AS house
         FROM risk_signal_links rsl JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id
         LEFT JOIN houses h ON h.id = gp.house_id
        WHERE rsl.cluster_id = $1 ORDER BY gp.entry_date ASC, gp.entry_time ASC`,
      [data.cluster_id]
    )).rows;

    // A systemic (cross-service) cluster has no direct risk_signal_links — its evidence lives
    // on the per-service child clusters. Gather the actual signals by domain across the
    // affected houses so the description lists them in detail (not just "includes N signals").
    if (sigRows.length === 0 && Array.isArray(cluster.affected_house_ids) && cluster.affected_house_ids.length) {
      sigRows = (await query(
        `SELECT gp.description, gp.immediate_action, gp.related_person, gp.entry_date, gp.entry_time, gp.severity, h.name AS house
           FROM governance_pulses gp LEFT JOIN houses h ON h.id = gp.house_id
          WHERE gp.company_id = $1
            AND gp.risk_domain && ARRAY[$2]::text[]
            AND gp.house_id = ANY($3::uuid[])
          ORDER BY gp.entry_date ASC, gp.entry_time ASC
          LIMIT 30`,
        [company_id, cluster.risk_domain, cluster.affected_house_ids]
      )).rows;
    }
    // Each point carries date AND time, and points are blank-line separated so the
    // governance description reads clearly rather than as one crowded block.
    const stamp = (s: any) => {
      const d = s.entry_date ? new Date(s.entry_date).toLocaleDateString('en-GB') : '';
      const t = s.entry_time ? String(s.entry_time).slice(0, 5) : '';
      return [d, t].filter(Boolean).join(' ');
    };
    const composed = sigRows.length
      ? `Promoted from pattern detection — ${sigRows.length} linked signal(s):\n\n` +
        sigRows.map((s: any) => `• ${stamp(s)} (${s.severity || '—'}${s.related_person ? ', ' + s.related_person : ''}${s.house ? ', ' + s.house : ''}): ${s.description || ''}${s.immediate_action ? ` — Immediate action: ${s.immediate_action}` : ''}`).join('\n\n')
      : data.description;

    // Recurrence continuity: if this pattern was closed before, the new risk opens with the
    // previous chapter — verdict, controls and their ratings — above the new evidence, so the
    // register reads as one continuous story rather than an unexplained fresh entry.
    const chapter = await this.priorClosedChapter(company_id, cluster.risk_domain, cluster.linked_person);
    const description = chapter ? `${chapter.header}${composed || data.description}` : (composed || data.description);

    // Make severity, likelihood/impact and the derived risk_score agree from the outset.
    // Previously every promotion hard-coded likelihood=impact=3 (score 9) regardless of the
    // signal severity, and the mobile path hard-coded severity 'Medium' — so a Critical and a
    // Low risk both scored 9. Derive severity from the evidence (a Critical signal wins; else
    // the strongest linked signal), then set likelihood/impact from that severity so the
    // score band matches the badge.
    const sevRank: Record<string, number> = { critical: 4, high: 3, medium: 2, moderate: 2, low: 1 };
    const maxSev = sigRows.reduce((m: number, s: any) => Math.max(m, sevRank[String(s.severity || '').toLowerCase()] || 0), 0);
    const effectiveSeverity = hasCritical ? 'Critical'
      : maxSev >= 3 ? 'High'
      : (data.severity && data.severity !== 'Medium') ? data.severity
      : maxSev === 2 ? 'Medium'
      : (data.severity || 'Medium');
    const li = severityToScore(effectiveSeverity);

    // A systemic (cross-service) pattern spans several services, so its risk belongs to the
    // organisation, not one house — carry house_id = null and mark it strategic. A
    // within-service pattern uses the cluster's own house.
    const affectedIds: string[] = Array.isArray(cluster.affected_house_ids) ? cluster.affected_house_ids : [];
    const isCrossService = cluster.scope === 'cross_service' || affectedIds.length > 1;

    const risk = await this.create(company_id, user_id, {
      ...data,
      house_id: (cluster.house_id ?? (isCrossService ? null : data.house_id) ?? null) as any,
      severity: effectiveSeverity,
      likelihood: li.likelihood,
      impact: li.impact,
      description,
      source_cluster_id: data.cluster_id,
      status: 'Open',
      risk_domain: cluster.risk_domain,
      linked_person: cluster.linked_person
    });

    // Stamp the systemic reach so the register/dashboards read it as a Strategic risk
    // (services_affected_count > 1) themed on its domain, rather than an operational one.
    if (isCrossService) {
      await query(
        `UPDATE risks SET services_affected_count = $1, strategic_theme = COALESCE(strategic_theme, $2)
          WHERE id = $3 AND company_id = $4`,
        [Math.max(2, affectedIds.length), cluster.risk_domain, risk.id, company_id]
      );
    }

    // Update cluster status to 'Escalated' and stamp the promotion (link + time) so
    // the Patterns view can show "Promoted ✓ · View risk" instead of re-offering it.
    await query('UPDATE signal_clusters SET cluster_status = $1, linked_risk_id = $2, promoted_at = NOW() WHERE id = $3',
      ['Escalated', risk.id, data.cluster_id]);

    await risksRepo.addEvent(risk.id, company_id, 'Promotion',
      `Promoted from signal pattern${cluster.risk_domain ? ` — ${cluster.risk_domain}` : ''}${cluster.linked_person ? ` (${cluster.linked_person})` : ''}`,
      user_id);

    // Stamp the lineage back to the closed chapter and count the return. recurrence_count is
    // what leadership reads as "closed and came back N times" — the recurrence itself is the
    // governance finding, so it is recorded on the timeline of both chapters.
    if (chapter) {
      const occurrence = (Number(chapter.prior.recurrence_count) || 0) + 1;
      await query(
        `UPDATE risks SET previous_risk_id = $1, recurrence_count = $2 WHERE id = $3 AND company_id = $4`,
        [chapter.prior.id, occurrence, risk.id, company_id]
      );
      const closedOn = chapter.prior.closed_on ? new Date(chapter.prior.closed_on).toLocaleDateString('en-GB') : 'a previous date';
      await risksRepo.addEvent(risk.id, company_id, 'Recurrence',
        `This concern has RETURNED. It was previously closed on ${closedOn}${chapter.prior.resolution_outcome ? ` (${chapter.prior.resolution_outcome})` : ''} and the pattern has since met the promotion threshold again. Prior history and controls carried forward.`,
        user_id);
      await risksRepo.addEvent(chapter.prior.id, company_id, 'Recurrence',
        `The pattern behind this closed risk has recurred and been re-promoted. The story continues on the new risk — closure did not hold.`,
        user_id);
    }

    // Close the loop back to the raw signals: every pulse behind this cluster is now evidence
    // on a formal risk, so mark it Linked — removing it from the daily oversight / governance
    // queues (which exclude Linked). One signal, one live home. (Signal-flow closure.)
    await query(
      `UPDATE governance_pulses gp
          SET review_status = 'Linked', updated_at = NOW()
        FROM risk_signal_links rsl
        WHERE rsl.cluster_id = $1 AND rsl.pulse_entry_id = gp.id
          AND gp.company_id = $2
          AND (gp.review_status IS NULL OR gp.review_status <> 'Closed')`,
      [data.cluster_id, company_id]
    );

    // Seed the risk's cached trajectory from the engine at birth, so the register/reports
    // (which read the cache) match the RM detail (live engine) immediately, not on the next signal.
    try {
      const tr = await trajectoryForRisk(risk.id, data.cluster_id);
      await risksRepo.update(risk.id, company_id, { trajectory: tr.direction });
    } catch { /* best-effort cache seed */ }

    // Authoritative scoring: set the grade from the computed Risk Index (no manual scoring).
    try { await riskMetricsService.recompute(risk.id, company_id); } catch { /* non-fatal */ }

    return risk;
  }

  async promoteFromCandidate(company_id: string, user_id: string, data: {
    candidate_id: string; title: string; severity: string; trajectory: string;
    description: string; house_id: string; category_id: string; likelihood: number; impact: number;
    reason?: string; cluster_id?: string;
  }) {
    const candidateRes = await query(
      `SELECT id, risk_domain, linked_person, cluster_id FROM risk_candidates
       WHERE id = $1 AND company_id = $2`,
      [data.candidate_id, company_id]
    );
    if (candidateRes.rows.length === 0) throw new Error('Risk candidate not found');

    const candidate = candidateRes.rows[0];
    const sourceCluster = data.cluster_id || candidate.cluster_id || undefined;

    const risk = await this.create(company_id, user_id, {
      ...data,
      status: 'Open',
      // Provenance: the originating cluster is the risk's source. If the candidate
      // has no cluster (some candidate types), the RM's promotion reason becomes the
      // documented critical-exception provenance — so promotion never silently fails
      // the provenance guard. (RM Bug #5.)
      source_cluster_id: sourceCluster,
      critical_exception_reason: sourceCluster
        ? undefined
        : ((data.reason && data.reason.trim().length >= 10)
            ? data.reason
            : `Promoted from review queue: ${candidate.risk_domain || 'risk candidate'}`),
      risk_domain: candidate.risk_domain,
      metadata: { promotion_reason: data.reason },
      linked_person: candidate.linked_person
    });

    // Update candidate status
    await query('UPDATE risk_candidates SET status = $1, linked_risk_id = $2 WHERE id = $3',
      ['Promoted', risk.id, data.candidate_id]);

    // If this candidate came from a cluster, mark that cluster promoted too so the
    // Patterns view reflects it consistently.
    if (sourceCluster) {
      await query('UPDATE signal_clusters SET linked_risk_id = $1, promoted_at = NOW() WHERE id = $2 AND linked_risk_id IS NULL',
        [risk.id, sourceCluster]);
    }

    await risksRepo.addEvent(risk.id, company_id, 'Promotion', `Promoted from Risk Candidate ${data.candidate_id}. Reason: ${data.reason}`, user_id);

    return risk;
  }

  // [GOVERNANCE] Single-signal promotion. The normal route is Signal → Pattern → Risk
  // (a cluster of ≥3, or one Critical). But a lone High/Critical/Safeguarding signal
  // should not have to wait for a pattern — that delay is clinically wrong. This is the
  // documented "critical exception" path: the single serious signal becomes the risk's
  // provenance AND its first evidence. A low/moderate one-off is rejected here and must
  // go through its cluster.
  async promoteFromSignal(company_id: string, user_id: string, data: {
    source_pulse_id: string; title?: string; description?: string; severity?: string;
    trajectory?: string; category_id?: string; likelihood?: number; impact?: number; reason?: string;
  }) {
    if (!data.source_pulse_id) throw new Error('source_pulse_id is required');

    const sigRes = await query(
      `SELECT id, house_id, severity, signal_type, risk_domain, related_person,
              description, immediate_action
         FROM governance_pulses
        WHERE id = $1 AND company_id = $2`,
      [data.source_pulse_id, company_id]
    );
    if (sigRes.rows.length === 0) throw new Error('Source signal not found');
    const sig = sigRes.rows[0];

    // Eligibility is deliberately narrow: only a CRITICAL signal, or a Safeguarding concern
    // (which cannot wait for a pattern), may bypass the pattern route. A single HIGH signal is
    // NOT enough — it must build toward its cluster first; otherwise every High becomes a
    // trajectory-less risk (register noise) that distorts every downstream metric.
    const severity = String(sig.severity || '').toLowerCase();
    const domainStr = (Array.isArray(sig.risk_domain) ? sig.risk_domain.join(' ') : String(sig.risk_domain || '')).toLowerCase();
    const isSafeguarding = domainStr.includes('safeguard') || String(sig.signal_type || '').toLowerCase().includes('safeguard');
    const isCritical = severity === 'critical';
    if (!isCritical && !isSafeguarding) {
      throw new Error(
        'This signal is not eligible for direct promotion. Only a Critical signal, or a Safeguarding concern, ' +
        'may become a risk on its own — a High signal (and everything else) must build toward a pattern (cluster) first.'
      );
    }

    const domain = Array.isArray(sig.risk_domain) ? (sig.risk_domain[0] || null) : (sig.risk_domain || null);
    const provenance = (data.reason && data.reason.trim().length >= 10)
      ? data.reason.trim()
      : `Single-signal promotion (${isSafeguarding ? 'safeguarding 1/1' : `${sig.severity} severity`}): ${String(sig.description || '').slice(0, 600)}`;

    const effectiveSeverity = data.severity || sig.severity || 'High';
    const li = severityToScore(effectiveSeverity);
    const risk = await this.create(company_id, user_id, {
      house_id: sig.house_id,
      title: data.title || `Risk: ${domain || sig.signal_type || 'Signal'}${sig.related_person ? ' — ' + sig.related_person : ''}`,
      description: data.description || sig.description,
      severity: effectiveSeverity,
      trajectory: data.trajectory || 'Stable',
      category_id: data.category_id,
      // Score follows severity (5×5 matrix) unless the caller supplied explicit figures.
      likelihood: data.likelihood ?? li.likelihood,
      impact: data.impact ?? li.impact,
      status: 'Open',
      risk_domain: domain || undefined,
      linked_person: sig.related_person || undefined,
      // No cluster — the serious single signal is the documented critical exception.
      critical_exception_reason: provenance,
      metadata: { source_pulse_id: sig.id, immediate_action: sig.immediate_action },
    });

    // Carry the originating signal across as the risk's first evidence.
    await query(
      `INSERT INTO risk_signal_links (id, risk_id, pulse_entry_id, linked_by, link_note)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [uuidv4(), risk.id, sig.id, user_id, 'Originating signal — promoted directly to risk']
    );
    await query(`UPDATE governance_pulses SET review_status = 'Linked', updated_at = NOW() WHERE id = $1`, [sig.id]);
    await risksRepo.addEvent(risk.id, company_id, 'Promotion', `Promoted directly from signal ${sig.id} (${isSafeguarding ? 'safeguarding 1/1' : sig.severity})`, user_id);

    return risk;
  }

  async dismissCandidate(company_id: string, user_id: string, candidate_id: string, reason: string) {
    const candidateRes = await query(
      `SELECT id, cluster_id FROM risk_candidates
       WHERE id = $1 AND company_id = $2`,
      [candidate_id, company_id]
    );
    if (candidateRes.rows.length === 0) throw new Error('Risk candidate not found');

    await query(
      `UPDATE risk_candidates
       SET status = 'Dismissed', dismissal_reason = $1
       WHERE id = $2`,
      [reason, candidate_id]
    );

    // Record the decision on the underlying signals: reviewed and deliberately NOT promoted.
    // They move off the live decision queues (which exclude Reviewed) but are NOT hard-closed —
    // they remain in history and can still contribute to a future pattern. Only touch signals
    // still 'New' so we never overwrite a Linked/Closed state. (Signal-flow closure.)
    const clusterId = candidateRes.rows[0].cluster_id;
    if (clusterId) {
      await query(
        `UPDATE governance_pulses gp
            SET review_status = 'Reviewed', updated_at = NOW()
          FROM risk_signal_links rsl
          WHERE rsl.cluster_id = $1 AND rsl.pulse_entry_id = gp.id
            AND gp.company_id = $2
            AND (gp.review_status IS NULL OR gp.review_status = 'New')`,
        [clusterId, company_id]
      );
    }
  }

  private async checkAutoEscalation(risk: any) {
    // Rule 1: High/Critical severity.
    // [GOVERNANCE] Do NOT auto-escalate (and thereby lock) a fresh risk — escalation
    // is the RM's decision. We *flag* a recommendation and notify; the RM confirms by
    // calling escalate(). This preserves "RM completes the risk form / RM decides".
    if (risk.severity === 'High' || risk.severity === 'Critical') {
        await this.recommendEscalation(risk, `Automated recommendation: ${String(risk.severity).toUpperCase()} severity risk — review for escalation.`);
    }

    // Rule 2: Open > 14 days (Defensible Governance). A risk left open this long has
    // had time to be shaped, so the time-based rule does escalate automatically.
    const createdAt = new Date(risk.created_at);
    const now = new Date();
    const diffDays = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 14 && risk.status === 'Open') {
        await this.triggerEscalation(risk, `Defensible Governance Rule: Risk open for more than 14 days without resolution.`);
    }
  }

  /**
   * [GOVERNANCE] Non-blocking escalation recommendation. Sets a flag on the risk and
   * notifies the Director/RM, but leaves the risk Open and editable. The RM turns this
   * into a real escalation (which locks the record) by calling escalate().
   */
  private async recommendEscalation(risk: any, reason: string) {
    // Already escalated or already flagged — nothing to do.
    if (String(risk.status || '').toLowerCase() === 'escalated' || risk.escalation_recommended) return;

    await query(
      `UPDATE risks
          SET escalation_recommended = TRUE,
              escalation_recommended_reason = $2,
              escalation_recommended_at = NOW(),
              updated_at = NOW()
        WHERE id = $1`,
      [risk.id, reason]
    );
    await risksRepo.addEvent(risk.id, risk.company_id, 'escalation_recommended', reason, risk.created_by);

    // Best-effort notify the first Director (fallback Admin) so the recommendation surfaces.
    try {
      const targetRes = await query(
        `SELECT id FROM users
          WHERE company_id = $1 AND role IN ('DIRECTOR', 'ADMIN', 'SUPER_ADMIN')
          ORDER BY CASE role WHEN 'DIRECTOR' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END
          LIMIT 1`,
        [risk.company_id]
      );
      const targetId = targetRes.rows[0]?.id;
      if (targetId) {
        await notificationsService.create({
          company_id: risk.company_id,
          user_id: targetId,
          type: 'escalation_recommended',
          title: 'Escalation recommended',
          body: `${risk.title || 'A risk'} — ${reason}`,
          link: `/risk-register/${risk.id}`,
        });
      }
    } catch {
      // Notification is best-effort; do not block risk creation.
    }
  }

  private async triggerEscalation(risk: any, reason: string) {
    // Check if already escalated
    const existing = await query(
      "SELECT id FROM escalations WHERE risk_id = $1 AND status = 'Pending'",
      [risk.id]
    );
    if (existing.rows.length > 0) return;

    // Find the first Director of the company
    const directorRes = await query(
      "SELECT id FROM users WHERE company_id = $1 AND role = 'DIRECTOR' LIMIT 1",
      [risk.company_id]
    );
    
    // Fallback to Admin or Creator if no Director exists
    let escalated_to = directorRes.rows[0]?.id;
    if (!escalated_to) {
        const adminRes = await query(
            "SELECT id FROM users WHERE company_id = $1 AND role IN ('ADMIN', 'SUPER_ADMIN') LIMIT 1",
            [risk.company_id]
        );
        escalated_to = adminRes.rows[0]?.id || risk.created_by;
    }

    await this.escalate(risk.id, risk.company_id, risk.created_by, {
      escalated_to,
      reason
    });
  }

  async updateTrajectoryFromActions(risk_id: string, company_id: string) {
    // SSOT (Finding K): the stored risks.trajectory is only ever a CACHE of the one computed
    // engine (trajectory.service), which reads effectiveness_outcome (canonical, migration 096)
    // plus the signal series. So the register / reports / oversight (stored column) can never
    // diverge from the RM detail / rm5 (live engine). The old two-rating heuristic that read the
    // legacy `effectiveness` enum only — and produced the split-brain — is gone.
    const risk = await risksRepo.findById(risk_id, company_id);
    if (!risk) return;

    const tr = await trajectoryForRisk(risk_id, (risk as any).source_cluster_id);
    await risksRepo.update(risk_id, company_id, { trajectory: tr.direction });
    await risksRepo.addEvent(
      risk_id, company_id, 'trajectory_auto_update',
      `Trajectory updated to ${tr.direction} based on action effectiveness. ${tr.basis}`,
      risk.created_by
    );

    // Control effectiveness feeds C in the Risk Index — recompute the authoritative grade too.
    try { await riskMetricsService.recompute(risk_id, company_id); } catch { /* non-fatal */ }

    // Separate safeguard (unchanged intent): two consecutive ineffective control ratings is a
    // governance concern in its own right, regardless of the netted direction. Reads the
    // canonical effectiveness_outcome, falling back to the legacy enum.
    const recent = await query(
      `SELECT COALESCE(effectiveness_outcome, effectiveness::text) AS outcome
         FROM risk_actions
        WHERE risk_id = $1 AND company_id = $2 AND status = 'Completed'
          AND (effectiveness_outcome IS NOT NULL OR effectiveness IS NOT NULL)
        ORDER BY COALESCE(effectiveness_reviewed_at, completed_at, created_at) DESC
        LIMIT 2`,
      [risk_id, company_id]
    );
    const isIneffective = (o: string) => {
      const v = String(o || '').toLowerCase();
      return v.includes('not effective') || v === 'ineffective';
    };
    if (recent.rows.length === 2 && recent.rows.every((r: any) => isIneffective(r.outcome))) {
      const note = 'Critical Governance Concern: Two consecutive ineffective control actions detected.';
      await risksRepo.addEvent(risk_id, company_id, 'governance_concern', note, risk.created_by);
      await eventBus.emitEvent(EVENTS.GOVERNANCE_CONCERN, { risk_id, company_id, note });
    }
  }

  /**
   * Governance Oversight Register summary: banner counts + the four oversight
   * buckets (Emerging / Active / Strategic / Closed). Reuses existing risk,
   * cluster, candidate and action data — no new tables.
   */
  async getOversightSummary(company_id: string, houseIds?: string[]) {
    const hasHouseFilter = Array.isArray(houseIds) && houseIds.length > 0;
    // Scoped roles (RM/TL) see their own sites' risks PLUS strategic / cross-service risks,
    // which have house_id = null — those belong to every service the RM governs, so they must
    // surface on the register (and be actionable), not vanish because they have no single house.
    const houseClause = hasHouseFilter ? ' AND (r.house_id = ANY($2::uuid[]) OR r.house_id IS NULL)' : '';
    const params: unknown[] = hasHouseFilter ? [company_id, houseIds] : [company_id];

    const risksRes = await query(
      `SELECT r.id, r.title, r.strategic_theme, r.trajectory, r.trend, r.status, r.severity,
              r.impact_rating, r.risk_index,
              COALESCE(r.services_affected_count, 1) AS services_affected_count,
              r.last_governance_review_at, r.review_due_date, r.house_id,
              r.closed_at, r.updated_at,
              -- Next review tracks the next open action's due date (the concrete thing that
              -- moves the risk forward), falling back to any explicit review date.
              (SELECT MIN(ra.due_date) FROM risk_actions ra
                 WHERE ra.risk_id = r.id AND ra.due_date IS NOT NULL
                   AND ra.status NOT IN ('Complete','Completed','Cancelled')) AS next_action_date,
              h.name AS service_name,
              (SELECT COUNT(*) FROM risk_signal_links rsl WHERE rsl.risk_id = r.id) AS evidence_count,
              (SELECT COUNT(*) FROM risk_actions ra WHERE ra.risk_id = r.id) AS controls_count,
              (SELECT ra.effectiveness_outcome FROM risk_actions ra
                 WHERE ra.risk_id = r.id AND ra.effectiveness_outcome IS NOT NULL
                 ORDER BY ra.effectiveness_reviewed_at DESC NULLS LAST LIMIT 1) AS latest_effectiveness,
              u.first_name || ' ' || u.last_name AS owner_name, u.role AS owner_role
         FROM risks r
         LEFT JOIN houses h ON h.id = r.house_id
         LEFT JOIN users u ON u.id = r.assigned_to
        WHERE r.company_id = $1${houseClause}
        ORDER BY r.created_at DESC`,
      params
    );

    const positionOf = (r: any): string => {
      if (r.status === 'Escalated') return 'Escalating';
      const t = (r.trajectory || r.trend || 'Stable').toString().toLowerCase();
      if (t.includes('critical')) return 'Critical';
      if (t.includes('deteriorat') || t.includes('escalat') || t.includes('worsen')) return 'Escalating';
      if (t.includes('improv')) return 'Improving';
      return 'Stable';
    };

    const shape = (r: any) => ({
      id: r.id,
      concern: r.strategic_theme || r.title,
      type: Number(r.services_affected_count) > 1 ? 'Strategic' : 'Operational',
      position: positionOf(r),
      trajectory: r.trajectory || r.trend || 'Stable',
      severity: r.severity,
      impact: r.impact_rating || null,
      riskIndex: r.risk_index ?? null,
      evidence: Number(r.evidence_count) || 0,
      controls: Number(r.controls_count) || 0,
      effectiveness: r.latest_effectiveness || 'Not yet reviewed',
      owner: r.owner_name?.trim() || r.owner_role || 'Unassigned',
      service: r.service_name || '—',
      nextReview: r.next_action_date || r.review_due_date || null,
      lastUpdated: r.updated_at || null,
      closed_at: r.closed_at || null,
      closed_by: null,
    });

    const all = risksRes.rows.map(shape);
    const open = risksRes.rows.filter(r => r.status !== 'Closed');
    const active = open.filter(r => Number(r.services_affected_count) <= 1).map(shape);
    const strategic = open.filter(r => Number(r.services_affected_count) > 1).map(shape);
    const closed = risksRes.rows.filter(r => r.status === 'Closed').map(shape);

    // Emerging concerns = unpromoted signal clusters + new risk candidates.
    const clustersRes = await query(
      `SELECT id, cluster_label, risk_domain, signal_count, trajectory, house_id
         FROM signal_clusters
        WHERE company_id = $1 AND linked_risk_id IS NULL
              AND cluster_status <> 'Resolved'${hasHouseFilter ? ' AND house_id = ANY($2::uuid[])' : ''}
        ORDER BY signal_count DESC NULLS LAST`,
      params
    );
    const candidatesRes = await query(
      `SELECT id, risk_domain, candidate_type, house_id
         FROM risk_candidates
        WHERE company_id = $1 AND status = 'New'${hasHouseFilter ? ' AND house_id = ANY($2::uuid[])' : ''}`,
      params
    );
    const emerging = [
      ...clustersRes.rows.map((c: any) => ({
        id: c.id, source: 'cluster',
        concern: c.cluster_label || c.risk_domain || 'Emerging cluster',
        type: 'Emerging', position: 'Stable',
        trajectory: c.trajectory || 'Stable',
        evidence: Number(c.signal_count) || 0,
        service: null,
      })),
      ...candidatesRes.rows.map((c: any) => ({
        id: c.id, source: 'candidate',
        concern: c.risk_domain || 'Risk candidate',
        type: 'Emerging', position: 'Stable',
        trajectory: 'Stable', evidence: 0, service: null,
      })),
    ];

    // Banner
    const counts = { escalating: 0, stable: 0, improving: 0, critical: 0 };
    for (const r of [...active, ...strategic]) {
      if (r.position === 'Escalating') counts.escalating++;
      else if (r.position === 'Improving') counts.improving++;
      else if (r.position === 'Critical') counts.critical++;
      else counts.stable++;
    }
    const cfRes = await query(
      `SELECT COUNT(*) FROM risk_actions ra JOIN risks r ON r.id = ra.risk_id
        WHERE r.company_id = $1 AND ra.effectiveness_outcome = 'Not Effective'${hasHouseFilter ? ' AND r.house_id = ANY($2::uuid[])' : ''}`,
      params
    );
    const lastReviewRes = await query(
      `SELECT MAX(last_governance_review_at) AS last FROM risks WHERE company_id = $1${hasHouseFilter ? ' AND house_id = ANY($2::uuid[])' : ''}`,
      params
    );

    return {
      banner: {
        activeOversight: active.length + strategic.length,
        ...counts,
        controlFailures: Number(cfRes.rows[0]?.count) || 0,
        lastReviewAt: lastReviewRes.rows[0]?.last || null,
      },
      emerging,
      active,
      strategic,
      closed,
      all,
    };
  }
}

export const risksService = new RisksService();
