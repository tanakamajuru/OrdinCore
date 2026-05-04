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

  async prepareReview(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { house_id, week_ending } = req.query;

      // Validate house_id as UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!house_id || !uuidRegex.test(house_id as string)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing house_id. Please ensure a house is selected.' });
      }

      const data = await weeklyReviewsService.prepareReview(company_id, house_id as string, week_ending as string);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to prepare weekly review' });
    }
  }

  async update(req: Request, res: Response) {

    try {
      const company_id = req.user!.company_id!;
      const { id } = req.params;
      const existing = await weeklyReviewsService.findById(id, company_id);
      if (!existing) return res.status(404).json({ success: false, message: 'Review not found' });

      const review = await weeklyReviewsService.save(company_id, req.user!.user_id, {
        house_id: existing.house_id,
        week_ending: existing.week_ending,
        ...req.body
      });
      return res.json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to update weekly review' });
    }
  }

  async complete(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const review = await weeklyReviewsService.complete(req.params.id, company_id, req.user!.user_id);
      return res.json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to complete weekly review' });
    }
  }

  async finalise(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const review = await weeklyReviewsService.finalise(req.params.id, company_id, req.user!.user_id);
      return res.json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to finalise weekly review' });
    }
  }

  async validate(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const review = await weeklyReviewsService.validate(req.params.id, company_id, req.user!.user_id, req.body);
      return res.json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to validate weekly review' });
    }
  }
}


export const weeklyReviewsController = new WeeklyReviewsController();
