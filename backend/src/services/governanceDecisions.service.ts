import { getClient, query } from '../config/database';
import type { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';

/**
 * The Daily Governance Review is the engine that generates management work. A Governance
 * Decision is a leadership decision recorded during the review; when it is to act, it
 * creates the linked downstream record (task / escalation / risk / closure review) with
 * full lineage — never a second task system, never just a status label.
 *
 * §2 (Completion Guide): Daily Governance decisions and standalone decisions run through
 * ONE executor — `executeInTx` — so both behave identically and idempotently. A decision
 * is never "completed" unless its required downstream record was created in the same
 * transaction.
 */

export type GovernanceDecisionType =
  | 'Monitor' | 'Create Action' | 'Escalate' | 'Promote to Risk'
  | 'Close' | 'Close Signal' | 'Request Risk Closure' | 'Reopen';

export type DecisionInput = {
  company_id: string;
  user_id: string;
  daily_governance_log_id?: string | null;
  house_id?: string | null;
  pulse_entry_id?: string | null;
  cluster_id?: string | null;
  risk_id?: string | null;
  escalation_id?: string | null;
  what_is_happening: string;
  decision: GovernanceDecisionType;
  owner_id?: string | null;
  due_at?: string | null;
  intended_outcome?: string | null;
  action_description?: string | null;
  idempotency_key?: string | null;
};

export const governanceDecisionsService = {
  // Shared executor — runs inside a caller-supplied transaction (PoolClient). Returns the
  // decision plus whichever downstream record it created. Idempotent on idempotency_key.
  async executeInTx(client: PoolClient, input: DecisionInput) {
    if (!input.what_is_happening || input.what_is_happening.trim().length < 5) {
      throw new Error('Describe what is happening (at least a short sentence).');
    }
    if (!input.pulse_entry_id && !input.cluster_id && !input.risk_id && !input.escalation_id && !input.house_id) {
      throw new Error('A governance decision must identify its source (a signal, pattern, risk or service).');
    }
    const c = input.company_id, u = input.user_id;
    const decision = input.decision;

    const review = await client.query(
      `INSERT INTO governance_reviews (
         company_id, service_id, risk_id, escalation_id, pulse_entry_id, cluster_id, daily_governance_log_id,
         review_type, reviewed_by, what_is_happening, decision, escalation_required, action_required, evidence,
         decision_owner_id, due_at, intended_outcome, decision_status, idempotency_key
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'RM_REVIEW',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (company_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
       RETURNING *`,
      [c, input.house_id ?? null, input.risk_id ?? null, input.escalation_id ?? null, input.pulse_entry_id ?? null,
       input.cluster_id ?? null, input.daily_governance_log_id ?? null, u, input.what_is_happening.trim(), decision,
       decision === 'Escalate', decision === 'Create Action', null, input.owner_id ?? null, input.due_at ?? null,
       input.intended_outcome ?? null, decision === 'Monitor' ? 'Monitoring' : 'Open', input.idempotency_key ?? null]
    );
    // Idempotent replay — the decision (and its consequence) already exist.
    if (!review.rows[0]) {
      const existing = await client.query(`SELECT * FROM governance_reviews WHERE company_id = $1 AND idempotency_key = $2`, [c, input.idempotency_key]);
      return { decision: existing.rows[0] || null, idempotent: true, task: null, escalation: null, risk: null };
    }
    const decisionId = review.rows[0].id;
    const title = (input.action_description || input.what_is_happening).trim().slice(0, 255);
    let task: any = null, escalation: any = null, risk: any = null;

    if (decision === 'Create Action') {
      const t = await client.query(
        `INSERT INTO risk_actions (id, risk_id, company_id, house_id, title, description, assigned_to, due_date, created_by, status, governance_review_id, source_pulse_id, source_cluster_id, intended_outcome)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending',$10,$11,$12,$13) RETURNING *`,
        [uuidv4(), input.risk_id ?? null, c, input.house_id ?? null, title, input.what_is_happening.trim(), input.owner_id ?? null, input.due_at ?? null, u, decisionId, input.pulse_entry_id ?? null, input.cluster_id ?? null, input.intended_outcome ?? null]
      );
      task = t.rows[0];
    } else if (decision === 'Escalate') {
      // Dedup: never open a second live escalation for the same source pattern/risk/signal.
      const dupSrc = input.cluster_id ? ['source_cluster_id', input.cluster_id]
        : input.risk_id ? ['risk_id', input.risk_id]
        : input.pulse_entry_id ? ['source_pulse_id', input.pulse_entry_id] : null;
      if (dupSrc) {
        const existing = await client.query(
          `SELECT * FROM escalations WHERE company_id = $1 AND ${dupSrc[0]} = $2
             AND COALESCE(lifecycle_status::text, status, 'Open') NOT IN ('Closed','Resolved','closed','resolved') LIMIT 1`,
          [c, dupSrc[1]]
        );
        if (existing.rows[0]) { escalation = existing.rows[0]; }
      }
      if (escalation) { /* reuse existing open escalation */ } else {
      const target = input.owner_id || (await client.query(
        `SELECT id FROM users WHERE company_id=$1 AND status='active' AND role = ANY(ARRAY['REGISTERED_MANAGER','DIRECTOR']) ORDER BY CASE role WHEN 'REGISTERED_MANAGER' THEN 0 ELSE 1 END LIMIT 1`, [c]
      )).rows[0]?.id;
      if (!target) throw new Error('No manager available to escalate to.');
      const e = await client.query(
        `INSERT INTO escalations (id, company_id, risk_id, source_pulse_id, source_cluster_id, source_governance_review_id, house_id, escalated_by, escalated_to, reason, status, lifecycle_status, priority, due_by, trigger_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Pending','Open','Urgent', NOW() + INTERVAL '48 hours','GOVERNANCE_DECISION') RETURNING *`,
        [uuidv4(), c, input.risk_id ?? null, input.pulse_entry_id ?? null, input.cluster_id ?? null, decisionId, input.house_id ?? null, u, target, (input.action_description || input.what_is_happening).slice(0, 1000)]
      );
      escalation = e.rows[0];
      }
    } else if (decision === 'Promote to Risk') {
      risk = await this.promoteToRiskInTx(client, input, decisionId);
    } else if (decision === 'Close' || decision === 'Close Signal') {
      // Close only the processed signal — never the pattern/risk.
      if (input.pulse_entry_id) {
        await client.query(`UPDATE governance_pulses SET review_status = 'Closed', reviewed_by = COALESCE(reviewed_by,$1), reviewed_at = COALESCE(reviewed_at, NOW()) WHERE id = $2 AND company_id = $3`, [u, input.pulse_entry_id, c]);
      }
    } else if (decision === 'Request Risk Closure' && input.risk_id) {
      // Do NOT close directly — mark the risk for a closure review.
      await client.query(`UPDATE risks SET closure_eligible = true, last_governance_review_at = NOW(), updated_at = NOW() WHERE id = $1 AND company_id = $2`, [input.risk_id, c]);
    }

    // The source signal remains permanent evidence — only its status advances.
    if (input.pulse_entry_id && decision !== 'Close' && decision !== 'Close Signal') {
      await client.query(
        `UPDATE governance_pulses SET review_status = CASE WHEN $2 = 'Monitor' THEN 'Monitoring'::review_status ELSE 'Reviewed'::review_status END,
                reviewed_by = COALESCE(reviewed_by,$1), reviewed_at = COALESCE(reviewed_at, NOW())
          WHERE id = $3 AND company_id = $4`,
        [u, decision, input.pulse_entry_id, c]
      );
    }
    if (decision === 'Monitor' && input.risk_id) {
      await client.query(`UPDATE risks SET last_governance_review_at = NOW(), updated_at = NOW() WHERE id = $1 AND company_id = $2`, [input.risk_id, c]);
    }

    return { decision: review.rows[0], task, escalation, risk, idempotent: false };
  },

  // Promote a pattern (or a single signal) to ONE formal risk, in-transaction. Idempotent:
  // a pattern that already has a linked risk returns it instead of creating a duplicate.
  async promoteToRiskInTx(client: PoolClient, input: DecisionInput, decisionId: string) {
    const c = input.company_id, u = input.user_id;
    if (input.cluster_id) {
      const cl = (await client.query(`SELECT id, risk_domain, linked_person, house_id, linked_risk_id, affected_house_ids FROM signal_clusters WHERE id = $1 AND company_id = $2 FOR UPDATE`, [input.cluster_id, c])).rows[0];
      if (!cl) throw new Error('Pattern not found.');
      if (cl.linked_risk_id) {
        const existing = (await client.query(`SELECT * FROM risks WHERE id = $1`, [cl.linked_risk_id])).rows[0];
        if (existing) return existing; // already promoted — no duplicate
      }
      const riskId = uuidv4();
      const r = await client.query(
        `INSERT INTO risks (id, company_id, house_id, title, description, severity, status, created_by, source_cluster_id, risk_domain, linked_person, trajectory)
         VALUES ($1,$2,$3,$4,$5,'Moderate','Open',$6,$7,$8,$9,'Stable') RETURNING *`,
        [riskId, c, cl.house_id || (Array.isArray(cl.affected_house_ids) ? cl.affected_house_ids[0] : null), (input.action_description || input.what_is_happening).slice(0, 255), input.what_is_happening.trim(), u, cl.id, cl.risk_domain, cl.linked_person || null]
      );
      await client.query(`UPDATE signal_clusters SET linked_risk_id = $1, cluster_status = 'Confirmed', updated_at = NOW() WHERE id = $2`, [riskId, cl.id]);
      await client.query(`UPDATE governance_reviews SET risk_id = $1 WHERE id = $2`, [riskId, decisionId]);
      return r.rows[0];
    }
    if (input.pulse_entry_id) {
      const p = (await client.query(`SELECT id, house_id, risk_domain, related_person, description FROM governance_pulses WHERE id = $1 AND company_id = $2`, [input.pulse_entry_id, c])).rows[0];
      if (!p) throw new Error('Signal not found.');
      const riskId = uuidv4();
      const dom = Array.isArray(p.risk_domain) ? p.risk_domain[0] : p.risk_domain;
      const r = await client.query(
        `INSERT INTO risks (id, company_id, house_id, title, description, severity, status, created_by, risk_domain, linked_person, trajectory)
         VALUES ($1,$2,$3,$4,$5,'Moderate','Open',$6,$7,$8,'Stable') RETURNING *`,
        [riskId, c, p.house_id, (input.action_description || input.what_is_happening).slice(0, 255), input.what_is_happening.trim(), u, dom, p.related_person || null]
      );
      await client.query(`INSERT INTO risk_signal_links (id, risk_id, pulse_entry_id, linked_by) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [uuidv4(), riskId, p.id, u]);
      await client.query(`UPDATE governance_pulses SET review_status = 'Linked' WHERE id = $1`, [p.id]);
      await client.query(`UPDATE governance_reviews SET risk_id = $1 WHERE id = $2`, [riskId, decisionId]);
      return r.rows[0];
    }
    throw new Error('Promote to Risk needs a source pattern or signal.');
  },

  // Standalone decision endpoint — wraps the shared executor in its own transaction.
  async create(input: DecisionInput) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const out = await this.executeInTx(client, input);
      await client.query('COMMIT');
      if (!out.idempotent && out.task && input.owner_id) {
        try {
          const { notificationsService } = await import('./notifications.service');
          await notificationsService.create({ company_id: input.company_id, user_id: input.owner_id, type: 'task_assigned', title: 'Governance decision assigned to you', body: `${out.task.title}${input.due_at ? ` · due ${new Date(input.due_at).toLocaleDateString('en-GB')}` : ''}`, link: '/my-actions' });
        } catch { /* notification is best-effort */ }
      }
      return out;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Decisions for a day (default today) with their linked task status.
  async list(company_id: string, opts: { date?: string; house_id?: string } = {}) {
    const params: any[] = [company_id];
    let where = 'gr.company_id = $1';
    if (opts.date) { params.push(opts.date); where += ` AND gr.created_at::date = $${params.length}`; }
    if (opts.house_id) { params.push(opts.house_id); where += ` AND gr.service_id = $${params.length}`; }

    const res = await query(
      `SELECT gr.id, gr.what_is_happening, gr.decision, gr.decision_status, gr.due_at,
              gr.intended_outcome, gr.created_at, gr.service_id,
              h.name AS house_name,
              ow.first_name || ' ' || ow.last_name AS owner_name,
              ra.id AS task_id, ra.status AS task_status, ra.due_date AS task_due,
              ra.effectiveness AS task_effectiveness
         FROM governance_reviews gr
         LEFT JOIN houses h ON h.id = gr.service_id
         LEFT JOIN users ow ON ow.id = gr.decision_owner_id
         LEFT JOIN risk_actions ra ON ra.governance_review_id = gr.id
        WHERE ${where} AND gr.review_type = 'RM_REVIEW'
        ORDER BY gr.created_at DESC`,
      params
    );
    const rows = res.rows.map((r: any) => {
      const overdue = r.task_due && new Date(r.task_due) < new Date() && !['Complete', 'Completed'].includes(r.task_status);
      const status = r.task_id
        ? (['Complete', 'Completed'].includes(r.task_status) ? 'Completed' : overdue ? 'Overdue' : 'In progress')
        : (r.decision_status === 'Monitoring' ? 'Monitoring' : r.decision);
      return { ...r, rollup_status: status };
    });
    const summary = {
      total: rows.length,
      tasks_created: rows.filter((r) => r.task_id).length,
      completed: rows.filter((r) => r.rollup_status === 'Completed').length,
      in_progress: rows.filter((r) => r.rollup_status === 'In progress').length,
      overdue: rows.filter((r) => r.rollup_status === 'Overdue').length,
    };
    return { decisions: rows, summary };
  },
};
