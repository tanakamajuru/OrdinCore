import { Request, Response } from 'express';
import { governanceReviewsService } from '../services/governanceReviews.service';

export class GovernanceReviewsController {
  async create(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await governanceReviewsService.create(company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to create governance review', errors: [] });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await governanceReviewsService.list(company_id, {
        risk_id: req.query.risk_id as string,
        escalation_id: req.query.escalation_id as string,
        review_type: req.query.review_type as string,
      });
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to list governance reviews', errors: [] });
    }
  }

  async getQueue(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await governanceReviewsService.getQueue(company_id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to load governance review queue', errors: [] });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await governanceReviewsService.getById(req.params.id, company_id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(404).json({ success: false, message: err instanceof Error ? err.message : 'Governance review not found', errors: [] });
    }
  }
}

export const governanceReviewsController = new GovernanceReviewsController();
