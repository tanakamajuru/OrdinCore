import { Request, Response } from 'express';
import { escalationsService } from '../services/escalations.service';

export class EscalationsController {
  async findAll(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const filters = { status: req.query.status };
      const result = await escalationsService.findAll(company_id, filters, page, limit);
      return res.json({ success: true, data: result.escalations, meta: { total: result.total, page, limit, pages: result.pages } });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch escalations', errors: [] });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const escalation = await escalationsService.findById(req.params.id, company_id);
      return res.json({ success: true, data: escalation, meta: {} });
    } catch (err: unknown) {
      return res.status(404).json({ success: false, message: err instanceof Error ? err.message : 'Escalation not found', errors: [] });
    }
  }

  async resolve(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await escalationsService.resolve(req.params.id, company_id, req.user!.user_id, req.body.resolution_notes || '');
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to resolve escalation', errors: [] });
    }
  }

  async acknowledge(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await escalationsService.acknowledge(req.params.id, company_id, req.user!.user_id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to acknowledge escalation', errors: [] });
    }
  }

  async addAction(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const action = await escalationsService.addAction(req.params.id, company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: action, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add escalation action';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getActions(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const actions = await escalationsService.getActions(req.params.id, company_id);
      return res.json({ success: true, data: actions, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get escalation actions';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async assignEscalation(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await escalationsService.assignEscalation(req.params.id, company_id, req.user!.user_id, req.body.assigned_to);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign escalation';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async updatePriority(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await escalationsService.updatePriority(req.params.id, company_id, req.user!.user_id, req.body.priority);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update escalation priority';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await escalationsService.getEscalationStats(company_id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get escalation stats';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }
}

export const escalationsController = new EscalationsController();
