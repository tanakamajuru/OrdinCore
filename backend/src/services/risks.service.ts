import { risksRepo } from '../repositories/risks.repo';
import { eventBus, EVENTS } from '../events/eventBus';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { escalationDueBy } from './escalations.service';
import { notificationsService } from './notifications.service';

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
      // Find Team Leader(s) assigned to this house
      const tlRes = await query(
        `SELECT u.id FROM users u
         JOIN user_houses uh ON uh.user_id = u.id
         WHERE uh.house_id = $1 AND u.role IN ('TEAM_LEADER', 'TL') AND u.company_id = $2
         LIMIT 1`,
        [risk.house_id, company_id]
      );
      assigned_to = tlRes.rows[0]?.id || null;
      if (!assigned_to) {
        // Fallback to any TEAM_LEADER in the company if no TL is assigned to this house
        const fallbackRes = await query(
          `SELECT id FROM users WHERE role IN ('TEAM_LEADER', 'TL') AND company_id = $1 LIMIT 1`,
          [company_id]
        );
        assigned_to = fallbackRes.rows[0]?.id || null;
      }
    }

    return risksRepo.addAction(risk_id, company_id, { ...data, assigned_to, created_by: user_id });
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

  async promoteFromCluster(company_id: string, user_id: string, data: {
    cluster_id: string; title: string; severity: string; trajectory: string;
    description: string; house_id: string; category_id: string; likelihood: number; impact: number;
  }) {
    const clusterRes = await query(
      `SELECT id, signal_count, first_signal_date, last_signal_date, risk_domain, linked_person FROM signal_clusters
       WHERE id = $1 AND company_id = $2`,
      [data.cluster_id, company_id]
    );
    if (clusterRes.rows.length === 0) throw new Error('Source cluster not found');
    const cluster = clusterRes.rows[0];

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
    const linkedSignals = linkCountRes.rows[0]?.count ?? Number(cluster.signal_count) ?? 0;
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
    if (linkedSignals < 3 && !hasCritical && !isSafeguarding) {
      throw new Error(
        `Cluster does not meet the promotion threshold: ${linkedSignals} signal(s) and no Critical signal. ` +
        `A risk requires at least 3 linked signals, or one Critical signal (Governance Integrity §9).`
      );
    }

    // Build the governance description from the FULL observation text of the linked
    // signals (attributed + dated), not a fixed template, so the inspector sees what
    // was actually observed.
    const sigRows = (await query(
      `SELECT gp.description, gp.immediate_action, gp.related_person, gp.entry_date, gp.severity
         FROM risk_signal_links rsl JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id
        WHERE rsl.cluster_id = $1 ORDER BY gp.entry_date ASC, gp.entry_time ASC`,
      [data.cluster_id]
    )).rows;
    const composed = sigRows.length
      ? `Promoted from pattern detection — ${sigRows.length} linked signal(s):\n` +
        sigRows.map((s: any) => `• ${s.entry_date ? new Date(s.entry_date).toLocaleDateString('en-GB') : ''} (${s.severity || '—'}${s.related_person ? ', ' + s.related_person : ''}): ${s.description || ''}${s.immediate_action ? ` — Immediate action: ${s.immediate_action}` : ''}`).join('\n')
      : data.description;

    const risk = await this.create(company_id, user_id, {
      ...data,
      description: composed || data.description,
      source_cluster_id: data.cluster_id,
      status: 'Open',
      risk_domain: cluster.risk_domain,
      linked_person: cluster.linked_person
    });

    // Update cluster status to 'Escalated' and stamp the promotion (link + time) so
    // the Patterns view can show "Promoted ✓ · View risk" instead of re-offering it.
    await query('UPDATE signal_clusters SET cluster_status = $1, linked_risk_id = $2, promoted_at = NOW() WHERE id = $3',
      ['Escalated', risk.id, data.cluster_id]);

    await risksRepo.addEvent(risk.id, company_id, 'Promotion', `Promoted from Signal Cluster ${data.cluster_id}`, user_id);
    
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

    // Eligibility: only a High/Critical signal, or a Safeguarding concern, may bypass
    // the pattern route. Everything else must build toward its cluster.
    const severity = String(sig.severity || '').toLowerCase();
    const domainStr = (Array.isArray(sig.risk_domain) ? sig.risk_domain.join(' ') : String(sig.risk_domain || '')).toLowerCase();
    const isSafeguarding = domainStr.includes('safeguard') || String(sig.signal_type || '').toLowerCase().includes('safeguard');
    const isSerious = severity === 'high' || severity === 'critical';
    if (!isSerious && !isSafeguarding) {
      throw new Error(
        'This signal is not eligible for direct promotion. Only a High/Critical signal, or a Safeguarding concern, ' +
        'may become a risk on its own — other signals build toward a pattern (cluster) first.'
      );
    }

    const domain = Array.isArray(sig.risk_domain) ? (sig.risk_domain[0] || null) : (sig.risk_domain || null);
    const provenance = (data.reason && data.reason.trim().length >= 10)
      ? data.reason.trim()
      : `Single-signal promotion (${isSafeguarding ? 'safeguarding 1/1' : `${sig.severity} severity`}): ${String(sig.description || '').slice(0, 600)}`;

    const risk = await this.create(company_id, user_id, {
      house_id: sig.house_id,
      title: data.title || `Risk: ${domain || sig.signal_type || 'Signal'}${sig.related_person ? ' — ' + sig.related_person : ''}`,
      description: data.description || sig.description,
      severity: data.severity || sig.severity || 'High',
      trajectory: data.trajectory || 'Stable',
      category_id: data.category_id,
      likelihood: data.likelihood,
      impact: data.impact,
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
      `SELECT id FROM risk_candidates 
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

    // 1. Fetch last 2 effective/ineffective ratings for COMPLETED actions
    const ratings = await query(
      `SELECT effectiveness FROM risk_actions 
       WHERE risk_id = $1 AND company_id = $2 
       AND status = 'Completed' AND effectiveness IS NOT NULL
       ORDER BY completed_at DESC LIMIT 2`,
      [risk_id, company_id]
    );

    if (ratings.rows.length < 1) return;

    const r1 = ratings.rows[0].effectiveness;
    const r2 = ratings.rows[1]?.effectiveness; // Optional second rating

    let newTrajectory: string | null = null;
    let governanceNote: string | null = null;

    if (r1 === 'Effective') {
      newTrajectory = 'Improving';
    } else if (r1 === 'Ineffective') {
      newTrajectory = 'Deteriorating';
      if (r2 === 'Ineffective') {
        governanceNote = 'Critical Governance Concern: Two consecutive ineffective control actions detected.';
      }
    }

    if (newTrajectory) {
      await risksRepo.update(risk_id, company_id, { trajectory: newTrajectory });
      const risk = await risksRepo.findById(risk_id, company_id);
      await risksRepo.addEvent(risk_id, company_id, 'trajectory_auto_update', 
        `Trajectory automatically updated to ${newTrajectory} based on action effectiveness.${governanceNote ? ' ' + governanceNote : ''}`, 
        risk.created_by);
      
      if (governanceNote) {
        await eventBus.emitEvent(EVENTS.GOVERNANCE_CONCERN, { risk_id, company_id, note: governanceNote });
      }
    }
  }

  /**
   * Governance Oversight Register summary: banner counts + the four oversight
   * buckets (Emerging / Active / Strategic / Closed). Reuses existing risk,
   * cluster, candidate and action data — no new tables.
   */
  async getOversightSummary(company_id: string, houseIds?: string[]) {
    const hasHouseFilter = Array.isArray(houseIds) && houseIds.length > 0;
    const houseClause = hasHouseFilter ? ' AND r.house_id = ANY($2::uuid[])' : '';
    const params: unknown[] = hasHouseFilter ? [company_id, houseIds] : [company_id];

    const risksRes = await query(
      `SELECT r.id, r.title, r.strategic_theme, r.trajectory, r.trend, r.status, r.severity,
              COALESCE(r.services_affected_count, 1) AS services_affected_count,
              r.last_governance_review_at, r.review_due_date, r.house_id,
              r.closed_at,
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
      evidence: Number(r.evidence_count) || 0,
      controls: Number(r.controls_count) || 0,
      effectiveness: r.latest_effectiveness || 'Not yet reviewed',
      owner: r.owner_name?.trim() || r.owner_role || 'Unassigned',
      service: r.service_name || '—',
      nextReview: r.review_due_date || r.last_governance_review_at || null,
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
