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
};
