import { query } from '../config/database';
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
    data: { outcome?: EffectivenessOutcome; effectiveness?: 'Effective' | 'Neutral' | 'Ineffective'; evidence?: string; note?: string; intended_outcome?: string; next_review_date?: string }
  ) {
    const action = await risksRepo.getActionById(actionId, company_id);
    if (!action) throw new Error('Action not found');

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
    const intendedOutcome = String(action.intended_outcome || data.intended_outcome || '').trim();
    if (intendedOutcome.length < 10) {
      throw new Error('Governance Block: record the intended outcome before rating effectiveness.');
    }

    const legacy = toLegacyEffectiveness(outcome);
    let nextReviewDate: Date | null = null;
    if (outcome === 'Too Early To Assess') {
      if (!data.next_review_date) throw new Error('Too Early to Assess requires a future review date.');
      nextReviewDate = new Date(`${data.next_review_date}T00:00:00.000Z`);
      if (Number.isNaN(nextReviewDate.getTime()) || nextReviewDate.getTime() <= Date.now()) {
        throw new Error('The next effectiveness review date must be in the future.');
      }
    }

    const result = await query(
      `UPDATE risk_actions
       SET effectiveness_outcome = $1,
           -- Keep the legacy compatibility field in lock-step. Too Early maps to NULL and must
           -- clear a previous directional value rather than leaving a stale Effective result.
           effectiveness = $2,
           effectiveness_evidence = COALESCE($3, effectiveness_evidence),
           effectiveness_reviewed_by = $4,
           effectiveness_reviewed_at = NOW(),
           verification_notes = COALESCE($3, verification_notes),
           intended_outcome = COALESCE(NULLIF($7, ''), intended_outcome),
           effectiveness_due_at = $8
       WHERE id = $5 AND company_id = $6 RETURNING *`,
      [outcome, legacy, evidence, userId, actionId, company_id, intendedOutcome, nextReviewDate]
    );

    const updatedAction = result.rows[0];
    const reviewId = uuidv4();
    await query(
      `INSERT INTO action_effectiveness_reviews
        (id, company_id, action_id, outcome, intended_outcome, evidence, reviewed_by, reviewed_at, next_review_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8)`,
      [reviewId, company_id, actionId, outcome, intendedOutcome, evidence || null, userId, nextReviewDate],
    );
    await escalationLifecycleService.syncForAction(actionId, company_id);
    logger.info(`Action ${actionId} rated as ${outcome} by ${userId}`);

    // Trigger trajectory pipeline (only when the outcome maps to a directional signal).
    if (legacy) {
      if (updatedAction.risk_id) await risksService.updateTrajectoryFromActions(updatedAction.risk_id, company_id);
    }

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
    }

    await eventBus.emitEvent(EVENTS.ACTION_EFFECTIVENESS_REVIEWED, {
      company_id, action_id: actionId, risk_id: updatedAction.risk_id || null,
      review_id: reviewId, outcome, reviewed_by: userId,
    }, { idempotencyKey: `action-effectiveness:${reviewId}` });

    return updatedAction;
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
       AND gro.obligation_type='ACTION_EFFECTIVENESS' AND gro.is_actionable
      WHERE ra.company_id = $1
      AND ra.requires_effectiveness_review
      AND (
        ra.effectiveness_outcome IS NULL
        OR (ra.effectiveness_outcome = 'Too Early To Assess' AND gro.is_due)
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
    return Promise.all(res.rows.map(async (action: any) => {
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
    }));
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
    return { ...result, pending, pending_count: pending.length };
  }
}

export const actionEffectivenessService = new ActionEffectivenessService();
