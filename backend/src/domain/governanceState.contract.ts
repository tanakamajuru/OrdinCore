import type { EffectivenessOutcome } from './effectiveness';
import type { EscalationLifecycle } from './governanceVocabulary';

export const GOVERNANCE_STATE_CONTRACT_VERSION = 'governance-state-v1' as const;

export type GovernanceBlockerCode =
  | 'NO_LINKED_ACTION'
  | 'ACTION_INCOMPLETE'
  | 'EFFECTIVENESS_REQUIRED'
  | 'OBSERVATION_INCOMPLETE'
  | 'CONTROL_PARTIAL'
  | 'CONTROL_FAILED'
  | 'OPEN_ESCALATION'
  | 'MONITORING_DUE'
  | 'REDUCTION_NOT_EVIDENCED';

export type GovernanceBlocker = {
  code: GovernanceBlockerCode;
  message: string;
  record_type: 'ACTION' | 'EFFECTIVENESS' | 'ESCALATION' | 'MONITORING';
  record_id: string;
  route: string;
};

export type CanonicalGovernanceState = {
  risk_id: string;
  contract_version: typeof GOVERNANCE_STATE_CONTRACT_VERSION;
  calculated_at: string;
  escalation: {
    id: string | null;
    lifecycle: EscalationLifecycle | null;
    is_open: boolean;
  };
  actions: {
    total: number;
    open: number;
    completed: number;
    cancelled: number;
  };
  effectiveness: {
    required: number;
    finalised: number;
    too_early: number;
    outstanding: number;
    latest_final_outcome: Exclude<EffectivenessOutcome, 'Too Early To Assess'> | null;
  };
  monitoring: {
    required: boolean;
    next_review_date: string | null;
    review_due: boolean;
    reduction_evidenced: boolean;
  };
  closure: {
    eligible: boolean;
    status: 'NOT_READY' | 'MONITORING' | 'READY_FOR_CLOSURE' | 'CLOSED';
    blockers: GovernanceBlocker[];
  };
};

export type GovernanceStatePermissions = {
  can_review_effectiveness: boolean;
  can_make_closure_decision: boolean;
  assurance_read_only: boolean;
};

/** Permissions affect available actions only. They never alter canonical facts. */
export function governanceStatePermissions(role: string): GovernanceStatePermissions {
  return {
    can_review_effectiveness: role === 'REGISTERED_MANAGER',
    can_make_closure_decision: role === 'REGISTERED_MANAGER',
    assurance_read_only: role === 'DIRECTOR' || role === 'RESPONSIBLE_INDIVIDUAL',
  };
}
