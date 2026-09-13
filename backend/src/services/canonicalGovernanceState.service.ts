import { risksService } from './risks.service';
import { trajectoryForRisk } from './trajectory.service';

/** Single read facade for every consumer of risk trajectory and closure readiness. */
export const canonicalGovernanceStateService = {
  trajectory(riskId: string, sourceClusterId?: string | null) {
    return trajectoryForRisk(riskId, sourceClusterId || null);
  },
  closure(riskId: string, companyId: string) {
    return risksService.closureReview(riskId, companyId);
  },
  async riskState(riskId: string, companyId: string, sourceClusterId?: string | null) {
    const [trajectory, closure] = await Promise.all([
      trajectoryForRisk(riskId, sourceClusterId || null),
      risksService.closureReview(riskId, companyId),
    ]);
    return { risk_id: riskId, trajectory, closure, calculated_at: new Date().toISOString(), contract_version: 'governance-state-v1' };
  },
};
