import { api } from './client';

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

/** Mobile reads exactly the same canonical state as web; no mobile-side calculation. */
export function getCanonicalGovernanceState(riskId: string, token?: string) {
  return api.get<CanonicalGovernanceState>(
    `/governance-state/risks/${encodeURIComponent(riskId)}`,
    token,
  );
}
