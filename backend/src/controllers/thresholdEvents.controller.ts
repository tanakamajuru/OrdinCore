import { Request, Response } from 'express';
import { thresholdEventsRepo } from '../repositories/thresholdEvents.repo';

export class ThresholdEventsController {
  async findAll(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const filters = {
        output_type: req.query.output_type as string,
        house_id: req.query.house_id as string,
      };
      const events = await thresholdEventsRepo.findAll(company_id, filters);
      return res.json({ success: true, data: events, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch threshold events';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }
}

export const thresholdEventsController = new ThresholdEventsController();
