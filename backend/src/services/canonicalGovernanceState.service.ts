import { query } from '../config/database';
import type { CanonicalGovernanceState, GovernanceBlocker } from '../domain/governanceState.contract';
import { effectivenessReviewState, normalizeActionStatus, normalizeEscalationLifecycle } from '../domain/governanceVocabulary';
import { normalizeEffectiveness } from '../domain/effectiveness';
import { trajectoryForRisk } from './trajectory.service';

type ActionFact = { id: string; title?: string | null; status?: unknown; effectiveness_outcome?: unknown; effectiveness?: unknown; effectiveness_reviewed_at?: string | Date | null; completed_at?: string | Date | null };
type EscalationFact = { id: string; title?: string | null; lifecycle_status?: unknown; status?: unknown };
export type GovernanceFacts = { riskId: string; riskClosed: boolean; actions: ActionFact[]; escalations: EscalationFact[]; trajectory: { direction: string; evidence?: Record<string, unknown> }; calculatedAt?: string };

function blocker(code: GovernanceBlocker['code'], message: string, record_type: GovernanceBlocker['record_type'], record_id: string, route: string): GovernanceBlocker {
  return { code, message, record_type, record_id, route };
}

/** Pure canonical decision function. All database and UI consumers share these semantics. */
export function deriveCanonicalGovernanceState(facts: GovernanceFacts): CanonicalGovernanceState {
  const activeActions = facts.actions.filter((a) => normalizeActionStatus(a.status) !== 'Cancelled');
  const completed = activeActions.filter((a) => normalizeActionStatus(a.status) === 'Completed');
  const openActions = activeActions.filter((a) => normalizeActionStatus(a.status) !== 'Completed');
  const finalised = completed.filter((a) => effectivenessReviewState(a.effectiveness_outcome ?? a.effectiveness) === 'FINAL');
  const tooEarly = completed.filter((a) => effectivenessReviewState(a.effectiveness_outcome ?? a.effectiveness) === 'INTERIM');
  const awaiting = completed.filter((a) => effectivenessReviewState(a.effectiveness_outcome ?? a.effectiveness) !== 'FINAL');
  const openEscalations = facts.escalations.filter((e) => normalizeEscalationLifecycle(e.lifecycle_status ?? e.status) !== 'Closed');
  const latestFinal = [...finalised].sort((a, b) => new Date(b.effectiveness_reviewed_at || b.completed_at || 0).getTime() - new Date(a.effectiveness_reviewed_at || a.completed_at || 0).getTime())[0];
  const latestOutcome = latestFinal ? normalizeEffectiveness(latestFinal.effectiveness_outcome ?? latestFinal.effectiveness) : null;
  const currentSignals = Number(facts.trajectory.evidence?.current14DaySignals ?? 0);
  const reductionEvidenced = facts.trajectory.direction !== 'Deteriorating' && currentSignals === 0;
  const blockers: GovernanceBlocker[] = [];

  if (!activeActions.length) blockers.push(blocker('NO_LINKED_ACTION', 'No linked control or action evidence exists for this risk.', 'ACTION', facts.riskId, `/risks/${facts.riskId}`));
  for (const a of openActions) blockers.push(blocker('ACTION_INCOMPLETE', `${a.title || 'Linked action'} is not complete.`, 'ACTION', a.id, `/my-actions?focus=${a.id}`));
  for (const a of awaiting) {
    const interim = effectivenessReviewState(a.effectiveness_outcome ?? a.effectiveness) === 'INTERIM';
    blockers.push(blocker(interim ? 'OBSERVATION_INCOMPLETE' : 'EFFECTIVENESS_REQUIRED', interim ? `${a.title || 'Completed action'} was rated Too Early to Assess and still requires a final review.` : `${a.title || 'Completed action'} requires an effectiveness review.`, 'EFFECTIVENESS', a.id, `/effectiveness?focus=${a.id}`));
  }
  for (const e of openEscalations) blockers.push(blocker('OPEN_ESCALATION', `${e.title || 'Linked escalation'} remains open.`, 'ESCALATION', e.id, `/escalation-log?focus=${e.id}`));
  if (latestOutcome === 'Partially Effective') blockers.push(blocker('CONTROL_PARTIAL', 'The latest final control judgement is Partially Effective.', 'EFFECTIVENESS', latestFinal!.id, `/effectiveness?focus=${latestFinal!.id}`));
  if (latestOutcome === 'Not Effective') blockers.push(blocker('CONTROL_FAILED', 'The latest final control judgement is Not Effective.', 'EFFECTIVENESS', latestFinal!.id, `/effectiveness?focus=${latestFinal!.id}`));
  if (!reductionEvidenced) blockers.push(blocker('REDUCTION_NOT_EVIDENCED', 'Sustained risk reduction has not yet been evidenced.', 'MONITORING', facts.riskId, `/risks/${facts.riskId}`));

  const eligible = !facts.riskClosed && activeActions.length > 0 && openActions.length === 0 && awaiting.length === 0 && openEscalations.length === 0 && latestOutcome === 'Effective' && reductionEvidenced;
  const selectedEscalation = openEscalations[0] || facts.escalations[0];
  const selectedLifecycle = selectedEscalation ? normalizeEscalationLifecycle(selectedEscalation.lifecycle_status ?? selectedEscalation.status) : null;
  return {
    risk_id: facts.riskId, contract_version: 'governance-state-v1', calculated_at: facts.calculatedAt || new Date().toISOString(),
    escalation: { id: selectedEscalation?.id || null, lifecycle: selectedLifecycle, is_open: openEscalations.length > 0 },
    actions: { total: activeActions.length, open: openActions.length, completed: completed.length, cancelled: facts.actions.length - activeActions.length },
    effectiveness: { required: completed.length, finalised: finalised.length, too_early: tooEarly.length, outstanding: awaiting.length, latest_final_outcome: latestOutcome === 'Too Early To Assess' ? null : latestOutcome },
    monitoring: { required: tooEarly.length > 0 || !reductionEvidenced, next_review_date: null, review_due: false, reduction_evidenced: reductionEvidenced },
    closure: { eligible, status: facts.riskClosed ? 'CLOSED' : eligible ? 'READY_FOR_CLOSURE' : tooEarly.length ? 'MONITORING' : 'NOT_READY', blockers: facts.riskClosed ? [] : blockers },
  };
}

/** Database-backed resolver: the only supported read path for canonical risk state. */
export const canonicalGovernanceStateService = {
  trajectory(riskId: string, sourceClusterId?: string | null) { return trajectoryForRisk(riskId, sourceClusterId || null); },
  async closure(riskId: string, companyId: string) {
    const state = await this.riskState(riskId, companyId);
    return {
      eligible: state.closure.eligible,
      blockers: state.closure.blockers.map((item) => item.message),
      blocking_records: state.closure.blockers,
    };
  },
  async riskState(riskId: string, companyId: string): Promise<CanonicalGovernanceState & { trajectory: unknown }> {
    const riskResult = await query(`SELECT id, status, source_cluster_id, next_review_date FROM risks WHERE id=$1 AND company_id=$2`, [riskId, companyId]);
    const risk = riskResult.rows[0];
    if (!risk) throw new Error('Risk not found');
    const [actions, escalations, trajectory] = await Promise.all([
      query(`SELECT DISTINCT ra.id, ra.title, ra.status, ra.effectiveness_outcome, ra.effectiveness, ra.effectiveness_reviewed_at, ra.completed_at FROM risk_actions ra LEFT JOIN governance_reviews gr ON gr.id=ra.governance_review_id AND gr.company_id=ra.company_id WHERE ra.company_id=$2 AND (ra.risk_id=$1 OR ($3::uuid IS NOT NULL AND ra.source_cluster_id=$3) OR gr.risk_id=$1 OR ($3::uuid IS NOT NULL AND gr.cluster_id=$3))`, [riskId, companyId, risk.source_cluster_id || null]),
      query(`SELECT DISTINCT e.id, COALESCE(e.reason, 'Escalation') AS title, e.lifecycle_status, e.status FROM escalations e LEFT JOIN governance_reviews gr ON gr.id=e.source_governance_review_id AND gr.company_id=e.company_id WHERE e.company_id=$2 AND (e.risk_id=$1 OR ($3::uuid IS NOT NULL AND e.source_cluster_id=$3) OR gr.risk_id=$1 OR ($3::uuid IS NOT NULL AND gr.cluster_id=$3) OR EXISTS (SELECT 1 FROM risk_actions ra WHERE ra.company_id=e.company_id AND ra.escalation_id=e.id AND (ra.risk_id=$1 OR ($3::uuid IS NOT NULL AND ra.source_cluster_id=$3))))`, [riskId, companyId, risk.source_cluster_id || null]),
      trajectoryForRisk(riskId, risk.source_cluster_id || null),
    ]);
    const state = deriveCanonicalGovernanceState({ riskId, riskClosed: ['closed', 'resolved'].includes(String(risk.status || '').toLowerCase()), actions: actions.rows, escalations: escalations.rows, trajectory });
    state.monitoring.next_review_date = risk.next_review_date || null;
    state.monitoring.review_due = !!risk.next_review_date && new Date(risk.next_review_date).getTime() <= Date.now();
    return { ...state, trajectory };
  },
};
