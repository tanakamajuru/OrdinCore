import { query, getClient } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import type { PoolClient } from 'pg';

export type DecisionInput = {
  sourceType?: 'signal' | 'pattern' | 'risk' | 'escalation';
  sourceId?: string;
  pulse_entry_id?: string; cluster_id?: string; risk_id?: string;
  decision: 'Monitor' | 'Create Action' | 'Escalate' | 'Close' | 'Reopen';
  ownerId?: string; dueAt?: string;
  actionDescription?: string; intendedOutcome?: string; reason?: string;
  whatIsHappening?: string;
  idempotencyKey?: string;
};

export class DailyGovernanceService {
  async openLog(house_id: string, user_id: string, company_id: string) {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if log already exists for today
    const existing = await query(
      'SELECT * FROM daily_governance_log WHERE house_id = $1 AND review_date = $2',
      [house_id, today]
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO daily_governance_log (id, house_id, review_date, completed, review_type)
       VALUES ($1, $2, $3, false, 'Primary') RETURNING *`,
      [id, house_id, today]
    );

    return result.rows[0];
  }

  async completeLog(
    log_id: string,
    opts: {
      note: string;
      user_id: string;
      company_id: string;
      is_deputy_review?: boolean;
      leadership_narrative?: string;
      team_brief?: string;
      material_change?: boolean;
      decisions?: DecisionInput[];
    }
  ) {
    const { note, user_id, company_id, is_deputy_review = false } = opts;

    // PDF Phase 3 — the review is atomic: the narrative + Team Brief + every decision and
    // its linked task/escalation commit together, or nothing does. The Team Brief is only
    // published once all required transitions succeed. One shared DB connection (getClient),
    // never independent query('BEGIN') calls through the pool.
    const client = await getClient();
    let house_id: string | undefined;
    let material = false;
    try {
      await client.query('BEGIN');

      // 1. Lock and validate the daily log.
      const logRes = await client.query('SELECT house_id FROM daily_governance_log WHERE id = $1 FOR UPDATE', [log_id]);
      if (!logRes.rows[0]) throw new Error('Governance log not found');
      house_id = logRes.rows[0].house_id;

      let enhanced_oversight = false;
      let director_notified: Date | null = null;
      if (is_deputy_review && house_id) {
        const sig = await client.query(
          `SELECT COUNT(*) FROM governance_pulses WHERE house_id = $1 AND entry_date = CURRENT_DATE AND severity IN ('High','Critical')`,
          [house_id]
        );
        if (parseInt(sig.rows[0].count) > 0) { enhanced_oversight = true; director_notified = new Date(); }
      }

      const leadership = (opts.leadership_narrative || note || '').trim();
      const brief = (opts.team_brief || '').trim();
      material = opts.material_change !== false && brief.length > 0;

      // 2. Save leadership narrative + Team Leader brief.
      const result = await client.query(
        `UPDATE daily_governance_log
         SET completed = true, daily_note = $1, reviewed_by = $2, completed_at = NOW(),
             is_deputy_review = $4, review_type = $5, escalation_sent = $6, director_alerted_at = $7,
             company_id = COALESCE(company_id, $8),
             leadership_narrative = $9, team_brief = $10, material_change = $11,
             published_at = NOW(), published_by = $2
         WHERE id = $3 RETURNING *`,
        [note, user_id, log_id, is_deputy_review, is_deputy_review ? 'Deputy Cover' : 'Primary',
         enhanced_oversight, director_notified, company_id, leadership || null, brief || null, material]
      );
      const log = result.rows[0];

      // 3–5. Create each governance decision, its linked task/escalation, and update the
      // source status — all inside the same transaction. Any failure rolls the review back.
      for (const d of (opts.decisions || [])) {
        await this.createDecisionInTx(client, { company_id, user_id, log_id, house_id: house_id || null, decision: d });
      }

      // 6. Commit only when every required step succeeded.
      await client.query('COMMIT');

      // 7. Notifications (post-commit, best-effort) — publish the brief to Team Leaders.
      if (material && house_id) {
        try {
          const { notificationsService } = await import('./notifications.service');
          const tls = await query(
            `SELECT u.id FROM users u JOIN user_houses uh ON uh.user_id = u.id
              WHERE uh.house_id = $1 AND u.role = 'TEAM_LEADER' AND u.status = 'active'`,
            [house_id]
          );
          for (const t of tls.rows) {
            await notificationsService.create({
              company_id, user_id: t.id, type: 'daily_brief',
              title: 'Daily Governance Brief published',
              body: "Today's governance priorities are ready — please review and acknowledge.",
              link: '/daily-governance-inbox',
            });
          }
        } catch { /* best-effort */ }
      }
      return log;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Create one governance decision + its consequence inside an open transaction (client).
  // Idempotent: a repeated idempotency_key returns the existing decision without duplicating.
  private async createDecisionInTx(client: PoolClient, ctx: { company_id: string; user_id: string; log_id: string; house_id: string | null; decision: DecisionInput }) {
    const { company_id, user_id, log_id, house_id } = ctx;
    const d = ctx.decision;
    const pulse_entry_id = d.pulse_entry_id || (d.sourceType === 'signal' ? d.sourceId : null) || null;
    const cluster_id = d.cluster_id || (d.sourceType === 'pattern' ? d.sourceId : null) || null;
    const risk_id = d.risk_id || (d.sourceType === 'risk' ? d.sourceId : null) || null;
    const what = (d.whatIsHappening || d.actionDescription || d.reason || '').trim();
    if (!what) throw new Error('Each decision needs a description.');

    const review = await client.query(
      `INSERT INTO governance_reviews (
         company_id, service_id, risk_id, pulse_entry_id, cluster_id, daily_governance_log_id,
         review_type, reviewed_by, what_is_happening, decision, escalation_required, action_required,
         decision_owner_id, due_at, intended_outcome, decision_status, idempotency_key
       ) VALUES ($1,$2,$3,$4,$5,$6,'RM_REVIEW',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (company_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
       RETURNING *`,
      [company_id, house_id, risk_id, pulse_entry_id, cluster_id, log_id, user_id, what, d.decision,
       d.decision === 'Escalate', d.decision === 'Create Action', d.ownerId || null, d.dueAt || null,
       d.intendedOutcome || null, d.decision === 'Monitor' ? 'Monitoring' : 'Open', d.idempotencyKey || null]
    );
    // Idempotent replay — the decision already exists, so its consequences already exist too.
    if (!review.rows[0]) return;
    const decisionId = review.rows[0].id;

    if (d.decision === 'Create Action') {
      const title = (d.actionDescription || what).slice(0, 255);
      await client.query(
        `INSERT INTO risk_actions (id, risk_id, company_id, house_id, title, description, assigned_to, due_date, created_by, status, governance_review_id, source_pulse_id, source_cluster_id, intended_outcome)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending',$10,$11,$12,$13)`,
        [uuidv4(), risk_id, company_id, house_id, title, what, d.ownerId || null, d.dueAt || null, user_id, decisionId, pulse_entry_id, cluster_id, d.intendedOutcome || null]
      );
    } else if (d.decision === 'Escalate') {
      const target = d.ownerId || (await client.query(
        `SELECT id FROM users WHERE company_id=$1 AND status='active' AND role = ANY(ARRAY['REGISTERED_MANAGER','DIRECTOR']) ORDER BY CASE role WHEN 'REGISTERED_MANAGER' THEN 0 ELSE 1 END LIMIT 1`, [company_id]
      )).rows[0]?.id;
      if (!target) throw new Error('No manager available to escalate to.');
      await client.query(
        `INSERT INTO escalations (id, company_id, risk_id, source_pulse_id, source_cluster_id, source_governance_review_id, house_id, escalated_by, escalated_to, reason, status, lifecycle_status, priority, due_by, trigger_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Pending','Open','Urgent', NOW() + INTERVAL '48 hours','GOVERNANCE_DECISION')`,
        [uuidv4(), company_id, risk_id, pulse_entry_id, cluster_id, decisionId, house_id, user_id, target, (d.reason || what).slice(0, 1000)]
      );
    }

    // 5. Update the source signal status (it remains permanent evidence, never replaced).
    if (pulse_entry_id) {
      await client.query(
        `UPDATE governance_pulses SET review_status = CASE WHEN $2 = 'Close' THEN 'Closed'::review_status WHEN $2 = 'Monitor' THEN 'Monitoring'::review_status ELSE 'Reviewed'::review_status END,
                reviewed_by = COALESCE(reviewed_by,$1), reviewed_at = COALESCE(reviewed_at, NOW())
          WHERE id = $3 AND company_id = $4`,
        [user_id, d.decision, pulse_entry_id, company_id]
      );
    }
  }

  // The latest published Team Brief for a set of services (the TL's assigned houses),
  // for today, with whether THIS user has acknowledged it.
  async latestTeamBrief(company_id: string, house_ids: string[], user_id: string) {
    if (!house_ids.length) return null;
    const res = await query(
      `SELECT dgl.id, dgl.house_id, h.name AS house_name, dgl.team_brief, dgl.material_change,
              dgl.published_at, dgl.review_date,
              (a.id IS NOT NULL) AS acknowledged
         FROM daily_governance_log dgl
         JOIN houses h ON h.id = dgl.house_id
         LEFT JOIN daily_brief_acknowledgements a ON a.log_id = dgl.id AND a.user_id = $3
        WHERE dgl.house_id = ANY($1::uuid[])
          AND dgl.completed = true
          AND dgl.review_date = CURRENT_DATE
        ORDER BY dgl.published_at DESC NULLS LAST
        LIMIT 1`,
      [house_ids, company_id, user_id]
    );
    return res.rows[0] || null;
  }

  // The Team Leader's dedicated "Daily Governance" inbox: recent published briefs for
  // their services (Team Brief only — the leadership narrative stays private to leadership).
  async recentTeamBriefs(company_id: string, house_ids: string[], user_id: string) {
    if (!house_ids.length) return [];
    const res = await query(
      `SELECT dgl.id, dgl.house_id, h.name AS house_name, dgl.team_brief, dgl.material_change,
              dgl.published_at, dgl.review_date, (a.id IS NOT NULL) AS acknowledged
         FROM daily_governance_log dgl
         JOIN houses h ON h.id = dgl.house_id
         LEFT JOIN daily_brief_acknowledgements a ON a.log_id = dgl.id AND a.user_id = $3
        WHERE dgl.house_id = ANY($1::uuid[])
          AND dgl.completed = true
          AND dgl.review_date >= CURRENT_DATE - INTERVAL '14 days'
        ORDER BY dgl.published_at DESC NULLS LAST, dgl.review_date DESC
        LIMIT 30`,
      [house_ids, company_id, user_id]
    );
    return res.rows;
  }

  async acknowledgeBrief(log_id: string, user_id: string, company_id: string) {
    await query(
      `INSERT INTO daily_brief_acknowledgements (log_id, company_id, user_id)
       VALUES ($1, $2, $3) ON CONFLICT (log_id, user_id) DO NOTHING`,
      [log_id, company_id, user_id]
    );
    return { acknowledged: true };
  }

  async getCoverage(company_id: string) {
    const result = await query(
      `SELECT h.id as house_id, h.name as house_name, 
              MAX(dgl.review_date) as last_review_date,
              CASE 
                WHEN MAX(dgl.review_date) = CURRENT_DATE THEN 'Up to Date'
                WHEN MAX(dgl.review_date) = CURRENT_DATE - INTERVAL '1 day' THEN 'Due'
                ELSE 'Overdue'
              END as status
       FROM houses h
       LEFT JOIN daily_governance_log dgl ON dgl.house_id = h.id AND dgl.completed = true
       WHERE h.company_id = $1
       GROUP BY h.id, h.name
       ORDER BY last_review_date DESC NULLS LAST`,
      [company_id]
    );
    return result.rows;
  }
}

export const dailyGovernanceService = new DailyGovernanceService();
