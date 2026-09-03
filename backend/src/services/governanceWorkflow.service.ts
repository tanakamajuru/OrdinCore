import { query, getClient } from '../config/database';
import { governanceDecisionsService } from './governanceDecisions.service';

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

  // PDF Phase 6 — the unified governance timeline, reconstructed from relationships (never
  // by copying the same narrative into every table). Accepts any one anchor id and gathers
  // the connected records into one chronological list.
  async timeline(company_id: string, filters: { signalId?: string; patternId?: string; riskId?: string; escalationId?: string }) {
    if (filters.signalId) return this.signalTimeline(company_id, filters.signalId);

    const rows: any[] = [];
    const seen = new Set<string>();
    const push = (r: any) => { const k = `${r.record}:${r.id}`; if (!seen.has(k)) { seen.add(k); rows.push(r); } };

    // Resolve a common anchor set: cluster, risk, escalation.
    let clusterId = filters.patternId || null;
    let riskId = filters.riskId || null;
    const escalationId = filters.escalationId || null;

    if (escalationId) {
      const e = (await query(`SELECT id, reason, source_pulse_id, source_cluster_id, risk_id, COALESCE(lifecycle_status::text,status) AS status, created_at FROM escalations WHERE id=$1 AND company_id=$2`, [escalationId, company_id])).rows[0];
      if (e) {
        push({ record: 'Escalation', id: e.id, relationship: 'Escalation', label: e.reason, status: e.status, at: e.created_at, link: '/escalation-log' });
        clusterId = clusterId || e.source_cluster_id; riskId = riskId || e.risk_id;
        if (e.source_pulse_id) { const s = (await query(`SELECT id, description, severity, created_at FROM governance_pulses WHERE id=$1 AND company_id=$2`, [e.source_pulse_id, company_id])).rows[0]; if (s) push({ record: 'Signal', id: s.id, relationship: 'Originating signal', label: s.description, status: s.severity, at: s.created_at, link: `/signals/${s.id}` }); }
      }
    }
    if (riskId) {
      const r = (await query(`SELECT id, title, status, source_cluster_id, created_at FROM risks WHERE id=$1 AND company_id=$2`, [riskId, company_id])).rows[0];
      if (r) {
        push({ record: 'Risk', id: r.id, relationship: 'Risk', label: r.title, status: r.status, at: r.created_at, link: `/risk-register/${r.id}` });
        clusterId = clusterId || r.source_cluster_id;
        for (const a of (await query(`SELECT id, title, status, created_at FROM risk_actions WHERE risk_id=$1 AND company_id=$2 ORDER BY created_at`, [riskId, company_id])).rows) push({ record: 'Task', id: a.id, relationship: 'Risk action', label: a.title, status: a.status, at: a.created_at, link: '/my-actions' });
        for (const e of (await query(`SELECT id, reason, COALESCE(lifecycle_status::text,status) AS status, created_at FROM escalations WHERE risk_id=$1 AND company_id=$2`, [riskId, company_id])).rows) push({ record: 'Escalation', id: e.id, relationship: 'On this risk', label: e.reason, status: e.status, at: e.created_at, link: '/escalation-log' });
      }
    }
    if (clusterId) {
      const c = (await query(`SELECT id, cluster_label, risk_domain, cluster_status, linked_risk_id, review_outcome, last_reviewed_at, created_at FROM signal_clusters WHERE id=$1 AND company_id=$2`, [clusterId, company_id])).rows[0];
      if (c) {
        push({ record: 'Pattern', id: c.id, relationship: 'Pattern', label: c.cluster_label || c.risk_domain, status: c.review_outcome || c.cluster_status, at: c.created_at, link: '/rm5' });
        for (const s of (await query(`SELECT gp.id, gp.description, gp.severity, gp.created_at FROM risk_signal_links rsl JOIN governance_pulses gp ON gp.id=rsl.pulse_entry_id WHERE rsl.cluster_id=$1 AND gp.company_id=$2 ORDER BY gp.created_at`, [clusterId, company_id])).rows) push({ record: 'Signal', id: s.id, relationship: 'Contributing signal', label: s.description, status: s.severity, at: s.created_at, link: `/signals/${s.id}` });
        for (const d of (await query(`SELECT id, what_is_happening, decision, decision_status, created_at FROM governance_reviews WHERE cluster_id=$1 AND company_id=$2 ORDER BY created_at`, [clusterId, company_id])).rows) push({ record: 'Governance Decision', id: d.id, relationship: 'Decision on this pattern', label: d.what_is_happening, status: d.decision_status || d.decision, at: d.created_at, link: null });
        for (const e of (await query(`SELECT id, reason, COALESCE(lifecycle_status::text,status) AS status, created_at FROM escalations WHERE source_cluster_id=$1 AND company_id=$2`, [clusterId, company_id])).rows) push({ record: 'Escalation', id: e.id, relationship: 'From this pattern', label: e.reason, status: e.status, at: e.created_at, link: '/escalation-log' });
        if (c.linked_risk_id && !riskId) { const r = (await query(`SELECT id, title, status, created_at FROM risks WHERE id=$1 AND company_id=$2`, [c.linked_risk_id, company_id])).rows[0]; if (r) push({ record: 'Risk', id: r.id, relationship: 'Promoted risk', label: r.title, status: r.status, at: r.created_at, link: `/risk-register/${r.id}` }); }
      }
    }

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

    // §5 — the pattern is the last thing to close. It cannot close while any of its work,
    // decisions or effectiveness reviews are still outstanding, or while fresh signals or an
    // as-yet-unmonitored period mean the concern has not actually been seen through.
    const openActions = await query(
      `SELECT COUNT(*)::int AS n FROM risk_actions
        WHERE company_id = $1 AND source_cluster_id = $2 AND status NOT IN ('Complete','Completed','Cancelled','Closed')`,
      [company_id, cluster_id]
    );
    if ((openActions.rows[0]?.n || 0) > 0) blockers.push('An action from this pattern is still open.');

    const pendingEff = await query(
      `SELECT COUNT(*)::int AS n FROM risk_actions
        WHERE company_id = $1 AND source_cluster_id = $2 AND status IN ('Complete','Completed') AND effectiveness IS NULL`,
      [company_id, cluster_id]
    );
    if ((pendingEff.rows[0]?.n || 0) > 0) blockers.push('A completed action still needs its effectiveness review.');

    const openDecision = await query(
      `SELECT COUNT(*)::int AS n FROM governance_reviews
        WHERE company_id = $1 AND cluster_id = $2 AND decision_status = 'Open'`,
      [company_id, cluster_id]
    );
    if ((openDecision.rows[0]?.n || 0) > 0) blockers.push('A governance decision on this pattern is still open.');

    const newSignals = await query(
      `SELECT COUNT(*)::int AS n FROM risk_signal_links rsl
         JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id
        WHERE rsl.cluster_id = $1 AND gp.company_id = $2 AND gp.review_status = 'New'`,
      [cluster_id, company_id]
    );
    if ((newSignals.rows[0]?.n || 0) > 0) blockers.push('New signals have arrived on this pattern and need review first.');

    if (!c.last_reviewed_at) blockers.push('This pattern has not yet had a recorded review — monitor and review it before closing.');

    // Monitoring period incomplete — a scheduled review is still pending, so sustained
    // control has not yet been demonstrated over the monitoring window.
    if (c.next_review_date && new Date(c.next_review_date) > new Date()) {
      blockers.push('The scheduled monitoring review is still pending — sustained control has not yet been demonstrated.');
    }

    return { eligible: blockers.length === 0, blockers };
  },

  async reviewPattern(company_id: string, cluster_id: string, user_id: string, outcome: string, rationale: string, nextReviewDate?: string) {
    // Doctrine: trajectory (Improving / Stable / Deteriorating) is EVIDENCE, shown read-only — it is
    // never a review decision. Management chooses one of these governance actions on an established
    // pattern; the current trajectory is displayed alongside, not selected.
    const OUTCOMES = ['Continue Monitoring', 'Promote to Risk', 'Escalate', 'Close'];
    if (!OUTCOMES.includes(outcome)) throw new Error('Choose a valid pattern review decision.');
    if (!rationale || rationale.trim().length < 20) throw new Error('Pattern review requires a meaningful rationale (at least a sentence).');
    if (outcome === 'Continue Monitoring' && !nextReviewDate) throw new Error('Continue Monitoring requires a future review date so the pattern returns for review.');

    if (outcome === 'Close') {
      const closure = await this.assessPatternClosure(company_id, cluster_id);
      if (!closure.eligible) throw new Error(`Pattern cannot close: ${closure.blockers.join(' ')}`);
    }

    const nextReview = nextReviewDate || null;
    const today = new Date().toISOString().slice(0, 10);

    // §3 — the review and any downstream object (risk / escalation) are created atomically.
    // A pattern never shows Promoted or Escalated unless the linked record actually exists;
    // if creation fails, the whole review rolls back (no swallowed errors, no phantom status).
    const client = await getClient();
    let next_action: any = null;
    try {
      await client.query('BEGIN');
      const cur = (await client.query(`SELECT * FROM signal_clusters WHERE id = $1 AND company_id = $2 FOR UPDATE`, [cluster_id, company_id])).rows[0];
      if (!cur) throw new Error('Pattern not found.');

      // Promote to Risk / Escalate delegate to the ONE shared executor (§2): it creates and
      // links exactly one record, dedups duplicate submissions, and records the decision.
      let out: any = null;
      let linkedRiskId: string | null = cur.linked_risk_id || null;
      if (outcome === 'Promote to Risk' || outcome === 'Escalate') {
        out = await governanceDecisionsService.executeInTx(client, {
          company_id, user_id, cluster_id,
          house_id: cur.house_id || (Array.isArray(cur.affected_house_ids) ? cur.affected_house_ids[0] : null),
          what_is_happening: `Pattern review — ${outcome}: ${rationale.trim()}`.slice(0, 900),
          decision: outcome === 'Promote to Risk' ? 'Promote to Risk' : 'Escalate',
          idempotency_key: `pattern-review:${cluster_id}:${outcome}:${today}`,
        });
        if (out?.risk) linkedRiskId = out.risk.id;
      } else {
        // Monitoring outcomes are still governance records — even "no change".
        await client.query(
          `INSERT INTO governance_reviews (company_id, cluster_id, review_type, reviewed_by, what_is_happening, decision, decision_status)
           VALUES ($1,$2,'RM_REVIEW',$3,$4,'Monitor','Completed')`,
          [company_id, cluster_id, user_id, `Pattern review — ${outcome}: ${rationale.trim()}`.slice(0, 900)]
        );
      }

      // Status now only reflects records that were actually created above.
      const result = await client.query(
        `UPDATE signal_clusters
            SET last_reviewed_at = NOW(), last_reviewed_by = $1, next_review_date = $2,
                review_outcome = $3,
                closure_reason = CASE WHEN $3 = 'Close' THEN $4 ELSE closure_reason END,
                closed_at = CASE WHEN $3 = 'Close' THEN NOW() ELSE closed_at END,
                closed_by = CASE WHEN $3 = 'Close' THEN $1 ELSE closed_by END,
                cluster_status = CASE WHEN $3 = 'Close' THEN 'Resolved'
                                      WHEN $3 = 'Escalate' THEN 'Escalated'
                                      WHEN $3 = 'Promote to Risk' THEN 'Confirmed'
                                      ELSE cluster_status END,
                linked_risk_id = COALESCE($7, linked_risk_id),
                updated_at = NOW()
          WHERE id = $5 AND company_id = $6 RETURNING *`,
        [user_id, nextReview, outcome, rationale.trim(), cluster_id, company_id, linkedRiskId]
      );
      await client.query('COMMIT');

      if (out?.risk) next_action = { type: 'promoted', risk_id: out.risk.id };
      else if (out?.escalation) next_action = { type: 'escalated', escalation_id: out.escalation.id };

      const cluster = result.rows[0];
      return { ...cluster, next_action };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
