import { query, getClient } from '../config/database';
import { risksService } from './risks.service';
import { risksRepo } from '../repositories/risks.repo';
import logger from '../utils/logger';
import { reviewObligationsService } from './reviewObligations.service';
import { trajectoryForRisk } from './trajectory.service';
import { EffectivenessOutcome, normalizeEffectiveness, toLegacyEffectiveness } from '../domain/effectiveness';
import { canonicalActionDomainSql } from '../domain/governanceDomain';
import { governancePropagationService } from './governancePropagation.service';
import { escalationLifecycleService } from './escalationLifecycle.service';
import { v4 as uuidv4 } from 'uuid';
import { canonicalReportingService } from './canonicalReporting.service';
import { eventBus, EVENTS } from '../events/eventBus';

export type { EffectivenessOutcome } from '../domain/effectiveness';

export class ActionEffectivenessService {
  async rateEffectiveness(
    actionId: string,
    company_id: string,
    userId: string,
    data: { outcome?: EffectivenessOutcome; effectiveness?: 'Effective' | 'Neutral' | 'Ineffective'; evidence?: string; note?: string; intended_outcome?: string; next_review_date?: string; early_review_reason?: string; evidence_still_needed?: string; scheduled_review_at_seen?: string }
  ) {
    const action = await risksRepo.getActionById(actionId, company_id);
    if (!action) throw new Error('Action not found');
    if (action.review_requirement === 'COMPLETION_ONLY') {
      throw new Error('Governance Block: this action is completion-only and does not require an effectiveness rating.');
    }
    if (!action.review_requirement) {
      throw new Error('Governance Block: legacy action is not classified. Record historical evidence remediation before rating effectiveness.');
    }

    if (action.status !== 'Completed') {
      throw new Error('Governance Block: Effectiveness can only be rated for Completed actions.');
    }

    // Resolve the governance outcome from either the new or legacy field.
    const outcome = normalizeEffectiveness(data.outcome || data.effectiveness);
    if (!outcome) throw new Error('An effectiveness outcome is required.');

    const evidence = data.evidence || data.note;
    if (outcome !== 'Too Early To Assess' && (!evidence || evidence.trim().length < 20)) {
      throw new Error('Evidence (at least 20 characters) is required for an effectiveness review.');
    }
    // A verdict must be rated against what was actually done and what was expected. The server
    // independently refuses a rating where either is missing — the UI cannot bypass this.
    if (!action.completion_evidence && !action.completion_rationale && !action.completion_note) {
      throw new Error('Governance Block: completion evidence is missing. Return the action for completion notes before rating effectiveness.');
    }
    const intendedOutcome = String(action.intended_outcome || '').trim();
    if (intendedOutcome.length < 10) {
      throw new Error('Governance Block: record the intended outcome before rating effectiveness.');
    }

    // Early timing is DERIVED on the server: compare the authoritative existing schedule (the open
    // effectiveness obligation's due date, falling back to the action's effectiveness_due_at) with the
    // server review time. A browser-sent flag is never trusted. No schedule → not early (the fact is
    // recorded, not invented).
    const schedRow = (await query(
      `SELECT due_at FROM canonical_review_obligation_state_v
        WHERE company_id = $1 AND subject_id = $2 AND obligation_type = 'ACTION_EFFECTIVENESS' AND status = 'OPEN'
        ORDER BY due_at ASC LIMIT 1`,
      [company_id, actionId]
    )).rows[0];
    const scheduledReviewAt: Date | null = schedRow?.due_at ? new Date(schedRow.due_at)
      : (action.effectiveness_due_at ? new Date(action.effectiveness_due_at) : null);
    const isEarlyReview = !!scheduledReviewAt && !Number.isNaN(scheduledReviewAt.getTime()) && Date.now() < scheduledReviewAt.getTime();
    // Reject a stale submission — the schedule moved after this form was opened.
    if (data.scheduled_review_at_seen && scheduledReviewAt) {
      const seen = new Date(data.scheduled_review_at_seen).getTime();
      if (Number.isFinite(seen) && Math.abs(seen - scheduledReviewAt.getTime()) > 60000) {
        throw new Error('The review schedule changed after this form was opened. Reload the action and review again.');
      }
    }
    const earlyReviewReason = isEarlyReview ? (String(data.early_review_reason || '').trim() || null) : null;
    if (isEarlyReview && (!earlyReviewReason || earlyReviewReason.length < 10)) {
      throw new Error('This review is before the scheduled date — record why you are reviewing early (at least 10 characters).');
    }
    const evidenceStillNeeded = outcome === 'Too Early To Assess' ? (String(data.evidence_still_needed || '').trim() || null) : null;

    const legacy = toLegacyEffectiveness(outcome);
    let nextReviewDate: Date | null = null;
    if (data.next_review_date) {
      nextReviewDate = new Date(`${data.next_review_date}T00:00:00.000Z`);
      if (Number.isNaN(nextReviewDate.getTime()) || nextReviewDate.getTime() <= Date.now()) {
        throw new Error('The next review date must be in the future.');
      }
    } else if (outcome === 'Too Early To Assess') {
      throw new Error('Too Early to Assess requires a future review date.');
    }

    // E1 (reports/evidence brief): the latest-position update and the permanent history insert MUST
    // be atomic — both succeed or neither saves — so a report can never show a current rating with no
    // supporting history (or history with a stale current position). A double-submit within a few
    // seconds (retry / double-click) is treated as the same review and does not insert twice.
    const reviewId = uuidv4();
    const client = await getClient();
    let updatedAction: any;
    try {
      await client.query('BEGIN');

      const dup = await client.query(
        `SELECT 1 FROM action_effectiveness_reviews
          WHERE company_id = $1 AND action_id = $2 AND reviewed_by = $3 AND outcome = $4
            AND reviewed_at > NOW() - INTERVAL '10 seconds' LIMIT 1`,
        [company_id, actionId, userId, outcome]
      );
      if (dup.rows[0]) {
        await client.query('ROLLBACK');
        logger.info(`Effectiveness review for action ${actionId} ignored as a duplicate submission.`);
        return await risksRepo.getActionById(actionId, company_id);
      }

      const result = await client.query(
        `UPDATE risk_actions
         SET effectiveness_outcome = $1,
             -- Keep the legacy compatibility field in lock-step. Too Early maps to NULL and must
             -- clear a previous directional value rather than leaving a stale Effective result.
             effectiveness = $2,
             effectiveness_evidence = COALESCE($3, effectiveness_evidence),
             effectiveness_reviewed_by = $4,
             effectiveness_reviewed_at = NOW(),
             verification_notes = COALESCE($3, verification_notes),
             -- $7 (intended_outcome) must be referenced in a typed column context; otherwise Postgres
             -- cannot infer its type and rejects the whole statement ("could not determine data type of
             -- parameter $7"). COALESCE preserves the existing intended outcome when none is supplied.
             intended_outcome = COALESCE($7, intended_outcome),
             effectiveness_due_at = $8
         WHERE id = $5 AND company_id = $6 RETURNING *`,
        [outcome, legacy, evidence, userId, actionId, company_id, intendedOutcome, nextReviewDate]
      );
      updatedAction = result.rows[0];
      if (!updatedAction) throw new Error('Action not found');

      await client.query(
        `INSERT INTO action_effectiveness_reviews
          (id, company_id, action_id, outcome, intended_outcome, evidence, reviewed_by, reviewed_at, next_review_date,
           scheduled_review_at_snapshot, is_early_review, early_review_reason, evidence_still_needed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9,$10,$11,$12)`,
        [reviewId, company_id, actionId, outcome, intendedOutcome, evidence || null, userId, nextReviewDate,
         scheduledReviewAt, isEarlyReview, earlyReviewReason, evidenceStillNeeded],
      );

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e; // A failed save reports a clear error and leaves nothing partially written.
    } finally {
      client.release();
    }
    logger.info(`Action ${actionId} rated as ${outcome} by ${userId}`);

    // Downstream propagation and delivery run AFTER the review is durably committed. A failure here
    // must NOT lose the saved review or report the save as failed (brief: "retain saved reviews if
    // notification delivery fails and retry delivery separately"). Each is best-effort and logged.
    try {
      await escalationLifecycleService.syncForAction(actionId, company_id);

      // Trigger trajectory pipeline (only when the outcome maps to a directional signal).
      if (legacy && updatedAction.risk_id) await risksService.updateTrajectoryFromActions(updatedAction.risk_id, company_id);

      await reviewObligationsService.complete(company_id, 'ACTION_EFFECTIVENESS', actionId, userId, `Effectiveness recorded: ${outcome}`);
      if (outcome === 'Too Early To Assess') {
        await reviewObligationsService.open({
          companyId: company_id, type: 'ACTION_EFFECTIVENESS', subjectType: 'ACTION', subjectId: actionId,
          actionId, riskId: updatedAction.risk_id || null,
          dueAt: nextReviewDate!,
          ownerRole: 'REGISTERED_MANAGER', reason: 'Effectiveness was too early to assess; repeat the review with further evidence.',
        });
      } else {
        // One propagation service updates every explicitly linked oversight surface. It opens review
        // obligations; it never automatically closes an escalation, intervention or risk.
        await governancePropagationService.afterEffectiveness({
          companyId: company_id, actionId, riskId: updatedAction.risk_id || null,
          outcome, actorId: userId,
        });
        // A control rated Not Effective / Partially Effective is not the end: when the RM sets a date to
        // come back and re-check whether the (revised) control now works, schedule that re-review so it
        // returns to the work queue on that date.
        if (nextReviewDate && (outcome === 'Not Effective' || outcome === 'Partially Effective')) {
          await reviewObligationsService.open({
            companyId: company_id, type: 'ACTION_EFFECTIVENESS', subjectType: 'ACTION', subjectId: actionId,
            actionId, riskId: updatedAction.risk_id || null, dueAt: nextReviewDate, ownerRole: 'REGISTERED_MANAGER',
            reason: outcome === 'Not Effective'
              ? 'Control rated Not Effective — re-review at the set date to confirm the revised control works.'
              : 'Control partially effective — re-review at the set date.',
          });
        }
      }

      await eventBus.emitEvent(EVENTS.ACTION_EFFECTIVENESS_REVIEWED, {
        company_id, action_id: actionId, risk_id: updatedAction.risk_id || null,
        review_id: reviewId, outcome, reviewed_by: userId,
      }, { idempotencyKey: `action-effectiveness:${reviewId}` });
    } catch (e) {
      logger.error(`Effectiveness review ${reviewId} saved, but downstream propagation/delivery failed; the review is retained for retry.`, e as Error);
    }

    // Expose the exact saved review id so the learning step can link the lesson to THIS review,
    // not just the originating action (developer review §2). Non-breaking: callers that read the
    // action fields still find them; the new property is additive.
    return { ...updatedAction, review_id: reviewId };
  }

  async getPendingEffectiveness(company_id: string, house_id?: string) {
    // Risk-linked completed actions still awaiting an effectiveness verdict. Same predicate as the
    // My Work / pipeline counts (completed_at IS NOT NULL AND effectiveness_outcome IS NULL) so the
    // list matches the count. The fixed 48-hour assumption is removed (doctrine): an action is due a
    // verdict as soon as it is completed — the RM schedules the actual review date.
    const domain = canonicalActionDomainSql({ action: 'ra', risk: 'r', cluster: 'sc', pulse: 'p' });
    let sql = `
      SELECT ra.*, COALESCE(h.name, 'Organisation-wide') as house_name,
             r.title as risk_title, r.description AS risk_description,
             ${domain} AS governance_domain,
             p.description AS source_signal_description, p.immediate_action AS source_immediate_action,
             p.related_person AS source_person, p.created_at AS source_signal_at,
             e.reason AS source_escalation_reason, e.created_at AS source_escalation_at,
             cb.first_name || ' ' || cb.last_name AS completed_by_name,
             ab.first_name || ' ' || ab.last_name AS assigned_by_name,
             au.first_name || ' ' || au.last_name AS assigned_to_name,
             gro.due_at AS review_due_at, (gro.due_at < NOW()) AS review_overdue
      FROM canonical_action_state_v ra
      LEFT JOIN canonical_risk_state_v r ON r.id = ra.risk_id AND r.company_id=ra.company_id
      LEFT JOIN signal_clusters sc ON sc.id=ra.source_cluster_id AND sc.company_id=ra.company_id
      LEFT JOIN governance_pulses p ON p.id=ra.source_pulse_id AND p.company_id=ra.company_id
      LEFT JOIN escalations e ON e.id=ra.escalation_id AND e.company_id=ra.company_id
      LEFT JOIN houses h ON h.id = COALESCE(ra.house_id, r.house_id)
      LEFT JOIN users cb ON cb.id=ra.completed_by
      LEFT JOIN users ab ON ab.id=ra.created_by
      LEFT JOIN users au ON au.id=ra.assigned_to
      LEFT JOIN canonical_review_obligation_state_v gro
        ON gro.company_id=ra.company_id AND gro.subject_id=ra.id
       AND gro.obligation_type='ACTION_EFFECTIVENESS' AND gro.status='OPEN'
      WHERE ra.company_id = $1
      AND ra.id::text IN (
        SELECT evidence_id FROM canonical_material_count_v
         WHERE company_id = $1 AND count_type = 'EFFECTIVENESS_REVIEW'
      )
    `;
    const params: any[] = [company_id];

    if (house_id) {
      sql += ` AND COALESCE(ra.house_id, r.house_id) = $2`;
      params.push(house_id);
    }

    sql += ` ORDER BY ra.completed_at ASC`;
    const res = await query(sql, params);
    // Each pending action carries one evidence packet: why it existed, what was expected, what was
    // actually done, and what happened to the risk afterwards — so the RM rates against evidence,
    // not a bare title. review_ready gates the rating controls; missing[] states what is absent.
    return Promise.all(res.rows.map((action: any) => this.toRatingRow(action)));
  }

  // The joined row for one rateable action (pending OR scheduled). Shared so an early review of a
  // scheduled reassessment is presented from exactly the same evidence packet as a due review.
  private readonly RATING_JOINS = `
      FROM canonical_action_state_v ra
      LEFT JOIN canonical_risk_state_v r ON r.id = ra.risk_id AND r.company_id=ra.company_id
      LEFT JOIN signal_clusters sc ON sc.id=ra.source_cluster_id AND sc.company_id=ra.company_id
      LEFT JOIN governance_pulses p ON p.id=ra.source_pulse_id AND p.company_id=ra.company_id
      LEFT JOIN escalations e ON e.id=ra.escalation_id AND e.company_id=ra.company_id
      LEFT JOIN houses h ON h.id = COALESCE(ra.house_id, r.house_id)
      LEFT JOIN users cb ON cb.id=ra.completed_by
      LEFT JOIN users ab ON ab.id=ra.created_by
      LEFT JOIN users au ON au.id=ra.assigned_to
      LEFT JOIN canonical_review_obligation_state_v gro
        ON gro.company_id=ra.company_id AND gro.subject_id=ra.id
       AND gro.obligation_type='ACTION_EFFECTIVENESS' AND gro.status='OPEN'`;

  private ratingSelectColumns() {
    const domain = canonicalActionDomainSql({ action: 'ra', risk: 'r', cluster: 'sc', pulse: 'p' });
    return `ra.*, COALESCE(h.name, 'Organisation-wide') as house_name,
             r.title as risk_title, r.description AS risk_description,
             ${domain} AS governance_domain,
             p.description AS source_signal_description, p.immediate_action AS source_immediate_action,
             p.related_person AS source_person, p.created_at AS source_signal_at,
             e.reason AS source_escalation_reason, e.created_at AS source_escalation_at,
             cb.first_name || ' ' || cb.last_name AS completed_by_name,
             ab.first_name || ' ' || ab.last_name AS assigned_by_name,
             au.first_name || ' ' || au.last_name AS assigned_to_name,
             gro.due_at AS review_due_at, (gro.due_at < NOW()) AS review_overdue`;
  }

  // Resolve ONE action's rating payload for an early review or a focus deep-link, across both the
  // due (pending) and scheduled (future) states. Returns null when not found / not authorised, or an
  // { ineligible } marker when the action is not a completed effectiveness-bearing action.
  async getEffectivenessForAction(company_id: string, actionId: string) {
    const res = await query(
      `SELECT ${this.ratingSelectColumns()} ${this.RATING_JOINS}
        WHERE ra.company_id = $1 AND ra.id = $2`,
      [company_id, actionId],
    );
    const action = res.rows[0];
    if (!action) return null;
    if (action.review_requirement !== 'EFFECTIVENESS_REQUIRED' || !action.is_completed) {
      return { ineligible: true, reason: 'This action is not a completed action that requires an effectiveness review.' };
    }
    const row = await this.toRatingRow(action);
    const scheduledAt = action.review_due_at || null;
    const isScheduled = !!scheduledAt && new Date(scheduledAt).getTime() > Date.now();
    return { ...row, scheduled_review_at: scheduledAt, is_scheduled: isScheduled, is_due: !!scheduledAt && !isScheduled };
  }

  private async toRatingRow(action: any) {
      let trajectory: any = null;
      if (action.risk_id) {
        try { trajectory = await trajectoryForRisk(action.risk_id, action.source_cluster_id || null); }
        catch { trajectory = null; }
      }
      const hasSource = !!(action.risk_id || action.source_pulse_id || action.source_cluster_id || action.escalation_id || action.governance_review_id);
      const hasCompletionEvidence = !!String(action.completion_evidence || action.completion_rationale || action.completion_note || '').trim();
      return {
        ...action,
        evidence_packet: {
          source: {
            kind: action.escalation_id ? 'Escalation' : action.risk_id ? 'Risk' : action.source_pulse_id ? 'Signal' : action.source_cluster_id ? 'Pattern' : 'Governance action',
            risk_title: action.risk_title || null,
            risk_description: action.risk_description || null,
            escalation_reason: action.source_escalation_reason || null,
            signal_description: action.source_signal_description || null,
            immediate_action: action.source_immediate_action || null,
            person: action.source_person || null,
            domain: action.governance_domain || null,
          },
          expected: { instruction: action.description || action.title, intended_outcome: action.intended_outcome || null, due_date: action.due_date || null },
          completion: {
            outcome: action.completion_outcome || null,
            rationale: action.completion_evidence || action.completion_rationale || null,
            note: action.completion_note || null,
            completed_by: action.completed_by_name || null,
            completed_at: action.completed_at || null,
          },
          after: trajectory ? {
            direction: trajectory.direction,
            basis: trajectory.basis,
            previous_14d_signals: trajectory.evidence?.previous14DaySignals ?? null,
            current_14d_signals: trajectory.evidence?.current14DaySignals ?? null,
            previous_14d_burden: trajectory.evidence?.previous14DayWeight ?? null,
            current_14d_burden: trajectory.evidence?.current14DayWeight ?? null,
          } : null,
          review_ready: hasSource && hasCompletionEvidence,
          requires_expected_outcome: !String(action.intended_outcome || '').trim(),
          missing: [!hasSource ? 'No originating signal, pattern, escalation or risk is linked.' : null,
                    !hasCompletionEvidence ? 'Completion notes/evidence are missing.' : null,
                    !String(action.intended_outcome || '').trim() ? 'The intended outcome must be recorded during this review.' : null].filter(Boolean),
        },
      };
  }

  // Scheduled (future) effectiveness reassessments — effectiveness-bearing completed actions whose
  // next review is set but not yet due. Shown as scheduled work with its date (never counted as
  // "due", never silently treated as complete). They return to the due list automatically on the day.
  async getScheduledEffectiveness(company_id: string, house_id?: string) {
    const params: any[] = [company_id];
    let houseClause = '';
    if (house_id) { params.push(house_id); houseClause = ` AND COALESCE(ra.house_id, r.house_id) = $2`; }
    return (await query(
      `SELECT ra.id, ra.title, ra.risk_id, ra.effectiveness_outcome,
              COALESCE(h.name, 'Organisation-wide') AS house_name,
              r.title AS risk_title, g.due_at AS next_review_at
         FROM canonical_action_state_v ra
         JOIN canonical_review_obligation_state_v g
           ON g.company_id = ra.company_id AND g.subject_id = ra.id
          AND g.obligation_type = 'ACTION_EFFECTIVENESS' AND g.status = 'OPEN' AND NOT g.is_due
         LEFT JOIN canonical_risk_state_v r ON r.id = ra.risk_id AND r.company_id = ra.company_id
         LEFT JOIN houses h ON h.id = COALESCE(ra.house_id, r.house_id)
        WHERE ra.company_id = $1
          AND ra.review_requirement = 'EFFECTIVENESS_REQUIRED' AND ra.is_completed
          AND ra.id::text NOT IN (SELECT evidence_id FROM canonical_material_count_v
                                   WHERE company_id = $1 AND count_type = 'EFFECTIVENESS_REVIEW')
          ${houseClause}
        ORDER BY g.due_at ASC`,
      params,
    )).rows;
  }

  async getLegacyEvidenceGaps(company_id:string){
    return (await query(`SELECT ra.id,ra.title,ra.description,ra.status,ra.completed_at,ra.completion_evidence,
      ra.completion_rationale,ra.completion_note,ra.intended_outcome,ra.risk_id,ra.source_pulse_id,
      ra.source_cluster_id,ra.escalation_id,ra.governance_review_id,ra.review_requirement,ra.evidence_contract_version,
      COALESCE(h.name,'Organisation-wide') AS house_name
      FROM risk_actions ra
      LEFT JOIN risks r ON r.id=ra.risk_id AND r.company_id=ra.company_id
      LEFT JOIN houses h ON h.id=COALESCE(ra.house_id,r.house_id)
      WHERE ra.company_id=$1 AND ra.completed_at IS NOT NULL
        AND ra.review_requirement IS NULL
        AND ra.effectiveness_outcome IS NULL
      ORDER BY ra.completed_at ASC`,[company_id])).rows;
  }

  async history(actionId: string, companyId: string) {
    const result = await query(
      `SELECT aer.*, u.first_name || ' ' || u.last_name AS reviewed_by_name
         FROM action_effectiveness_reviews aer
         JOIN users u ON u.id=aer.reviewed_by AND u.company_id=aer.company_id
        WHERE aer.action_id=$1 AND aer.company_id=$2
        ORDER BY aer.reviewed_at DESC`,
      [actionId, companyId],
    );
    return result.rows;
  }

  async summary(company_id: string, start: string, end: string) {
    const result = await canonicalReportingService.effectivenessSummary(company_id, { start, end });
    const pending = await this.getPendingEffectiveness(company_id);
    const legacy_evidence_gaps = await this.getLegacyEvidenceGaps(company_id);
    return { ...result, pending, pending_count: pending.length, legacy_evidence_gaps, legacy_evidence_gap_count: legacy_evidence_gaps.length };
  }
}

export const actionEffectivenessService = new ActionEffectivenessService();
