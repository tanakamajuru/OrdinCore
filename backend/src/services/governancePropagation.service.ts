import { query } from '../config/database';
import { reviewObligationsService } from './reviewObligations.service';
import { emitToCompany } from '../websocket/socket.server';
import { EffectivenessOutcome } from '../domain/effectiveness';

/**
 * Propagates one completed human effectiveness judgement through existing linked records.
 * It creates review obligations and audit events only; it never auto-closes or invents links.
 */
export const governancePropagationService = {
  async afterEffectiveness(input: {
    companyId: string; actionId: string; riskId?: string | null;
    outcome: EffectivenessOutcome; actorId: string;
  }) {
    const context = (await query(
      `SELECT ra.risk_id, ra.source_cluster_id, ra.escalation_id,
              i.id AS intervention_id
         FROM risk_actions ra
         LEFT JOIN interventions i ON i.company_id=ra.company_id AND i.linked_action_id=ra.id
        WHERE ra.company_id=$1 AND ra.id=$2`, [input.companyId, input.actionId]
    )).rows[0];
    if (!context) throw new Error('Effectiveness propagation failed: action not found.');

    const riskIds = new Set<string>();
    if (context.risk_id) riskIds.add(context.risk_id);
    // Strategic/systemic risks are included only through the exact source-cluster FK.
    if (context.source_cluster_id) {
      const linked = (await query(
        `SELECT id FROM canonical_risk_state_v WHERE company_id=$1 AND source_cluster_id=$2
          AND is_active`, [input.companyId, context.source_cluster_id]
      )).rows;
      linked.forEach((r: any) => riskIds.add(r.id));
    }

    for (const riskId of riskIds) {
      await reviewObligationsService.open({
        companyId: input.companyId, type: 'RISK_POST_EFFECTIVENESS', subjectType: 'RISK',
        subjectId: riskId, actionId: input.actionId, riskId, dueAt: new Date(),
        ownerRole: 'REGISTERED_MANAGER',
        reason: `Risk requires review after linked action effectiveness was rated ${input.outcome}.`,
      });
    }

    const escalationIds = new Set<string>();
    if (context.escalation_id) escalationIds.add(context.escalation_id);
    if (context.risk_id) {
      const rows = (await query(
        `SELECT id FROM canonical_escalation_state_v WHERE company_id=$1 AND risk_id=$2
          AND is_open`,
        [input.companyId, context.risk_id]
      )).rows;
      rows.forEach((e: any) => escalationIds.add(e.id));
    }
    for (const escalationId of escalationIds) {
      await reviewObligationsService.open({
        companyId: input.companyId, type: 'POST_ESCALATION_RISK', subjectType: 'ESCALATION',
        subjectId: escalationId, actionId: input.actionId, riskId: context.risk_id || null,
        escalationId, dueAt: new Date(), ownerRole: 'REGISTERED_MANAGER',
        reason: `Escalation requires review after linked action effectiveness was rated ${input.outcome}.`,
      });
    }

    if (context.intervention_id) {
      await query(
        `INSERT INTO intervention_oversight_events
          (company_id,intervention_id,actor_id,actor_role,event_type,narrative)
         VALUES ($1,$2,$3,'REGISTERED_MANAGER','EFFECTIVENESS_REVIEWED',$4)`,
        [input.companyId, context.intervention_id, input.actorId,
         `Linked action effectiveness reviewed as ${input.outcome}. Follow-up governance review created where required.`]
      );
    }

    const payload = { action_id: input.actionId, risk_ids: [...riskIds],
      escalation_ids: [...escalationIds], intervention_id: context.intervention_id || null,
      effectiveness_outcome: input.outcome };
    emitToCompany(input.companyId, 'governance.state.updated', payload);
    return payload;
  },
};
