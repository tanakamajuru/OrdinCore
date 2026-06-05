import { Request, Response } from 'express';
import { reconstructionService, ReconstructionScope } from '../services/reconstruction.service';

const VALID_SCOPES: ReconstructionScope[] = ['client', 'service', 'theme', 'incident'];

export class ReconstructionController {
  async reconstruct(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const scope = req.params.scope as ReconstructionScope;
      if (!VALID_SCOPES.includes(scope)) {
        return res.status(400).json({ success: false, message: `Invalid scope: ${scope}`, errors: [] });
      }
      const data = await reconstructionService.reconstruct(
        company_id,
        scope,
        req.params.id,
        req.query.start as string | undefined,
        req.query.end as string | undefined
      );
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build reconstruction', errors: [] });
    }
  }
}

export const reconstructionController = new ReconstructionController();
