import { Request, Response } from 'express';
import { incidentsService } from '../services/incidents.service';
import { isOutsideHouseScope } from '../utils/houseScope';

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

  async detectPatterns(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { house_id, persons_involved, type, severity, occurred_at } = req.body || {};
      // 22 Nov 2026 brief: persons_involved now arrives as the form's structured
      // {id?,name,type,roles}[] so a service user's stable id survives to the matching logic --
      // still accepts a legacy comma-string or plain string[] so older callers don't break.
      let persons: Array<{ id?: string; name: string; type?: string }> = [];
      if (Array.isArray(persons_involved)) {
        persons = persons_involved
          .map((p: any) => (p && typeof p === 'object') ? { id: p.id, name: p.name, type: p.type } : { name: String(p) })
          .filter((p: any) => p.name);
      } else if (typeof persons_involved === 'string') {
        persons = persons_involved.split(',').map((s: string) => ({ name: s.trim() })).filter((p) => p.name);
      }
      const data = await incidentsService.detectPatterns(company_id, {
        house_id, type, severity, occurred_at, persons_involved: persons,
      });
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to detect patterns';
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
      // C1 correction (21 Oct 2026): "Remove first-assigned-service-only ... list filtering. Allow
      // every authorised assigned service." A multi-service RM/TL now passes every assigned house,
      // comma-joined -- same pattern already used for status above.
      const houseIdRaw = req.query.house_id as string | undefined;
      const filters = {
        status: status && status.includes(',') ? status.split(',') : status,
        severity,
        house_id: houseIdRaw && houseIdRaw.includes(',') ? houseIdRaw.split(',') : houseIdRaw
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
      // VAPT F1 (26 Oct 2026): confirmed by live exploitation -- this previously scoped only by
      // tenant, so any Team Leader/Support Worker could read any other house's incident by id.
      if (isOutsideHouseScope(req, incident.house_id)) {
        return res.status(404).json({ success: false, message: 'Incident not found', errors: [] });
      }
      return res.json({ success: true, data: incident, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Incident not found';
      return res.status(404).json({ success: false, message, errors: [] });
    }
  }

  async retryFollowUp(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await incidentsService.retryFollowUp(company_id, req.user!.user_id, req.params.id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retry follow-up work';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      // VAPT F2 (26 Oct 2026): confirmed by live exploitation (real data mutation, reverted) --
      // a Team Leader could tamper with another house's incident. Check scope BEFORE writing.
      const existing = await incidentsService.findById(req.params.id, company_id);
      if (isOutsideHouseScope(req, existing.house_id)) {
        return res.status(404).json({ success: false, message: 'Incident not found', errors: [] });
      }
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
      const existing = await incidentsService.findById(req.params.id, company_id);
      if (isOutsideHouseScope(req, existing.house_id)) {
        return res.status(404).json({ success: false, message: 'Incident not found', errors: [] });
      }
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
      const existing = await incidentsService.findById(req.params.id, company_id);
      if (isOutsideHouseScope(req, existing.house_id)) {
        return res.status(404).json({ success: false, message: 'Incident not found', errors: [] });
      }
      // 26 Nov 2026 field report ("this returns 0's ... TypeError: q.filter is not a function"):
      // the service already returns the full { timeline: [...], metrics, patterns, findings, ... }
      // payload the frontend expects at the top level of `data` — wrapping it again as
      // `{ timeline }` produced data.timeline.timeline (the array two levels deep instead of one),
      // so every frontend reader that did `reportData.timeline` got the inner object back instead
      // of the array and either silently rendered zeros or crashed calling .filter() on it.
      const timeline = await incidentsService.getGovernanceTimeline(req.params.id, company_id);
      return res.json({ success: true, data: timeline, meta: {} });
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
      const existing = await incidentsService.findById(req.params.id, company_id);
      if (isOutsideHouseScope(req, existing.house_id)) {
        return res.status(404).json({ success: false, message: 'Incident not found', errors: [] });
      }
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
      const existing = await incidentsService.findById(req.params.id, company_id);
      if (isOutsideHouseScope(req, existing.house_id)) {
        return res.status(404).json({ success: false, message: 'Incident not found', errors: [] });
      }
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
      const existing = await incidentsService.findById(req.params.id, company_id);
      if (isOutsideHouseScope(req, existing.house_id)) {
        return res.status(404).json({ success: false, message: 'Incident not found', errors: [] });
      }
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
      const existing = await incidentsService.findById(req.params.id, company_id);
      if (isOutsideHouseScope(req, existing.house_id)) {
        return res.status(404).json({ success: false, message: 'Incident not found', errors: [] });
      }
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
      const existing = await incidentsService.findById(req.params.id, company_id);
      if (isOutsideHouseScope(req, existing.house_id)) {
        return res.status(404).json({ success: false, message: 'Incident not found', errors: [] });
      }
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
