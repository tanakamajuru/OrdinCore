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
      const filters = { 
        status: req.query.status, 
        house_id: req.query.house_id,
        assigned_user_id: req.query.assigned_user_id
      };
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

  async getTemplateQuestions(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const questions = await governanceService.getTemplateQuestions(req.params.id, company_id);
      return res.json({ success: true, data: questions, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get template questions';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async addTemplateQuestion(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const question = await governanceService.addTemplateQuestion(req.params.id, company_id, req.body);
      return res.status(201).json({ success: true, data: question, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add template question';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async updateTemplateQuestion(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const question = await governanceService.updateTemplateQuestion(req.params.questionId, req.params.id, company_id, req.body);
      return res.json({ success: true, data: question, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update template question';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async removeTemplateQuestion(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      await governanceService.removeTemplateQuestion(req.params.questionId, req.params.id, company_id);
      return res.json({ success: true, data: { message: 'Question removed' }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove template question';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getPulseAnswers(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const answers = await governanceService.getPulseAnswers(req.params.id, company_id);
      return res.json({ success: true, data: answers, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get pulse answers';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async updatePulseStatus(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await governanceService.updatePulseStatus(req.params.id, company_id, req.body.status);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update pulse status';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getClusters(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const filters = { house_id: req.query.house_id as string, status: req.query.status as string };
      const clusters = await governanceService.getClusters(company_id, filters);
      return res.json({ success: true, data: clusters });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch clusters';
      return res.status(500).json({ success: false, message });
    }
  }

  async getRiskCandidates(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const filters = { house_id: req.query.house_id as string, status: req.query.status as string };
      const candidates = await governanceService.getRiskCandidates(company_id, filters);
      return res.json({ success: true, data: candidates });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch risk candidates';
      return res.status(500).json({ success: false, message });
    }
  }

  async getActionEffectiveness(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const filters = { house_id: req.query.house_id as string };
      const effectiveness = await governanceService.getActionEffectiveness(company_id, filters);
      return res.json({ success: true, data: effectiveness });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch action effectiveness';
      return res.status(500).json({ success: false, message });
    }
  }
}

export const governanceController = new GovernanceController();
