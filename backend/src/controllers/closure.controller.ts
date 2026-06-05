import { Request, Response } from 'express';
import { closureService } from '../services/closure.service';

export class ClosureController {
  async closeEscalation(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await closureService.closeEscalation(company_id, req.params.id, req.user!.user_id, req.body);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to close escalation', errors: [] });
    }
  }

  async closeRisk(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await closureService.closeRisk(company_id, req.params.id, req.user!.user_id, req.body);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to close risk', errors: [] });
    }
  }
}

export const closureController = new ClosureController();
