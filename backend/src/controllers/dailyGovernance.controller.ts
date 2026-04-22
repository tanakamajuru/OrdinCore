import { Request, Response } from 'express';
import { dailyGovernanceService } from '../services/dailyGovernance.service';
import logger from '../utils/logger';

export class DailyGovernanceController {
  async openLog(req: Request, res: Response) {
    try {
      const { house_id } = req.body;
      const user_id = req.user!.user_id;
      const company_id = req.user!.company_id!;
      const log = await dailyGovernanceService.openLog(house_id, user_id, company_id);
      return res.status(201).json({ success: true, data: log });
    } catch (err: any) {
      logger.error('Error opening governance log', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async completeLog(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const user_id = req.user!.user_id;
      const company_id = req.user!.company_id!;
      const log = await dailyGovernanceService.completeLog(id, note, user_id, company_id);
      return res.json({ success: true, data: log });
    } catch (err: any) {
      logger.error('Error completing governance log', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getCoverage(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const coverage = await dailyGovernanceService.getCoverage(company_id);
      return res.json({ success: true, data: coverage });
    } catch (err: any) {
      logger.error('Error fetching governance coverage', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const dailyGovernanceController = new DailyGovernanceController();
