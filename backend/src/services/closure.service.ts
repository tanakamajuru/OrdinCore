import { query } from '../config/database';
import { eventBus, EVENTS } from '../events/eventBus';
import { canonicalGovernanceStateService } from './canonicalGovernanceState.service';
import { normalizeEscalationLifecycle } from '../domain/governanceVocabulary';
import { canonicalControlPositionService } from './canonicalControlPosition.service';

export interface ClosureReviewInput {
  pattern_reduced: boolean;
  actions_completed: boolean;
  effectiveness_reviewed: boolean;
  further_escalation_required: boolean;
  closure_reason?: string;
  evidence: string;
  // Where an escalation carries no linked action, closure may still be justified by a genuine
  // alternative basis. The system never fabricates an action to satisfy the form.
  evidence_basis?: 'LINKED_ACTIONS' | 'EXISTING_CONTROL' | 'IMMEDIATE_MEASURE' | 'EXTERNAL_INTERVENTION' | 'NO_LONGER_APPLICABLE';
}

/**
 * Closure service (spec module 8).
 * Closure is evidence-based: the system blocks closure unless actions are
 * complete, effectiveness has been reviewed, no further escalation is required,
 * and closure evidence is supplied. Every decision is written to closure_reviews.
 */
export class ClosureService {
  private assertClosable(input: ClosureReviewInput) {
    if (!input.actions_completed) throw new Error('Closure blocked: actions are not complete.');
    if (!input.effectiveness_reviewed) throw new Error('Closure blocked: effectiveness has not been reviewed.');
    if (input.further_escalation_required) throw new Error('Closure blocked: further escalation is required.');
    // Evidence is reused from the decision & notes already recorded on the escalation, so a
    // separate long-form justification is no longer demanded here. The service still records
    // whatever evidence text is supplied (the caller falls back to a standard phrase).
  }

  async closeEscalation(companyId: string, escalationId: string, userId: string, input: ClosureReviewInput) {
    const existing = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [escalationId, companyId]);
    if (!existing.rows[0]) throw new Error('Escalation not found');
    if (normalizeEscalationLifecycle(existing.rows[0].lifecycle_status ?? existing.rows[0].status) === 'Closed') {
      throw new Error('This escalation is already closed.');
    }
    if (input.further_escalation_required) throw new Error('Closure blocked: further escalation is required.');
    if (!input.pattern_reduced) throw new Error('Closure blocked: confirm that the reason for escalation has been addressed.');
    if (!input.evidence || input.evidence.trim().length < 20) throw new Error('Closure blocked: record meaningful evidence supporting closure.');

    // Never trust UI checkboxes as proof. One canonical control-position contract is the gate.
    // Historical partial/failed controls remain in the audit trail, but a later FINAL outcome in
    // the same governance domain supersedes the older outcome for CURRENT closure readiness.
    const controlPosition = await canonicalControlPositionService.forEscalation(companyId, existing.rows[0]);
    const basis = input.evidence_basis || (controlPosition.total ? 'LINKED_ACTIONS' : undefined);
    const allowedBases = ['LINKED_ACTIONS', 'EXISTING_CONTROL', 'IMMEDIATE_MEASURE', 'EXTERNAL_INTERVENTION', 'NO_LONGER_APPLICABLE'];
    if (!basis || !allowedBases.includes(basis)) throw new Error('Closure blocked: select the evidence basis for closure.');
    if (controlPosition.total > 0) {
      if (controlPosition.open > 0) throw new Error(`Closure blocked: ${controlPosition.open} linked action(s) are incomplete.`);
      if (controlPosition.awaiting_final > 0 || controlPosition.current.unreviewed > 0) throw new Error(`Closure blocked: ${Math.max(controlPosition.awaiting_final, controlPosition.current.unreviewed)} current control(s) still need a final effectiveness review. Too Early to Assess is an interim review.`);
      if (controlPosition.current.partially_effective > 0 || controlPosition.current.not_effective > 0) {
        throw new Error(`Closure blocked: current control position is ${controlPosition.current.overall} (${controlPosition.current.partially_effective} Partially Effective, ${controlPosition.current.not_effective} Not Effective). Historical superseded outcomes remain visible but do not by themselves permanently block closure.`);
      }
    } else if (basis === 'LINKED_ACTIONS') {
      throw new Error('Closure blocked: no linked action exists; select the genuine alternative evidence basis.');
    }
    const auditedEvidence = `[Evidence basis: ${basis}]\n${input.evidence.trim()}`;

    await query(
      `INSERT INTO closure_reviews
        (company_id, escalation_id, reviewed_by, pattern_reduced, actions_completed,
         effectiveness_reviewed, further_escalation_required, closure_decision, evidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Close',$8)`,
      [companyId, escalationId, userId, !!input.pattern_reduced, !!input.actions_completed,
       controlPosition.total ? !!input.effectiveness_reviewed : true, !!input.further_escalation_required, auditedEvidence]
    );

    const result = await query(
      `UPDATE escalations
       SET lifecycle_status = 'Closed',
             status = 'Closed',
             closed_at = NOW(),
             closed_by = $1,
             closure_reason = $2,
             closure_evidence = $3,
             post_closure_risk_review_required = TRUE,
             updated_at = NOW()
       WHERE id = $4 AND company_id = $5
       RETURNING *`,
      [userId, input.closure_reason || basis, auditedEvidence, escalationId, companyId]
    );

    await eventBus.emitEvent(EVENTS.ESCALATION_RESOLVED,
      { escalation_id: escalationId, company_id: companyId, resolved_by: userId },
      { idempotencyKey: `escalation-closed:${escalationId}:${result.rows[0]?.closed_at || 'recorded'}` });
    return result.rows[0];
  }

  async closeRisk(companyId: string, riskId: string, userId: string, input: ClosureReviewInput) {
    const existing = await query('SELECT * FROM risks WHERE id = $1 AND company_id = $2', [riskId, companyId]);
    if (!existing.rows[0]) throw new Error('Risk not found');
    if (existing.rows[0].status === 'Closed') {
      throw new Error('This risk is already closed.');
    }
    this.assertClosable(input);
    const canonical = await canonicalGovernanceStateService.riskState(riskId, companyId);
    if (!canonical.closure.eligible) {
      throw new Error(`Risk cannot be closed yet: ${canonical.closure.blockers.map((item) => `${item.message} [${item.record_type}:${item.record_id}]`).join(' ')}`);
    }
    if (!input.pattern_reduced) throw new Error('Closure blocked: sustained reduction has not been evidenced.');
    if (!input.evidence || input.evidence.trim().length < 10) throw new Error('Closure blocked: record the evidence supporting closure.');

    await query(
      `INSERT INTO closure_reviews
        (company_id, risk_id, reviewed_by, pattern_reduced, actions_completed,
         effectiveness_reviewed, further_escalation_required, closure_decision, evidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Close',$8)`,
      [companyId, riskId, userId, !!input.pattern_reduced, !!input.actions_completed,
       !!input.effectiveness_reviewed, !!input.further_escalation_required, input.evidence]
    );

    const result = await query(
      `UPDATE risks
         SET status = 'Closed',
             closure_reason = $1,
             closed_at = NOW(),
             closure_eligible = false,
             updated_at = NOW()
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      [input.closure_reason || input.evidence, riskId, companyId]
    );
    return result.rows[0];
  }
}

export const closureService = new ClosureService();
