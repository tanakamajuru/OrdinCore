import { Request, Response } from 'express';
import { actionEffectivenessService } from '../services/actionEffectiveness.service';
import { emitToCompany } from '../websocket/socket.server';

export class ActionEffectivenessController {
  async rateEffectiveness(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { actionId } = req.params;
      const result = await actionEffectivenessService.rateEffectiveness(actionId, company_id, req.user!.user_id, req.body);
      emitToCompany(company_id, 'intervention.updated', {
        reason: 'effectiveness_reviewed', action_id: actionId,
      });
      emitToCompany(company_id, 'governance.case.updated', {
        reason: 'effectiveness_reviewed', action_id: actionId,
      });
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

  async getSummary(req: Request, res: Response) {
    try {
      const end = String(req.query.end || new Date().toISOString());
      const start = String(req.query.start || new Date(Date.now() - 7 * 86400000).toISOString());
      const data = await actionEffectivenessService.summary(req.user!.company_id!, start, end);
      return res.json({ success: true, data, meta: { measure: 'effectiveness_reviewed_at' } });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch effectiveness summary' });
    }
  }
}

export const actionEffectivenessController = new ActionEffectivenessController();
