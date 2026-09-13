export type CanonicalGovernanceState = {
  risk_id: string;
  contract_version: 'governance-state-v1';
  calculated_at: string;
  trajectory: {
    direction: 'Improving' | 'Stable' | 'Deteriorating';
    basis: string;
    points: number[];
    evidence?: Record<string, unknown>;
  };
  closure: Record<string, unknown>;
};
