import { query } from '../config/database';

/**
 * Frozen Governance Architecture — thin workflow layer.
 * The existing risk/escalation/action/pattern services stay authoritative; this only
 * adds the doctrine's lineage + workflow markers. A signal is permanent evidence and is
 * never replaced — every later record links back to it, and this service assembles that
 * linked history (Chapter 4).
 */
export const governanceWorkflowService = {
  // Leadership attention is a governance visibility marker, not a severity change.
  async markLeadershipAttention(company_id: string, pulse_id: string, user_id: string, reason: string) {
    if (!reason || reason.trim().length < 10) throw new Error('Leadership attention requires a clear reason (at least a short sentence).');
    const result = await query(
      `UPDATE governance_pulses gp
          SET leadership_attention = TRUE,
              leadership_attention_at = NOW(),
              leadership_attention_by = $1,
              leadership_attention_reason = $2,
              reviewed_by = COALESCE(gp.reviewed_by, $1),
              reviewed_at = COALESCE(gp.reviewed_at, NOW())
         FROM houses h
        WHERE gp.id = $3 AND gp.house_id = h.id AND h.company_id = $4
        RETURNING gp.*`,
      [user_id, reason.trim(), pulse_id, company_id]
    );
    if (!result.rows[0]) throw new Error('Signal not found.');
    return result.rows[0];
  },

  // The Linked Governance Activity for a signal: every record that extends its history,
  // with the relationship and current status. The signal itself is never mutated here.
  async signalTimeline(company_id: string, pulse_id: string) {
    const rows: any[] = [];

    // Governance decisions taken on this signal (Chapter 3 lineage).
    const decisions = await query(
      `SELECT gr.id, gr.decision, gr.decision_status, gr.what_is_happening, gr.created_at
         FROM governance_reviews gr
        WHERE gr.company_id = $1 AND gr.pulse_entry_id = $2
        ORDER BY gr.created_at`,
      [company_id, pulse_id]
    );
    for (const d of decisions.rows) rows.push({
      record: 'Governance Decision', id: d.id, relationship: 'Decision from this signal',
      label: d.what_is_happening, status: d.decision_status || d.decision, at: d.created_at, link: null,
    });

    // Tasks created from this signal.
    const tasks = await query(
      `SELECT id, title, status, due_date, created_at FROM risk_actions
        WHERE company_id = $1 AND source_pulse_id = $2 ORDER BY created_at`,
      [company_id, pulse_id]
    );
    for (const t of tasks.rows) rows.push({
      record: 'Task', id: t.id, relationship: 'Created from decision', label: t.title,
      status: t.status, at: t.created_at, link: '/my-actions',
    });

    // Pattern(s) this signal contributes to.
    const clusters = await query(
      `SELECT sc.id, sc.cluster_label, sc.cluster_status, sc.linked_risk_id, sc.created_at
         FROM risk_signal_links rsl JOIN signal_clusters sc ON sc.id = rsl.cluster_id
        WHERE rsl.pulse_entry_id = $1 AND sc.company_id = $2 ORDER BY sc.created_at`,
      [pulse_id, company_id]
    );
    for (const c of clusters.rows) rows.push({
      record: 'Pattern', id: c.id, relationship: 'Contributing signal', label: c.cluster_label || 'Emerging pattern',
      status: c.cluster_status, at: c.created_at, link: '/rm5',
    });

    // Risk(s) this signal is part of.
    const risks = await query(
      `SELECT DISTINCT r.id, r.title, r.status, r.severity, r.created_at
         FROM risk_signal_links rsl JOIN risks r ON r.id = rsl.risk_id
        WHERE rsl.pulse_entry_id = $1 AND r.company_id = $2 ORDER BY r.created_at`,
      [pulse_id, company_id]
    );
    for (const r of risks.rows) rows.push({
      record: 'Risk', id: r.id, relationship: 'Included in risk', label: r.title,
      status: r.status, at: r.created_at, link: `/risk-register/${r.id}`,
    });

    // Escalation(s) raised from this signal.
    const escs = await query(
      `SELECT id, reason, COALESCE(lifecycle_status::text, status) AS status, created_at
         FROM escalations WHERE company_id = $1 AND source_pulse_id = $2 ORDER BY created_at`,
      [company_id, pulse_id]
    );
    for (const e of escs.rows) rows.push({
      record: 'Escalation', id: e.id, relationship: 'Related escalation', label: e.reason,
      status: e.status, at: e.created_at, link: '/escalation-log',
    });

    rows.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    return rows;
  },

  // Chapter 7 — a Pattern Review is about the pattern (recurrence, trajectory), not one
  // signal. It records an outcome and, only when the linked risk/escalations are resolved,
  // permits pattern closure. The pattern is the last thing to close (organisational memory).
  async assessPatternClosure(company_id: string, cluster_id: string) {
    const blockers: string[] = [];
    const c = (await query(`SELECT * FROM signal_clusters WHERE id = $1 AND company_id = $2`, [cluster_id, company_id])).rows[0];
    if (!c) throw new Error('Pattern not found.');
    if (c.linked_risk_id) {
      const active = await query(
        `SELECT 1 FROM risks WHERE id = $1 AND company_id = $2 AND status NOT IN ('Closed','Resolved') LIMIT 1`,
        [c.linked_risk_id, company_id]
      );
      if (active.rows[0]) blockers.push('The linked risk remains active.');
    }
    const openEsc = await query(
      `SELECT COUNT(*)::int AS n FROM escalations
        WHERE company_id = $1 AND source_cluster_id = $2 AND COALESCE(lifecycle_status::text, status) NOT IN ('Closed','Resolved')`,
      [company_id, cluster_id]
    );
    if (openEsc.rows[0].n > 0) blockers.push('A linked escalation remains open.');
    return { eligible: blockers.length === 0, blockers };
  },

  async reviewPattern(company_id: string, cluster_id: string, user_id: string, outcome: string, rationale: string, nextReviewDate?: string) {
    const OUTCOMES = ['Continue Monitoring', 'Improving', 'Stable', 'Deteriorating', 'Promote to Risk', 'Escalate', 'Close'];
    if (!OUTCOMES.includes(outcome)) throw new Error('Choose a valid review outcome.');
    if (!rationale || rationale.trim().length < 20) throw new Error('Pattern review requires a meaningful rationale (at least a sentence).');

    if (outcome === 'Close') {
      const closure = await this.assessPatternClosure(company_id, cluster_id);
      if (!closure.eligible) throw new Error(`Pattern cannot close: ${closure.blockers.join(' ')}`);
    }

    // Deteriorating raises an urgent next review; the others keep the current cadence.
    const nextReview = nextReviewDate || (outcome === 'Deteriorating' ? new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) : null);

    const result = await query(
      `UPDATE signal_clusters
          SET last_reviewed_at = NOW(), last_reviewed_by = $1, next_review_date = $2,
              review_outcome = $3,
              closure_reason = CASE WHEN $3 = 'Close' THEN $4 ELSE closure_reason END,
              closed_at = CASE WHEN $3 = 'Close' THEN NOW() ELSE closed_at END,
              closed_by = CASE WHEN $3 = 'Close' THEN $1 ELSE closed_by END,
              cluster_status = CASE WHEN $3 = 'Close' THEN 'Resolved'
                                    WHEN $3 = 'Escalate' THEN 'Escalated'
                                    ELSE cluster_status END,
              updated_at = NOW()
        WHERE id = $5 AND company_id = $6 RETURNING *`,
      [user_id, nextReview, outcome, rationale.trim(), cluster_id, company_id]
    );
    const cluster = result.rows[0];
    if (!cluster) throw new Error('Pattern not found.');

    // Every review is a governance record — even "no change" (Continue Monitoring / Stable).
    const decisionMap: Record<string, string> = { 'Promote to Risk': 'Create Action', 'Escalate': 'Escalate', 'Close': 'Close' };
    try {
      await query(
        `INSERT INTO governance_reviews (company_id, cluster_id, review_type, reviewed_by, what_is_happening, decision, decision_status)
         VALUES ($1,$2,'RM_REVIEW',$3,$4,$5,'Completed')`,
        [company_id, cluster_id, user_id, `Pattern review — ${outcome}: ${rationale.trim()}`.slice(0, 900), decisionMap[outcome] || 'Monitor']
      );
    } catch { /* audit is best-effort */ }

    let next_action: any = null;

    // Escalate → create a real linked escalation (doctrine: the decision becomes an object).
    if (outcome === 'Escalate') {
      try {
        const target = (await query(
          `SELECT id FROM users WHERE company_id = $1 AND status = 'active'
             AND role = ANY(ARRAY['REGISTERED_MANAGER','DIRECTOR','RESPONSIBLE_INDIVIDUAL'])
             ORDER BY CASE role WHEN 'REGISTERED_MANAGER' THEN 0 WHEN 'DIRECTOR' THEN 1 ELSE 2 END LIMIT 1`,
          [company_id]
        )).rows[0]?.id;
        const dup = await query(`SELECT 1 FROM escalations WHERE source_cluster_id = $1 AND COALESCE(lifecycle_status::text,status,'Open') NOT IN ('Closed','Resolved') LIMIT 1`, [cluster_id]);
        if (target && !dup.rows[0]) {
          const { v4: uuidv4 } = await import('uuid');
          await query(
            `INSERT INTO escalations (id, company_id, risk_id, source_cluster_id, house_id, escalated_by, escalated_to, reason, status, lifecycle_status, priority, due_by, trigger_type)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pending','Open','Urgent', NOW() + INTERVAL '48 hours','PATTERN_REVIEW')`,
            [uuidv4(), company_id, cluster.linked_risk_id || null, cluster_id, cluster.house_id || null, user_id, target,
             `Pattern escalated on review — ${cluster.cluster_label || cluster.risk_domain}: ${rationale.trim()}`.slice(0, 1000)]
          );
          next_action = { type: 'escalated' };
        }
      } catch { /* best-effort */ }
    }

    // Deteriorating → notify management (no auto-object, but leadership must know now).
    if (outcome === 'Deteriorating') {
      try {
        const { notificationsService } = await import('./notifications.service');
        const mgrs = await query(`SELECT id FROM users WHERE company_id = $1 AND status = 'active' AND role = ANY(ARRAY['REGISTERED_MANAGER','DIRECTOR'])`, [company_id]);
        for (const m of mgrs.rows) {
          await notificationsService.create({ company_id, user_id: m.id, type: 'pattern_review', title: 'Pattern deteriorating', body: `${cluster.cluster_label || cluster.risk_domain}: ${rationale.trim()}`.slice(0, 200), link: '/rm5' });
        }
      } catch { /* best-effort */ }
    }

    // Promote to Risk → hand off to the existing promote flow (RM confirms details).
    if (outcome === 'Promote to Risk' && !cluster.linked_risk_id) {
      next_action = { type: 'promote', cluster_id };
    }

    return { ...cluster, next_action };
  },
};
