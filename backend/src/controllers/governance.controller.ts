import { Request, Response } from 'express';
import { governanceService } from '../services/governance.service';

export class GovernanceController {
  async createTemplate(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const template = await governanceService.createTemplate(company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: template, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create template';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getTemplates(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const templates = await governanceService.getTemplates(company_id);
      return res.json({ success: true, data: templates, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch templates';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async createPulse(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const pulse = await governanceService.createPulse(company_id, req.body);
      return res.status(201).json({ success: true, data: pulse, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create pulse';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getPulses(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const filters = { status: req.query.status, house_id: req.query.house_id };
      const result = await governanceService.findAllPulses(company_id, filters, page, limit);
      return res.json({ success: true, data: result.pulses, meta: { total: result.total, page, limit, pages: result.pages } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch pulses';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async getPulseById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const pulse = await governanceService.findPulseById(req.params.id, company_id);
      return res.json({ success: true, data: pulse, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Pulse not found';
      return res.status(404).json({ success: false, message, errors: [] });
    }
  }

  async submitAnswers(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await governanceService.submitAnswers(req.params.id, company_id, req.user!.user_id, req.body.answers);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit answers';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }
}

export const governanceController = new GovernanceController();
