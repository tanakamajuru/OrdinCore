import { getClient, query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Chapter 3 — the Daily Governance Review is the engine that generates management work.
 * A Governance Decision is a leadership decision recorded during the review. When the
 * decision is to act, it creates a linked task in the EXISTING task system (risk_actions),
 * carrying full lineage: which signal/pattern/risk it came from and which decision created
 * it. Nothing is duplicated — one task system, one review object.
 *
 * A signal/pattern is never replaced; the decision and task link back to it.
 */

export type DecisionInput = {
  company_id: string;
  user_id: string;
  daily_governance_log_id?: string | null;
  house_id?: string | null;         // service the decision concerns
  pulse_entry_id?: string | null;   // source signal
  cluster_id?: string | null;       // source pattern
  risk_id?: string | null;          // source risk
  escalation_id?: string | null;
  what_is_happening: string;
  decision: 'Monitor' | 'Create Action' | 'Escalate' | 'Close' | 'Reopen';
  owner_id?: string | null;         // Team Leader the task is assigned to
  due_at?: string | null;
  intended_outcome?: string | null;
  action_description?: string | null;
  idempotency_key?: string | null;
};

export const governanceDecisionsService = {
  async create(input: DecisionInput) {
    if (!input.what_is_happening || input.what_is_happening.trim().length < 5) {
      throw new Error('Describe what is happening (at least a short sentence).');
    }
    if (!input.pulse_entry_id && !input.cluster_id && !input.risk_id && !input.escalation_id && !input.house_id) {
      throw new Error('A governance decision must identify its source (a signal, pattern, risk or service).');
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const reviewType = 'RM_REVIEW';
      const review = await client.query(
        `INSERT INTO governance_reviews (
           company_id, service_id, risk_id, escalation_id,
           pulse_entry_id, cluster_id, daily_governance_log_id,
           review_type, reviewed_by, what_is_happening, decision,
           escalation_required, action_required, evidence,
           decision_owner_id, due_at, intended_outcome, decision_status, idempotency_key
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         ON CONFLICT (company_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
         RETURNING *`,
        [
          input.company_id, input.house_id ?? null, input.risk_id ?? null, input.escalation_id ?? null,
          input.pulse_entry_id ?? null, input.cluster_id ?? null, input.daily_governance_log_id ?? null,
          reviewType, input.user_id, input.what_is_happening.trim(), input.decision,
          input.decision === 'Escalate', input.decision === 'Create Action', null,
          input.owner_id ?? null, input.due_at ?? null, input.intended_outcome ?? null,
          input.decision === 'Monitor' ? 'Monitoring' : 'Open', input.idempotency_key ?? null,
        ]
      );
      // Idempotent replay — a decision with this key already exists; return it, no duplicate.
      if (!review.rows[0]) {
        const existing = await client.query(
          `SELECT * FROM governance_reviews WHERE company_id = $1 AND idempotency_key = $2`,
          [input.company_id, input.idempotency_key]
        );
        await client.query('COMMIT');
        return { decision: existing.rows[0] || null, task: null, idempotent: true };
      }
      const decision = review.rows[0];

      let task = null;
      if (input.decision === 'Create Action') {
        const title = (input.action_description || input.what_is_happening).trim().slice(0, 255);
        const taskId = uuidv4();
        const t = await client.query(
          `INSERT INTO risk_actions (
             id, risk_id, company_id, house_id, title, description, assigned_to, due_date, created_by,
             status, governance_review_id, source_pulse_id, source_cluster_id, intended_outcome
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending',$10,$11,$12,$13)
           RETURNING *`,
          [
            taskId, input.risk_id ?? null, input.company_id, input.house_id ?? null,
            title, input.what_is_happening.trim(), input.owner_id ?? null, input.due_at ?? null, input.user_id,
            decision.id, input.pulse_entry_id ?? null, input.cluster_id ?? null, input.intended_outcome ?? null,
          ]
        );
        task = t.rows[0];

        // Mark the source signal as actioned (still permanent evidence — never replaced).
        if (input.pulse_entry_id) {
          await client.query(
            `UPDATE governance_pulses SET review_status = 'Reviewed', reviewed_by = COALESCE(reviewed_by,$1), reviewed_at = COALESCE(reviewed_at, NOW())
              WHERE id = $2 AND company_id = $3`,
            [input.user_id, input.pulse_entry_id, input.company_id]
          );
        }
      }

      await client.query('COMMIT');

      // Notify the owner their task was created (best-effort, outside the txn).
      if (task && input.owner_id) {
        try {
          const { notificationsService } = await import('./notifications.service');
          await notificationsService.create({
            company_id: input.company_id, user_id: input.owner_id, type: 'task_assigned',
            title: 'Governance decision assigned to you',
            body: `${task.title}${input.due_at ? ` · due ${new Date(input.due_at).toLocaleDateString('en-GB')}` : ''}`,
            link: '/my-actions',
          });
        } catch { /* best-effort */ }
      }

      return { decision, task };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Decisions for a day (default today) with their linked task status — powers the
  // "today's decisions" list and the next-morning "yesterday's decisions" review.
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
        WHERE ${where}
          AND gr.review_type = 'RM_REVIEW'
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
