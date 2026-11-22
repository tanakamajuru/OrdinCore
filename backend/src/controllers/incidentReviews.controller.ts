import { Request, Response } from 'express';
import { incidentsService } from '../services/incidents.service';
import { incidentReviewsService } from '../services/incidentReviews.service';
import { governancePdfService } from '../services/governancePdf.service';
import { isOutsideHouseScope } from '../utils/houseScope';

// 22 Nov 2026 brief -> Serious Incident workflow, Steps 3-4. Incident-scoped endpoints (case
// summary, eligible reviewers, assign) mirror incidents.controller.ts's existing house-scope
// check pattern (isOutsideHouseScope); review-id-scoped endpoints (draft/waiting/actions/
// link-learning/complete/pdf) resolve the owning incident first so the same check applies.

async function houseScopeGuardForIncident(req: Request, res: Response, incidentId: string, companyId: string): Promise<boolean> {
  const incident = await incidentsService.findById(incidentId, companyId);
  if (isOutsideHouseScope(req, incident.house_id)) {
    res.status(404).json({ success: false, message: 'Incident not found', errors: [] });
    return true;
  }
  return false;
}

async function houseScopeGuardForReview(req: Request, res: Response, reviewId: string, companyId: string): Promise<{ blocked: boolean; incidentId?: string }> {
  const review = await incidentReviewsService.getById(reviewId, companyId);
  if (isOutsideHouseScope(req, review.incident_house_id)) {
    res.status(404).json({ success: false, message: 'Incident review not found', errors: [] });
    return { blocked: true };
  }
  return { blocked: false, incidentId: review.incident_id };
}

export class IncidentReviewsController {
  async getCaseSummary(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      if (await houseScopeGuardForIncident(req, res, req.params.incidentId, company_id)) return;
      const data = await incidentReviewsService.getCaseSummary(req.params.incidentId, company_id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load case summary';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getActive(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      if (await houseScopeGuardForIncident(req, res, req.params.incidentId, company_id)) return;
      const data = await incidentReviewsService.getActive(req.params.incidentId, company_id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load incident review';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async listEligibleReviewers(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await incidentReviewsService.listEligibleReviewers(company_id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load eligible reviewers';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async assign(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      if (await houseScopeGuardForIncident(req, res, req.params.incidentId, company_id)) return;
      const { assigned_to, due_at, note } = req.body || {};
      const review = await incidentReviewsService.assign(req.params.incidentId, company_id, req.user!.user_id, {
        assignedTo: assigned_to, dueAt: due_at || null, note: note || null,
      });
      return res.json({ success: true, data: review, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign incident review';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async saveDraft(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const guard = await houseScopeGuardForReview(req, res, req.params.id, company_id);
      if (guard.blocked) return;
      const updated = await incidentReviewsService.saveDraft(req.params.id, company_id, req.user!.user_id, req.user!.role || '', req.body || {});
      return res.json({ success: true, data: updated, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save review draft';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async setWaiting(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const guard = await houseScopeGuardForReview(req, res, req.params.id, company_id);
      if (guard.blocked) return;
      const { is_waiting, reason } = req.body || {};
      const updated = await incidentReviewsService.setWaiting(req.params.id, company_id, req.user!.user_id, req.user!.role || '', {
        isWaiting: !!is_waiting, reason,
      });
      return res.json({ success: true, data: updated, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update waiting state';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async addAction(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const guard = await houseScopeGuardForReview(req, res, req.params.id, company_id);
      if (guard.blocked) return;
      const action = await incidentReviewsService.addAction(req.params.id, company_id, req.user!.user_id, req.user!.role || '', req.body || {});
      return res.status(201).json({ success: true, data: action, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add action';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async linkLearning(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const guard = await houseScopeGuardForReview(req, res, req.params.id, company_id);
      if (guard.blocked) return;
      const updated = await incidentReviewsService.linkLearning(req.params.id, company_id, req.user!.user_id, req.user!.role || '', req.body?.learning_record_id);
      return res.json({ success: true, data: updated, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to link learning record';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async complete(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const guard = await houseScopeGuardForReview(req, res, req.params.id, company_id);
      if (guard.blocked) return;
      const result = await incidentReviewsService.complete(req.params.id, company_id, req.user!.user_id, req.user!.role || '', req.body || {});
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete review';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async downloadPdf(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const guard = await houseScopeGuardForReview(req, res, req.params.id, company_id);
      if (guard.blocked) return;
      const { content, filename, contentType } = await governancePdfService.seriousIncidentReviewRecord(req.params.id, company_id);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(content);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to build incident review PDF';
      return res.status(404).json({ success: false, message, errors: [] });
    }
  }
}

export const incidentReviewsController = new IncidentReviewsController();
