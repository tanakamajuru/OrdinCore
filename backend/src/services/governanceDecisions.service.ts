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
  | 'Monitor' | 'Create Action' | 'Create Pattern' | 'Link to Pattern' | 'Escalate' | 'Promote to Risk'
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
       decision === 'Escalate', decision === 'Create Action' || (decision === 'Monitor' && !!input.owner_id), null, input.owner_id ?? null, input.due_at ?? null,
       input.intended_outcome ?? null, decision === 'Monitor' ? 'Monitoring' : 'Open', input.idempotency_key ?? null]
    );
    // Idempotent replay — the decision (and its consequence) already exist.
    if (!review.rows[0]) {
      const existing = await client.query(`SELECT * FROM governance_reviews WHERE company_id = $1 AND idempotency_key = $2`, [c, input.idempotency_key]);
      return { decision: existing.rows[0] || null, idempotent: true, task: null, escalation: null, risk: null, pattern: null };
    }
    const decisionId = review.rows[0].id;
    const title = (input.action_description || input.what_is_happening).trim().slice(0, 255);
    let task: any = null, escalation: any = null, risk: any = null, pattern: any = null;

    if (decision === 'Create Action') {
      const t = await client.query(
        `INSERT INTO risk_actions (id, risk_id, company_id, house_id, title, description, assigned_to, due_date, created_by, status, governance_review_id, source_pulse_id, source_cluster_id, intended_outcome)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending',$10,$11,$12,$13) RETURNING *`,
        [uuidv4(), input.risk_id ?? null, c, input.house_id ?? null, title, input.what_is_happening.trim(), input.owner_id ?? null, input.due_at ?? null, u, decisionId, input.pulse_entry_id ?? null, input.cluster_id ?? null, input.intended_outcome ?? null]
      );
      task = t.rows[0];
    } else if (decision === 'Monitor' && input.owner_id) {
      // A Monitor decision that names an owner is real, ongoing work for that person
      // (e.g. "continue to monitor medication compliance — owner Eric Ndikum"). Allocate
      // it as an assigned action so it reaches the owner's My Work, exactly like Create
      // Action — the signal itself still advances to 'Monitoring' below. Without this, a
      // Monitor decision recorded no work and never reached the Team Leader.
      const t = await client.query(
        `INSERT INTO risk_actions (id, risk_id, company_id, house_id, title, description, assigned_to, due_date, created_by, status, governance_review_id, source_pulse_id, source_cluster_id, intended_outcome)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending',$10,$11,$12,$13) RETURNING *`,
        [uuidv4(), input.risk_id ?? null, c, input.house_id ?? null, title, input.what_is_happening.trim(), input.owner_id, input.due_at ?? null, u, decisionId, input.pulse_entry_id ?? null, input.cluster_id ?? null, input.intended_outcome ?? null]
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
      if (escalation) {
        // Frozen doctrine: an open SAFETY-NET alert for this source is PROMOTED into the formal
        // escalation pathway (never duplicated) — record the decision, mark it governance-driven,
        // and retarget to the chosen owner if the RM named one.
        const promoted = await client.query(
          `UPDATE escalations
              SET trigger_type = 'GOVERNANCE_DECISION',
                  source_governance_review_id = COALESCE(source_governance_review_id, $2),
                  escalated_to = COALESCE($3, escalated_to),
                  reason = CASE WHEN COALESCE(reason,'') = '' THEN $4 ELSE reason END
            WHERE id = $1 RETURNING *`,
          [escalation.id, decisionId, input.owner_id ?? null, (input.action_description || input.what_is_happening).slice(0, 1000)]
        );
        escalation = promoted.rows[0] || escalation;
      } else {
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
    } else if (decision === 'Create Pattern') {
      // Create a new pattern and link the originating signal to it.
      if (!input.pulse_entry_id) throw new Error('Create Pattern needs an originating signal.');
      const p = (await client.query(`SELECT id, house_id, risk_domain, related_person FROM governance_pulses WHERE id = $1 AND company_id = $2`, [input.pulse_entry_id, c])).rows[0];
      if (!p) throw new Error('Originating signal not found.');
      const dom = Array.isArray(p.risk_domain) ? p.risk_domain[0] : p.risk_domain;
      const label = (input.action_description || input.what_is_happening).trim().slice(0, 120);
      pattern = (await client.query(
        `INSERT INTO signal_clusters (company_id, house_id, risk_domain, linked_person, cluster_label, cluster_status, signal_count, first_signal_date, last_signal_date, trajectory)
         VALUES ($1,$2,$3,$4,$5,'Emerging',1,NOW(),NOW(),'Stable') RETURNING *`,
        [c, p.house_id, dom, p.related_person || null, label]
      )).rows[0];
      await client.query(`INSERT INTO risk_signal_links (id, cluster_id, pulse_entry_id, linked_by) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [uuidv4(), pattern.id, p.id, u]);
      await client.query(`UPDATE governance_reviews SET cluster_id = $1 WHERE id = $2`, [pattern.id, decisionId]);
      await client.query(`UPDATE governance_pulses SET review_status = 'Linked' WHERE id = $1 AND company_id = $2`, [p.id, c]);
    } else if (decision === 'Link to Pattern') {
      // Link the signal to an existing pattern (both must belong to this company).
      if (!input.pulse_entry_id || !input.cluster_id) throw new Error('Link to Pattern needs a signal and a pattern.');
      const cl = (await client.query(`SELECT id FROM signal_clusters WHERE id = $1 AND company_id = $2 FOR UPDATE`, [input.cluster_id, c])).rows[0];
      if (!cl) throw new Error('Pattern not found.');
      const linked = await client.query(`INSERT INTO risk_signal_links (id, cluster_id, pulse_entry_id, linked_by) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`, [uuidv4(), cl.id, input.pulse_entry_id, u]);
      if (linked.rows[0]) {
        await client.query(`UPDATE signal_clusters SET signal_count = COALESCE(signal_count,0) + 1, last_signal_date = NOW(), updated_at = NOW() WHERE id = $1`, [cl.id]);
      }
      await client.query(`UPDATE governance_pulses SET review_status = 'Linked' WHERE id = $1 AND company_id = $2`, [input.pulse_entry_id, c]);
      pattern = cl;
    } else if (decision === 'Close' || decision === 'Close Signal') {
      // Close only the processed signal — never the pattern/risk.
      if (input.pulse_entry_id) {
        await client.query(`UPDATE governance_pulses SET review_status = 'Closed', reviewed_by = COALESCE(reviewed_by,$1), reviewed_at = COALESCE(reviewed_at, NOW()) WHERE id = $2 AND company_id = $3`, [u, input.pulse_entry_id, c]);
      }
    } else if (decision === 'Request Risk Closure' && input.risk_id) {
      // Do NOT close directly — mark the risk for a closure review.
      await client.query(`UPDATE risks SET closure_eligible = true, last_governance_review_at = NOW(), updated_at = NOW() WHERE id = $1 AND company_id = $2`, [input.risk_id, c]);
    }

    // The source signal remains permanent evidence — only its status advances. Pattern-linking
    // and closing decisions already set the signal's status above, so skip the generic update.
    if (input.pulse_entry_id && !['Close', 'Close Signal', 'Create Pattern', 'Link to Pattern'].includes(decision)) {
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

    // Frozen doctrine — the RM's daily triage IS the management response to a SAFETY-NET alert
    // escalation (auto-opened on capture for Critical/flagged signals). A non-Escalate decision on
    // the signal resolves that alert: the record is preserved, closed, and references the decision.
    // Formal governance escalations (trigger 'GOVERNANCE_DECISION') are untouched — they close only
    // through the evidence-based closure review. Escalate promotes the alert instead (handled above).
    if (input.pulse_entry_id && decision !== 'Escalate') {
      const bits = [`Safety-net requirement satisfied through RM governance triage → ${decision}`];
      if (input.owner_id && (decision === 'Create Action' || decision === 'Monitor')) bits.push('action allocated to owner');
      if (input.due_at) bits.push(`due ${new Date(input.due_at).toISOString().slice(0, 10)}`);
      await client.query(
        `UPDATE escalations
            SET lifecycle_status = 'Closed', status = 'Resolved', resolved_at = NOW(),
                resolution_notes = $2, source_governance_review_id = COALESCE(source_governance_review_id, $3)
          WHERE company_id = $1 AND source_pulse_id = $4
            AND COALESCE(trigger_type, '') <> 'GOVERNANCE_DECISION'
            AND COALESCE(lifecycle_status::text, 'Open') <> 'Closed'`,
        [c, bits.join(' · '), decisionId, input.pulse_entry_id]
      );
    }

    return { decision: review.rows[0], task, escalation, risk, pattern, idempotent: false };
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
              gr.intended_outcome, gr.created_at, gr.service_id, gr.pulse_entry_id,
              h.name AS house_name,
              ow.first_name || ' ' || ow.last_name AS owner_name,
              rb.first_name || ' ' || rb.last_name AS recorded_by_name,
              ra.id AS task_id, ra.status AS task_status, ra.due_date AS task_due,
              ra.effectiveness AS task_effectiveness,
              gp.related_person AS signal_person, gp.severity AS signal_severity,
              gp.governance_domain AS signal_domain, gp.description AS signal_description,
              gp.entry_date AS signal_date
         FROM governance_reviews gr
         LEFT JOIN houses h ON h.id = gr.service_id
         LEFT JOIN users ow ON ow.id = gr.decision_owner_id
         LEFT JOIN users rb ON rb.id = gr.reviewed_by
         LEFT JOIN risk_actions ra ON ra.governance_review_id = gr.id
         LEFT JOIN governance_pulses gp ON gp.id = gr.pulse_entry_id
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
