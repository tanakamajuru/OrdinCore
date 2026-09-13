export const GOVERNANCE_STATE_CONTRACT_VERSION = 'governance-state-v1' as const;

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
