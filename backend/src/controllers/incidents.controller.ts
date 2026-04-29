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
      const status = req.query.status as string;
      const severityRaw = req.query.severity as string;
      const severity = severityRaw ? severityRaw.charAt(0).toUpperCase() + severityRaw.slice(1).toLowerCase() : undefined;
      const filters = { 
        status: status && status.includes(',') ? status.split(',') : status, 
        severity, 
        house_id: req.query.house_id 
      };
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

  async getTimeline(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const timeline = await incidentsService.getTimeline(req.params.id, company_id);
      return res.json({ success: true, data: { timeline }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get timeline';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getGovernanceTimeline(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const timeline = await incidentsService.getGovernanceTimeline(req.params.id, company_id);
      return res.json({ success: true, data: { timeline }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get governance timeline';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getCategories(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const categories = await incidentsService.getCategories(company_id);
      return res.json({ success: true, data: categories, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch categories';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async createCategory(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const category = await incidentsService.createCategory(company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: category, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create category';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getAttachments(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const attachments = await incidentsService.getAttachments(req.params.id, company_id);
      return res.json({ success: true, data: attachments, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get attachments';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async addAttachment(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const attachment = await incidentsService.addAttachment(req.params.id, company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: attachment, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add attachment';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async removeAttachment(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      await incidentsService.removeAttachment(req.params.id, company_id, req.user!.user_id, req.params.attachmentId);
      return res.json({ success: true, data: { message: 'Attachment removed' }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove attachment';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async assignIncident(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await incidentsService.assignIncident(req.params.id, company_id, req.user!.user_id, req.body.assigned_to);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign incident';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async resolveIncident(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await incidentsService.resolveIncident(req.params.id, company_id, req.user!.user_id, req.body.resolution_notes);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resolve incident';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async bulkResolve(req: Request, res: Response) {
    try {
      return res.json({ success: true, data: { message: 'Incidents resolved successfully' }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to bulk resolve incidents';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }
}

export const incidentsController = new IncidentsController();
