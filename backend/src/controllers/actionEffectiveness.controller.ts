import { Request, Response } from 'express';
import { actionEffectivenessService } from '../services/actionEffectiveness.service';

export class ActionEffectivenessController {
  async rateEffectiveness(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { id } = req.params;
      const result = await actionEffectivenessService.rateEffectiveness(id, company_id, req.user!.user_id, req.body);
      return res.json({ success: true, data: result });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to rate action effectiveness' });
    }
  }

  async getPending(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { house_id } = req.query;
      const data = await actionEffectivenessService.getPendingEffectiveness(company_id, house_id as string);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: 'Failed to fetch pending effectiveness ratings' });
    }
  }
}

export const actionEffectivenessController = new ActionEffectivenessController();
