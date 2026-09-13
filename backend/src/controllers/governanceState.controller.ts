import { Request, Response } from 'express';
import { query } from '../config/database';
import { GOVERNANCE_STATE_CONTRACT_VERSION, governanceStatePermissions } from '../domain/governanceState.contract';
import { canonicalGovernanceStateService } from '../services/canonicalGovernanceState.service';

export const governanceStateController = {
  async getRiskState(req: Request, res: Response) {
    try {
      const companyId = req.user!.company_id!;
      // Resolve lineage inside the authenticated tenant. Never trust a client-supplied
      // cluster id and never calculate trajectory before tenant ownership is established.
      const owned = await query(
        'SELECT id, source_cluster_id FROM risks WHERE id = $1 AND company_id = $2',
        [req.params.riskId, companyId],
      );
      if (!owned.rows.length) {
        return res.status(404).json({ success: false, message: 'Risk not found', errors: [] });
      }

      const state = await canonicalGovernanceStateService.riskState(
        owned.rows[0].id,
        companyId,
        owned.rows[0].source_cluster_id,
      );
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
