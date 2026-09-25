import { query, getClient } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import type { PoolClient } from 'pg';
import { governanceDecisionsService } from './governanceDecisions.service';
import { emitToCompany } from '../websocket/socket.server';

export type DecisionInput = {
  sourceType?: 'signal' | 'pattern' | 'risk' | 'escalation';
  sourceId?: string;
  pulse_entry_id?: string; cluster_id?: string; risk_id?: string;
  decision: 'Monitor' | 'Create Action' | 'Escalate' | 'Close' | 'Reopen';
  ownerId?: string; dueAt?: string;
  actionDescription?: string; intendedOutcome?: string; reason?: string;
  whatIsHappening?: string;
  idempotencyKey?: string;
  severity?: 'Low' | 'Moderate' | 'High' | 'Critical';
};

export class DailyGovernanceService {
  async openLog(house_id: string, user_id: string, company_id: string) {
    const today = new Date().toISOString().split('T')[0];

    // §6 — tenant isolation: the service must belong to the caller's company. Return a
    // neutral "not found" rather than leaking that the house exists for another tenant.
    const owns = await query('SELECT 1 FROM houses WHERE id = $1 AND company_id = $2', [house_id, company_id]);
    if (!owns.rows[0]) throw new Error('Service not found');

    // Check if a log already exists for today (scoped through the owning house).
    const existing = await query(
      `SELECT dgl.* FROM daily_governance_log dgl
         JOIN houses h ON h.id = dgl.house_id
        WHERE dgl.house_id = $1 AND dgl.review_date = $2 AND h.company_id = $3`,
      [house_id, today, company_id]
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO daily_governance_log (id, house_id, review_date, completed, review_type, company_id)
       VALUES ($1, $2, $3, false, 'Primary', $4) RETURNING *`,
      [id, house_id, today, company_id]
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
      exceptions_acknowledged?: boolean;
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

      // 1. Lock and validate the daily log — §6: scope through the owning house so a log
      //    from another tenant can never be completed (locks only the log row, not houses).
      const logRes = await client.query(
        `SELECT dgl.house_id, dgl.completed, dgl.review_date::text AS review_date FROM daily_governance_log dgl
           JOIN houses h ON h.id = dgl.house_id
          WHERE dgl.id = $1 AND h.company_id = $2 FOR UPDATE OF dgl`,
        [log_id, company_id]
      );
      if (!logRes.rows[0]) throw new Error('Governance log not found');
      if (logRes.rows[0].completed) throw new Error('This daily governance record is already signed off and is immutable.');
      house_id = logRes.rows[0].house_id;
      const governanceDate = String(logRes.rows[0].review_date).slice(0,10);

      let enhanced_oversight = false;
      let director_notified: Date | null = null;
      if (is_deputy_review && house_id) {
        const sig = await client.query(
          `SELECT COUNT(*) FROM governance_pulses WHERE company_id = $2 AND house_id = $1 AND entry_date = $3::date AND severity IN ('High','Critical')`,
          [house_id, company_id, governanceDate]
        );
        if (parseInt(sig.rows[0].count) > 0) { enhanced_oversight = true; director_notified = new Date(); }
      }

      const leadership = (opts.leadership_narrative || note || '').trim();
      const brief = (opts.team_brief || '').trim();
      material = opts.material_change !== false && brief.length > 0;
      if (!material && leadership.length < 10) throw new Error('Record a positive no-material-change declaration before publishing an empty brief.');

      // 3–5. Create each governance decision, its linked task/escalation, and update the
      // source status — all inside the same transaction. Any failure rolls the review back.
      // Collect the work that was allocated to a person so we can notify them post-commit.
      const allocations: { owner_id: string; title: string; kind: 'task' | 'escalation' | 'monitoring'; due_at?: string | null }[] = [];
      for (const d of (opts.decisions || [])) {
        const out: any = await this.createDecisionInTx(client, { company_id, user_id, log_id, house_id: house_id || null, decision: d });
        if (out && !out.idempotent && d.ownerId) {
          if (out.task) allocations.push({ owner_id: d.ownerId, title: out.task.title, kind: 'task', due_at: d.dueAt });
          else if (out.escalation && out.escalation.escalated_to === d.ownerId) allocations.push({ owner_id: d.ownerId, title: out.escalation.reason || d.actionDescription || d.reason || d.whatIsHappening || 'Escalation', kind: 'escalation', due_at: d.dueAt });
          else if (d.decision === 'Monitor') allocations.push({ owner_id: d.ownerId, title: d.whatIsHappening || d.reason || 'Governance monitoring', kind: 'monitoring', due_at: d.dueAt });
        }
      }

      // Mobile and web may record the RM decisions from the signal queue before the user opens
      // the publication form. Adopt those same-day, same-service decisions into this signed log
      // instead of leaving a parallel "standalone" history. Existing explicit log links win.
      await client.query(
        `UPDATE governance_reviews
            SET daily_governance_log_id=$1
          WHERE company_id=$2 AND service_id=$3
            AND review_type='RM_REVIEW'
            AND daily_governance_log_id IS NULL
            AND created_at::date=CURRENT_DATE`,
        [log_id, company_id, house_id]
      );

      // Authoritative readiness is evaluated after this request's decisions have been
      // applied, but before the log is marked complete. Counts are stored with the signed
      // log so the published position is reconstructable later.
      const readiness = (await client.query(
        `SELECT
          (SELECT COUNT(*)::int FROM governance_pulses p WHERE p.company_id=$1 AND p.house_id=$2 AND COALESCE(p.review_status::text,'New')='New'
             AND COALESCE(p.entry_date, p.created_at::date) = $3::date
             AND COALESCE(p.description,'') <> 'Scheduled Governance Pulse') AS unreviewed_signals,
          (SELECT COUNT(*)::int FROM canonical_escalation_state_v e LEFT JOIN risks er ON er.id=e.risk_id AND er.company_id=e.company_id
            WHERE e.company_id=$1 AND COALESCE(e.house_id,er.house_id)=$2 AND e.is_open) AS open_escalations,
          (SELECT COUNT(*)::int FROM canonical_action_state_v a LEFT JOIN risks ar ON ar.id=a.risk_id AND ar.company_id=a.company_id
            WHERE a.company_id=$1 AND COALESCE(a.house_id,ar.house_id)=$2 AND a.completed_at IS NOT NULL
              AND COALESCE(a.effectiveness_outcome,a.effectiveness::text) IS NULL) AS effectiveness_due`,
        [company_id, house_id, governanceDate]
      )).rows[0];
      // A day's sign-off requires only THAT day's signals to be decided. Signals dated for other
      // days (e.g. a generator seeding the week ahead) belong to their own daily review and must
      // not block today's publication.
      if (readiness.unreviewed_signals > 0) throw new Error(`Daily governance cannot be published: ${readiness.unreviewed_signals} signal(s) still require an RM decision.`);
      if ((readiness.open_escalations > 0 || readiness.effectiveness_due > 0) && !opts.exceptions_acknowledged) {
        throw new Error('Review and explicitly carry forward the open escalation/effectiveness exceptions before publishing.');
      }

      // Freeze the evidence actually known at sign-off. Weekly Governance and reports can
      // reconstruct the signed day without later edits/current-state joins rewriting history.
      const evidenceSnapshot = (await client.query(
        `SELECT jsonb_build_object(
          'signals', COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'id',p.id,'person',p.related_person,'domain',(p.risk_domain)[1],'description',p.description,
            'severity',p.severity,'reviewStatus',p.review_status,'created_at',p.created_at,
            'decision',(SELECT gr2.decision FROM governance_reviews gr2 WHERE gr2.company_id=p.company_id AND gr2.pulse_entry_id=p.id ORDER BY gr2.created_at DESC LIMIT 1),
            'decisionId',(SELECT gr2.id FROM governance_reviews gr2 WHERE gr2.company_id=p.company_id AND gr2.pulse_entry_id=p.id ORDER BY gr2.created_at DESC LIMIT 1)
          ) ORDER BY p.created_at) FROM governance_pulses p
            WHERE p.company_id=$1 AND p.house_id=$2 AND p.entry_date=$4::date), '[]'::jsonb),
          'decisions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'id',gr.id,'pulse_entry_id',gr.pulse_entry_id,'decision',gr.decision,
            'rationale',gr.decision_rationale,'created_at',gr.created_at
          ) ORDER BY gr.created_at) FROM governance_reviews gr
            WHERE gr.company_id=$1 AND gr.service_id=$2 AND gr.review_date=$4::date), '[]'::jsonb),
          'readiness', $3::jsonb,
          'provenance', jsonb_build_object('signals','governance_pulses only','governance_date',$4::date,'captured_at',NOW())
        ) AS snapshot`, [company_id, house_id, JSON.stringify(readiness), governanceDate])).rows[0]?.snapshot || {};

      const result = await client.query(
        `UPDATE daily_governance_log
         SET completed = true, daily_note = $1, reviewed_by = $2, completed_at = NOW(),
             is_deputy_review = $4, review_type = $5, escalation_sent = $6, director_alerted_at = $7,
             company_id = COALESCE(company_id, $8), leadership_narrative = $9,
             team_brief = $10, material_change = $11, published_at = NOW(), published_by = $2,
             exceptions_acknowledged = $12, exception_snapshot = $13::jsonb,
             evidence_snapshot = $14::jsonb
         WHERE id = $3 RETURNING *`,
        [note, user_id, log_id, is_deputy_review, is_deputy_review ? 'Deputy Cover' : 'Primary',
         enhanced_oversight, director_notified, company_id, leadership || null, brief || null, material,
         !!opts.exceptions_acknowledged, JSON.stringify(readiness), JSON.stringify(evidenceSnapshot)]
      );
      const log = result.rows[0];

      // 6. Commit only when every required step succeeded.
      await client.query('COMMIT');

      emitToCompany(company_id, 'governance.case.updated', {
        reason: 'daily_governance_published', log_id, house_id,
      });

      // 6b. Notify each person work was allocated to (post-commit, best-effort), so a
      // Monitor/Create Action decision reaches their My Work AND pings them — matching the
      // standalone-decision path. Previously only Escalate notified anyone.
      if (allocations.length) {
        try {
          const { notificationsService } = await import('./notifications.service');
          for (const a of allocations) {
            await notificationsService.create({
              company_id, user_id: a.owner_id,
              type: a.kind === 'escalation' ? 'escalation_assigned' : a.kind === 'monitoring' ? 'monitoring_assigned' : 'task_assigned',
              title: a.kind === 'escalation' ? 'Escalation assigned to you' : a.kind === 'monitoring' ? 'Governance monitoring assigned to you' : 'Governance action assigned to you',
              body: `${a.title}${a.due_at ? ` · due ${new Date(a.due_at).toLocaleDateString('en-GB')}` : ''}`,
              link: a.kind === 'escalation' ? '/escalation-log' : a.kind === 'monitoring' ? '/governance-dashboard' : '/my-actions',
            });
          }
        } catch { /* best-effort */ }
      }

      // 7. Notifications (post-commit, best-effort) — publish the brief to Team Leaders.
      if (material && house_id) {
        try {
          const { notificationsService } = await import('./notifications.service');
          const tls = await query(
            `SELECT DISTINCT u.id FROM users u JOIN user_houses uh ON uh.user_id = u.id
              WHERE uh.house_id = $1 AND u.status = 'active'
                AND (u.role IN ('TEAM_LEADER','TL')
                     OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = 'TEAM_LEADER'))`,
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
  // Same-day addendum (doctrine §9.2): a signal that arrives AFTER the primary review is signed
  // is decided and captured here, in an append-only record linked to the parent log. The signed
  // primary log is never modified. A "safe carry-forward" addendum records a reason and no
  // decisions; a material addendum records decisions through the SAME canonical executor as the
  // primary review (so a decision is never recorded without its downstream record).
  async addAddendum(
    log_id: string,
    opts: { company_id: string; user_id: string; reason: string; evidence_ids?: string[]; decisions?: DecisionInput[] }
  ) {
    const { company_id, user_id } = opts;
    const reason = String(opts.reason || '').trim();
    if (reason.length < 10) throw new Error('An addendum requires a reason (at least 10 characters).');
    const client = await getClient();
    try {
      await client.query('BEGIN');
      // Lock only the parent log row; confirm tenant ownership and that it is signed.
      const logRes = await client.query(
        `SELECT dgl.id, dgl.house_id, dgl.completed, dgl.review_date::text AS review_date
           FROM daily_governance_log dgl JOIN houses h ON h.id = dgl.house_id
          WHERE dgl.id = $1 AND h.company_id = $2 FOR UPDATE OF dgl`,
        [log_id, company_id]
      );
      const parent = logRes.rows[0];
      if (!parent) throw new Error('Governance log not found');
      if (!parent.completed) {
        throw new Error('The primary review for this day is not yet signed. Record same-day decisions in the primary review; addenda apply only after sign-off.');
      }

      const applied: any[] = [];
      for (const d of (opts.decisions || [])) {
        await this.createDecisionInTx(client, { company_id, user_id, log_id, house_id: parent.house_id, decision: d });
        applied.push({ decision: d.decision, subject: d.sourceId || d.pulse_entry_id || d.risk_id || d.cluster_id || null });
      }

      const seqRes = await client.query(
        `SELECT COALESCE(MAX(sequence), 0) + 1 AS seq FROM daily_governance_addendum WHERE parent_log_id = $1`,
        [log_id]
      );
      const sequence = seqRes.rows[0].seq;
      const evidenceIds = Array.isArray(opts.evidence_ids) ? opts.evidence_ids.filter(Boolean) : [];
      const ins = await client.query(
        `INSERT INTO daily_governance_addendum
           (company_id, house_id, parent_log_id, sequence, review_date, reason, evidence_ids, decisions_summary, created_by)
         VALUES ($1, $2, $3, $4, $5::date, $6, $7::uuid[], $8::jsonb, $9) RETURNING *`,
        [company_id, parent.house_id, log_id, sequence, parent.review_date, reason, evidenceIds, JSON.stringify(applied), user_id]
      );
      await client.query('COMMIT');
      return ins.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async listAddenda(company_id: string, log_id: string) {
    const r = await query(
      `SELECT a.* FROM daily_governance_addendum a JOIN houses h ON h.id = a.house_id
        WHERE a.parent_log_id = $1 AND h.company_id = $2 ORDER BY a.sequence`,
      [log_id, company_id]
    );
    return r.rows;
  }

  private async createDecisionInTx(client: PoolClient, ctx: { company_id: string; user_id: string; log_id: string; house_id: string | null; decision: DecisionInput }) {
    const { company_id, user_id, log_id, house_id } = ctx;
    const d = ctx.decision;
    const pulse_entry_id = d.pulse_entry_id || (d.sourceType === 'signal' ? d.sourceId : null) || null;
    const cluster_id = d.cluster_id || (d.sourceType === 'pattern' ? d.sourceId : null) || null;
    const risk_id = d.risk_id || (d.sourceType === 'risk' ? d.sourceId : null) || null;
    const what = (d.whatIsHappening || d.actionDescription || d.reason || '').trim();
    if (!what) throw new Error('Each decision needs a description.');

    // §2 — Daily Governance decisions run through the SAME executor as standalone decisions,
    // so a decision is never "recorded" without its downstream record (task / escalation /
    // risk / closure) being created in the same transaction, with identical idempotency.
    return await governanceDecisionsService.executeInTx(client, {
      company_id, user_id, daily_governance_log_id: log_id, house_id,
      pulse_entry_id, cluster_id, risk_id,
      what_is_happening: what, decision: d.decision as any,
      owner_id: d.ownerId || null, due_at: d.dueAt || null,
      intended_outcome: d.intendedOutcome || null, action_description: d.actionDescription || null,
      decision_rationale: d.reason || null,
      severity: d.severity,
      idempotency_key: d.idempotencyKey || null,
    } as any);
  }

  async readiness(company_id: string, house_id: string) {
    const row = (await query(`SELECT
      (SELECT COUNT(*)::int FROM governance_pulses p WHERE p.company_id=$1 AND p.house_id=$2 AND COALESCE(p.review_status::text,'New')='New'
         AND COALESCE(p.entry_date, p.created_at::date) = CURRENT_DATE
         AND COALESCE(p.description,'') <> 'Scheduled Governance Pulse') AS unreviewed_signals,
      (SELECT COUNT(*)::int FROM canonical_escalation_state_v e LEFT JOIN risks er ON er.id=e.risk_id AND er.company_id=e.company_id
        WHERE e.company_id=$1 AND COALESCE(e.house_id,er.house_id)=$2 AND e.is_open) AS open_escalations,
      (SELECT COUNT(*)::int FROM canonical_action_state_v a LEFT JOIN risks ar ON ar.id=a.risk_id AND ar.company_id=a.company_id
        WHERE a.company_id=$1 AND COALESCE(a.house_id,ar.house_id)=$2 AND a.completed_at IS NOT NULL
          AND COALESCE(a.effectiveness_outcome,a.effectiveness::text) IS NULL) AS effectiveness_due`, [company_id,house_id])).rows[0];
    return { ...row, can_sign_off: Number(row.unreviewed_signals||0)===0,
      requires_exception_acknowledgement: Number(row.open_escalations||0)>0 || Number(row.effectiveness_due||0)>0 };
  }

  /** Canonical daily evidence snapshot used by Daily/Weekly Governance reconstruction. */
  async canonicalSnapshot(company_id: string, house_id: string, review_date: string) {
    const signals = (await query(`SELECT gp.id,gp.entry_date,gp.created_at,gp.related_person,gp.description,gp.risk_domain,gp.severity,gp.review_status
      FROM governance_pulses gp WHERE gp.company_id=$1 AND gp.house_id=$2 AND gp.entry_date=$3::date
      ORDER BY COALESCE(gp.created_at,gp.entry_date::timestamptz),gp.id`, [company_id,house_id,review_date])).rows;
    const signalIds = signals.map((x:any)=>x.id);
    const decisions = (await query(`SELECT gr.id,gr.pulse_entry_id,gr.decision,gr.decision_status,gr.what_is_happening,gr.decision_rationale,gr.created_at,gr.due_at,gr.decision_owner_id
      FROM governance_reviews gr WHERE gr.company_id=$1 AND gr.service_id=$2
        AND (gr.review_date=$3::date OR ($4::uuid[] <> '{}' AND gr.pulse_entry_id=ANY($4::uuid[])))
      ORDER BY gr.created_at`, [company_id,house_id,review_date,signalIds])).rows;
    const decisionIds=decisions.map((x:any)=>x.id);
    const actions=(await query(`SELECT ra.id,ra.source_pulse_id,ra.governance_review_id,ra.title,ra.status,ra.assigned_to,ra.due_date,ra.completed_at,ra.completion_evidence,ra.effectiveness_outcome,ra.effectiveness,ra.effectiveness_reviewed_at
      FROM canonical_action_state_v ra WHERE ra.company_id=$1 AND ra.house_id=$2
        AND (($3::uuid[] <> '{}' AND ra.source_pulse_id=ANY($3::uuid[])) OR ($4::uuid[] <> '{}' AND ra.governance_review_id=ANY($4::uuid[])))
      ORDER BY ra.created_at`,[company_id,house_id,signalIds,decisionIds])).rows;
    const escalations=(await query(`SELECT e.id,e.source_pulse_id,e.source_governance_review_id,e.reason,e.lifecycle_status,e.status,e.due_by,e.created_at
      FROM canonical_escalation_state_v e WHERE e.company_id=$1 AND e.house_id=$2
        AND (($3::uuid[] <> '{}' AND e.source_pulse_id=ANY($3::uuid[])) OR ($4::uuid[] <> '{}' AND e.source_governance_review_id=ANY($4::uuid[])))
      ORDER BY e.created_at`,[company_id,house_id,signalIds,decisionIds])).rows;
    const log=(await query(`SELECT id,review_date,team_brief,material_change,completed,published_at,exceptions_acknowledged,exception_snapshot
      FROM daily_governance_log WHERE company_id=$1 AND house_id=$2 AND review_date=$3::date ORDER BY created_at DESC LIMIT 1`,
      [company_id,house_id,review_date])).rows[0]||null;
    return { review_date, house_id, signals, decisions, actions, escalations, log,
      provenance:{ signals:'governance_pulses only', lineage:'direct daily signal/decision links', generated_at:new Date().toISOString() } };
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
          AND h.company_id = $2
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
  async recentTeamBriefs(company_id: string, house_ids: string[], user_id: string, from?: string, to?: string) {
    if (!house_ids.length) return [];
    // Date scope: with no explicit range the inbox shows a rolling recent window (14 days); when
    // the Team Leader picks a From/To range it becomes a true by-date archive with no 14-day cap,
    // so any historical signed-off brief can be retrieved.
    const dateClause = (from || to)
      ? `${from ? `AND dgl.review_date >= $4::date` : ''} ${to ? `AND dgl.review_date <= $${from ? 5 : 4}::date` : ''}`
      : `AND dgl.review_date >= CURRENT_DATE - INTERVAL '14 days'`;
    const dateParams: string[] = [];
    if (from) dateParams.push(from);
    if (to) dateParams.push(to);
    // Read-only presentation enrichment for the Team Leader Daily Brief view. Additive only —
    // no lifecycle change and no new table. Each brief carries: the governance decisions recorded
    // in that review (priorities), and the service's currently-active actions/escalations
    // (operational "requires attention"), plus who prepared it and the acknowledgement.
    const res = await query(
      `SELECT dgl.id, dgl.house_id, h.name AS house_name, dgl.team_brief, dgl.material_change,
              dgl.published_at, dgl.review_date,
              NULLIF(TRIM(COALESCE(pu.first_name,'') || ' ' || COALESCE(pu.last_name,'')), '') AS prepared_by,
              (a.id IS NOT NULL) AS acknowledged,
              a.acknowledged_at AS acknowledged_at,
              NULLIF(TRIM(COALESCE(acu.first_name,'') || ' ' || COALESCE(acu.last_name,'')), '') AS acknowledged_by,
              (SELECT COALESCE(json_agg(json_build_object(
                        'id', gr.id, 'decision', gr.decision, 'title', gr.what_is_happening,
                        'instruction', COALESCE(NULLIF(gr.intended_outcome,''), gr.evidence),
                        'owner', NULLIF(TRIM(COALESCE(ou.first_name,'') || ' ' || COALESCE(ou.last_name,'')), ''),
                        'dueLabel', gr.due_at, 'status', gr.decision_status
                      ) ORDER BY gr.created_at), '[]'::json)
                 FROM governance_reviews gr
                 LEFT JOIN users ou ON ou.id = gr.decision_owner_id
                WHERE gr.daily_governance_log_id = dgl.id) AS priorities,
              (SELECT COALESCE(json_agg(json_build_object(
                        'id', ra.id, 'title', ra.title,
                        'owner', NULLIF(TRIM(COALESCE(au.first_name,'') || ' ' || COALESCE(au.last_name,'')), ''),
                        'dueDate', ra.due_date, 'completionEvidence', ra.completion_evidence
                      ) ORDER BY ra.due_date NULLS LAST), '[]'::json)
                 FROM canonical_action_state_v ra
                 LEFT JOIN users au ON au.id = ra.assigned_to
                WHERE ra.house_id = dgl.house_id AND ra.company_id = $2
                  AND ra.is_open) AS actions,
              (SELECT COALESCE(json_agg(json_build_object(
                        'id', e.id, 'title', e.reason,
                        'owner', NULLIF(TRIM(COALESCE(eu.first_name,'') || ' ' || COALESCE(eu.last_name,'')), ''),
                        'responseDue', e.due_by
                      ) ORDER BY e.created_at DESC), '[]'::json)
                 FROM canonical_escalation_state_v e
                 LEFT JOIN users eu ON eu.id = e.escalated_to
                WHERE e.house_id = dgl.house_id AND e.company_id = $2
                  AND e.is_open) AS escalations
         FROM daily_governance_log dgl
         JOIN houses h ON h.id = dgl.house_id
         LEFT JOIN users pu ON pu.id = dgl.published_by
         LEFT JOIN daily_brief_acknowledgements a ON a.log_id = dgl.id AND a.user_id = $3
         LEFT JOIN users acu ON acu.id = a.user_id
        WHERE dgl.house_id = ANY($1::uuid[])
          AND h.company_id = $2
          AND dgl.completed = true
          ${dateClause}
        ORDER BY dgl.published_at DESC NULLS LAST, dgl.review_date DESC
        LIMIT 200`,
      [house_ids, company_id, user_id, ...dateParams]
    );
    return res.rows;
  }

  async acknowledgeBrief(log_id: string, user_id: string, company_id: string) {
    // §6 — only acknowledge a brief that belongs to the caller's company.
    const owns = await query(
      `SELECT 1 FROM daily_governance_log dgl JOIN houses h ON h.id = dgl.house_id
        WHERE dgl.id = $1 AND h.company_id = $2 AND dgl.completed=true
          AND EXISTS (SELECT 1 FROM user_houses uh WHERE uh.user_id=$3 AND uh.house_id=dgl.house_id)`,
      [log_id, company_id, user_id]
    );
    if (!owns.rows[0]) throw new Error('Brief not found');
    await query(
      `INSERT INTO daily_brief_acknowledgements (log_id, company_id, user_id)
       VALUES ($1, $2, $3) ON CONFLICT (log_id, user_id) DO NOTHING`,
      [log_id, company_id, user_id]
    );
    return { acknowledged: true };
  }

  // §Historical playback — the stored, signed-off governance log for one service on one date,
  // company-scoped through the owning house. Returns null if nothing was recorded that day.
  async logForDate(company_id: string, house_id: string, date: string) {
    const res = await query(
      `SELECT dgl.id, dgl.house_id, h.name AS house_name, dgl.review_date, dgl.completed,
              dgl.leadership_narrative, dgl.team_brief, dgl.material_change, dgl.daily_note,
              dgl.published_at, dgl.completed_at,
              pb.first_name || ' ' || pb.last_name AS published_by_name,
              rv.first_name || ' ' || rv.last_name AS reviewed_by_name
         FROM daily_governance_log dgl
         JOIN houses h ON h.id = dgl.house_id
         LEFT JOIN users pb ON pb.id = dgl.published_by
         LEFT JOIN users rv ON rv.id = dgl.reviewed_by
        WHERE dgl.house_id = $1 AND dgl.review_date = $2 AND h.company_id = $3
        LIMIT 1`,
      [house_id, date, company_id]
    );
    return res.rows[0] || null;
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
