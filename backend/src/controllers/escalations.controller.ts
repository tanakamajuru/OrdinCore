import { Request, Response } from 'express';
import { escalationsService } from '../services/escalations.service';
import { emitToCompany } from '../websocket/socket.server';

export class EscalationsController {
  async findAll(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const filters = { status: req.query.status, risk_id: req.query.risk_id, house_id: req.query.house_id };
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
      const role = String(req.user!.role || '').toUpperCase();
      if (['TEAM_LEADER', 'SUPPORT_WORKER'].includes(role)) {
        const allowed = req.user!.assigned_house_ids || [];
        if (!escalation.house_id || !allowed.includes(escalation.house_id)) {
          return res.status(404).json({ success: false, message: 'Escalation not found', errors: [] });
        }
      }
      return res.json({ success: true, data: escalation, meta: {} });
    } catch (err: unknown) {
      return res.status(404).json({ success: false, message: err instanceof Error ? err.message : 'Escalation not found', errors: [] });
    }
  }

  async resolve(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await escalationsService.resolve(req.params.id, company_id, req.user!.user_id, req.body.resolution_notes || '');
      emitToCompany(company_id, 'governance.case.updated', { reason: 'escalation_resolved', escalation_id: req.params.id });
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to resolve escalation', errors: [] });
    }
  }

  async postClosureRiskReview(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await escalationsService.postClosureRiskReview(req.params.id, company_id, req.user!.user_id, {
        outcome: req.body.outcome,
        // Spec field names are rationale/nextReviewDate; keep note/due_at for back-compat.
        note: req.body.rationale ?? req.body.note,
        due_at: req.body.nextReviewDate ?? req.body.due_at,
      });
      emitToCompany(company_id, 'governance.case.updated', { reason: 'post_closure_reviewed', escalation_id: req.params.id, risk_id: result?.risk_id || null });
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to record post-escalation risk review', errors: [] });
    }
  }

  async acknowledge(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const role = String(req.user!.role || '').toUpperCase();
      if (['TEAM_LEADER', 'SUPPORT_WORKER'].includes(role)) {
        const escalation = await escalationsService.findById(req.params.id, company_id);
        const allowed = req.user!.assigned_house_ids || [];
        if (!escalation.house_id || !allowed.includes(escalation.house_id)) {
          return res.status(404).json({ success: false, message: 'Escalation not found', errors: [] });
        }
      }
      const result = await escalationsService.acknowledge(req.params.id, company_id, req.user!.user_id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to acknowledge escalation', errors: [] });
    }
  }

  async escalateFurther(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await escalationsService.escalateFurther(req.params.id, company_id, req.user!.user_id, req.body?.reason);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to escalate further', errors: [] });
    }
  }

  async addAction(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const action = await escalationsService.addAction(req.params.id, company_id, req.user!.user_id, req.body);
      emitToCompany(company_id, 'governance.case.updated', { reason: 'escalation_action_added', escalation_id: req.params.id, action_id: action?.id || null });
      return res.status(201).json({ success: true, data: action, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add escalation action';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async addTask(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const task = await escalationsService.addTask(req.params.id, company_id, req.user!.user_id, req.body);
      emitToCompany(company_id, 'governance.case.updated', { reason: 'escalation_task_added', escalation_id: req.params.id, action_id: task?.id || null });
      return res.status(201).json({ success: true, data: task, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add task';
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

  async transition(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await escalationsService.transition(req.params.id, company_id, req.user!.user_id, req.body.lifecycle_status, req.body.rationale);
      emitToCompany(company_id, 'governance.case.updated', { reason: 'escalation_transitioned', escalation_id: req.params.id, lifecycle_status: req.body.lifecycle_status });
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to transition escalation', errors: [] });
    }
  }

  async reopen(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await escalationsService.reopen(req.params.id, company_id, req.user!.user_id, req.body.reopened_reason || req.body.reason || '');
      emitToCompany(company_id, 'governance.case.updated', { reason: 'escalation_reopened', escalation_id: req.params.id });
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to reopen escalation', errors: [] });
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
