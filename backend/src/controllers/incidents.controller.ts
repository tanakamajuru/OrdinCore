import { Request, Response } from 'express';
import { incidentsService } from '../services/incidents.service';

export class IncidentsController {
  async create(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const incident = await incidentsService.create(company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: incident, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create incident';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const filters = { status: req.query.status, severity: req.query.severity, house_id: req.query.house_id };
      const result = await incidentsService.findAll(company_id, filters, page, limit);
      return res.json({ success: true, data: result.incidents, meta: { total: result.total, page, limit, pages: result.pages } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch incidents';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const incident = await incidentsService.findById(req.params.id, company_id);
      return res.json({ success: true, data: incident, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Incident not found';
      return res.status(404).json({ success: false, message, errors: [] });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const incident = await incidentsService.update(req.params.id, company_id, req.body);
      return res.json({ success: true, data: incident, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update incident';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      await incidentsService.delete(req.params.id, company_id);
      return res.json({ success: true, data: { message: 'Incident closed' }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete incident';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }
}

export const incidentsController = new IncidentsController();
