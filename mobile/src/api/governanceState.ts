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
  escalation: { id: string | null; lifecycle: string | null; is_open: boolean };
  actions: { total: number; open: number; completed: number; cancelled: number };
  effectiveness: { required: number; finalised: number; too_early: number; outstanding: number; latest_final_outcome: 'Effective' | 'Partially Effective' | 'Not Effective' | null };
  monitoring: { required: boolean; next_review_date: string | null; review_due: boolean; reduction_evidenced: boolean };
  closure: { eligible: boolean; status: 'NOT_READY' | 'MONITORING' | 'READY_FOR_CLOSURE' | 'CLOSED'; blockers: Array<{ code: string; message: string; record_type: string; record_id: string; route: string }> };
};

/** Mobile reads exactly the same canonical state as web; no mobile-side calculation. */
export function getCanonicalGovernanceState(riskId: string, token?: string) {
  return api.get<CanonicalGovernanceState>(
    `/governance-state/risks/${encodeURIComponent(riskId)}`,
    token,
  );
}
