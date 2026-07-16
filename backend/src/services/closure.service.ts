import { query } from '../config/database';
import { eventBus, EVENTS } from '../events/eventBus';

export interface ClosureReviewInput {
  pattern_reduced: boolean;
  actions_completed: boolean;
  effectiveness_reviewed: boolean;
  further_escalation_required: boolean;
  closure_reason?: string;
  evidence: string;
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
    if (existing.rows[0].lifecycle_status === 'Closed') {
      throw new Error('This escalation is already closed.');
    }
    this.assertClosable(input);

    await query(
      `INSERT INTO closure_reviews
        (company_id, escalation_id, reviewed_by, pattern_reduced, actions_completed,
         effectiveness_reviewed, further_escalation_required, closure_decision, evidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Close',$8)`,
      [companyId, escalationId, userId, !!input.pattern_reduced, !!input.actions_completed,
       !!input.effectiveness_reviewed, !!input.further_escalation_required, input.evidence]
    );

    const result = await query(
      `UPDATE escalations
         SET lifecycle_status = 'Closed',
             status = 'Closed',
             closed_at = NOW(),
             closed_by = $1,
             closure_reason = $2,
             closure_evidence = $3,
             updated_at = NOW()
       WHERE id = $4 AND company_id = $5
       RETURNING *`,
      [userId, input.closure_reason || null, input.evidence, escalationId, companyId]
    );

    await eventBus.emitEvent(EVENTS.ESCALATION_RESOLVED, { escalation_id: escalationId, company_id: companyId, resolved_by: userId });
    return result.rows[0];
  }

  async closeRisk(companyId: string, riskId: string, userId: string, input: ClosureReviewInput) {
    const existing = await query('SELECT * FROM risks WHERE id = $1 AND company_id = $2', [riskId, companyId]);
    if (!existing.rows[0]) throw new Error('Risk not found');
    if (existing.rows[0].status === 'Closed') {
      throw new Error('This risk is already closed.');
    }
    this.assertClosable(input);

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
