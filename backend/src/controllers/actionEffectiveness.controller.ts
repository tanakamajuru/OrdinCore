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
      // Bug fix (1 Nov 2026, "Action Effectiveness screen" — Too-Early=0 date-basis
      // investigation): this silently defaulted to the last 7 days with no indication in the
      // UI that any window was applied. Verified against production: 183 reviewed actions
      // exist in canonical_action_effectiveness_v company-wide, but only 8 fall in the last
      // 7 days, and the company's one "Too Early To Assess" review was entirely outside that
      // window — so the Org Summary/Domain/Service/Trend panels showed 0 for it with no
      // visible scoping. Default is now full history unless the caller explicitly asks for a
      // range; meta.range is returned so the frontend can state the window it is showing.
      const end = String(req.query.end || new Date().toISOString());
      const start = String(req.query.start || '1970-01-01T00:00:00.000Z');
      const data = await actionEffectivenessService.summary(req.user!.company_id!, start, end);
      return res.json({ success: true, data, meta: { measure: 'effectiveness_reviewed_at', range: { start, end } } });
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
