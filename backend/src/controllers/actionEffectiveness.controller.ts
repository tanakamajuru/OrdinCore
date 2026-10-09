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

  async getScheduled(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { house_id } = req.query;
      const data = await actionEffectivenessService.getScheduledEffectiveness(company_id, house_id as string);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: 'Failed to fetch scheduled effectiveness reassessments' });
    }
  }

  // Resolve one action's rating payload for an early review or focus deep-link (pending or scheduled).
  async getForAction(req: Request, res: Response) {
    try {
      const data = await actionEffectivenessService.getEffectivenessForAction(req.user!.company_id!, req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Action not found, or not available to you.' });
      if ((data as any).ineligible) return res.status(409).json({ success: false, message: (data as any).reason });
      return res.json({ success: true, data });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to load the effectiveness review' });
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

  async getHistory(req: Request, res: Response) {
    try {
      const data = await actionEffectivenessService.history(req.params.actionId, req.user!.company_id!);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch effectiveness history' });
    }
  }
}

export const actionEffectivenessController = new ActionEffectivenessController();
