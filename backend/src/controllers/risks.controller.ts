import { Request, Response } from 'express';
import { risksService } from '../services/risks.service';

export class RisksController {
  async create(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const userRole = req.user!.role?.toUpperCase() || '';
      const { override_cluster_requirement, ...data } = req.body;

      if (!override_cluster_requirement || userRole !== 'SUPER_ADMIN') {
        return res.status(400).json({ 
          success: false, 
          message: 'Risks must be promoted from a signal cluster', 
          errors: [] 
        });
      }

      const risk = await risksService.create(company_id, req.user!.user_id, data);
      return res.status(201).json({ success: true, data: risk, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create risk';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async promote(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const user_id = req.user!.user_id;
      const { candidate_id, cluster_id } = req.body;
      
      let risk;
      if (candidate_id) {
        risk = await risksService.promoteFromCandidate(company_id, user_id, req.body);
      } else if (cluster_id) {
        risk = await risksService.promoteFromCluster(company_id, user_id, req.body);
      } else {
        return res.status(400).json({ success: false, message: 'Source candidate_id or cluster_id required' });
      }

      return res.status(201).json({ success: true, data: risk, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to promote cluster to risk';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const severityRaw = req.query.severity as string;
      const severity = severityRaw ? severityRaw.charAt(0).toUpperCase() + severityRaw.slice(1).toLowerCase() : undefined;
      const filters = { status: req.query.status, severity, house_id: req.query.house_id, assigned_to: req.query.assigned_to };
      const result = await risksService.findAll(company_id, filters, page, limit);
      return res.json({ success: true, data: result.risks, meta: { total: result.total, page, limit, pages: result.pages } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch risks';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const risk = await risksService.findById(req.params.id, company_id);
      
      // Enforce house scope restriction for service-level roles
      const userRole = req.user!.role?.toUpperCase() || '';
      if (['TEAM_LEADER', 'REGISTERED_MANAGER'].includes(userRole)) {
        const userHouseIds = req.user!.house_ids || [];
        if (!userHouseIds.includes(risk.house_id)) {
          return res.status(404).json({ success: false, message: 'Risk not found', errors: [] });
        }
      }

      return res.json({ success: true, data: risk, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Risk not found';
      return res.status(404).json({ success: false, message, errors: [] });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const risk = await risksService.update(req.params.id, company_id, req.user!.user_id, req.body);
      return res.json({ success: true, data: risk, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update risk';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      await risksService.delete(req.params.id, company_id, req.user!.user_id);
      return res.json({ success: true, data: { message: 'Risk closed' }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete risk';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async addEvent(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const event = await risksService.addEvent(req.params.id, company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: event, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add event';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async addAction(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const action = await risksService.addAction(req.params.id, company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: action, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add action';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getActions(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const actions = await risksService.getActions(req.params.id, company_id);
      return res.json({ success: true, data: { actions }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve actions';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getAllActions(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const filters = { 
        house_id: req.query.house_id, 
        status: req.query.status,
        pending_review: req.query.pending_review 
      };

      const actions = await risksService.findAllActions(company_id, filters);
      return res.json({ success: true, data: actions, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve all actions';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async updateActionStatus(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const action = await risksService.updateActionStatus(
        req.params.actionId,
        req.params.id,
        company_id,
        req.user!.user_id,
        req.body.status
      );
      return res.json({ success: true, data: action, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update action status';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async verifyAction(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const action = await risksService.verifyAction(
        req.params.actionId,
        req.params.id,
        company_id,
        { id: req.user!.user_id, role: req.user!.role! },
        req.body
      );
      return res.json({ success: true, data: action, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to verify action';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async escalate(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await risksService.escalate(req.params.id, company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to escalate risk';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getTimeline(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const timeline = await risksService.getTimeline(req.params.id, company_id);
      return res.json({ success: true, data: timeline, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get timeline';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getCategories(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const categories = await risksService.getCategories(company_id);
      return res.json({ success: true, data: categories, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch categories';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async createCategory(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const category = await risksService.createCategory(company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: category, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create category';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getAttachments(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const attachments = await risksService.getAttachments(req.params.id, company_id);
      return res.json({ success: true, data: attachments, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get attachments';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async addAttachment(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const attachment = await risksService.addAttachment(req.params.id, company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: attachment, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add attachment';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async dismissCandidate(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const user_id = req.user!.user_id;
      const { candidate_id, reason } = req.body;
      
      if (!candidate_id || !reason) {
        return res.status(400).json({ success: false, message: 'candidate_id and reason are required' });
      }

      await risksService.dismissCandidate(company_id, user_id, candidate_id, reason);
      return res.json({ success: true, message: 'Risk candidate dismissed successfully' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to dismiss candidate';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async removeAttachment(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      await risksService.removeAttachment(req.params.id, company_id, req.user!.user_id, req.params.attachmentId);
      return res.json({ success: true, data: { message: 'Attachment removed' }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove attachment';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async assignRisk(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await risksService.assignRisk(req.params.id, company_id, req.user!.user_id, req.body.assigned_to);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign risk';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getAssignedToMe(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await risksService.getAssignedToMe(company_id, req.user!.user_id, page, limit);
      return res.json({ success: true, data: result.risks, meta: { total: result.total, page, limit, pages: result.pages } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch assigned risks';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await risksService.updateStatus(req.params.id, company_id, req.user!.user_id, req.body.status);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update risk status';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getMetricsSummary(req: Request, res: Response) {
    try {
      return res.json({ success: true, data: { total_risks: 0, critical_risks: 0 }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get metrics summary';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async bulkReassign(req: Request, res: Response) {
    try {
      return res.json({ success: true, data: { message: 'Risks reassigned successfully' }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to bulk reassign risks';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }
}

export const risksController = new RisksController();
