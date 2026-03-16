import { Request, Response } from 'express';
import { weeklyReviewsService } from '../services/weeklyReviews.service';

export class WeeklyReviewsController {
  async save(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const review = await weeklyReviewsService.save(company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to save weekly review' });
    }
  }

  async findByHouse(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const reviews = await weeklyReviewsService.findByHouse(company_id, req.params.houseId);
      return res.json({ success: true, data: reviews });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch weekly reviews' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const review = await weeklyReviewsService.findById(req.params.id, company_id);
      return res.json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(404).json({ success: false, message: 'Weekly review not found' });
    }
  }
}

export const weeklyReviewsController = new WeeklyReviewsController();
