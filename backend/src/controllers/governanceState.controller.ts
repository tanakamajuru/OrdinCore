import { Request, Response } from 'express';
import { GOVERNANCE_STATE_CONTRACT_VERSION, governanceStatePermissions } from '../domain/governanceState.contract';
import { canonicalGovernanceStateService } from '../services/canonicalGovernanceState.service';

export const governanceStateController = {
  async getRiskState(req: Request, res: Response) {
    try {
      const companyId = req.user!.company_id!;
      const state = await canonicalGovernanceStateService.riskState(req.params.riskId, companyId);
      return res.json({
        success: true,
        data: state,
        meta: {
          contract_version: GOVERNANCE_STATE_CONTRACT_VERSION,
          permissions: governanceStatePermissions(req.user!.role),
        },
      });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to load governance state', errors: [] });
    }
  },
};
