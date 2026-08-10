import { Request, Response } from 'express';
import { dailyGovernanceService } from '../services/dailyGovernance.service';
import { query } from '../config/database';
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
      const { note, is_deputy_review, leadership_narrative, team_brief, material_change, decisions } = req.body;
      const user_id = req.user!.user_id;
      const company_id = req.user!.company_id!;
      const log = await dailyGovernanceService.completeLog(id, {
        note, user_id, company_id, is_deputy_review,
        leadership_narrative, team_brief, material_change,
        decisions: Array.isArray(decisions) ? decisions : undefined,
      });
      return res.json({ success: true, data: log });
    } catch (err: any) {
      logger.error('Error completing governance log', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // TL-facing: the latest published Team Brief for the TL's assigned services today.
  async getTeamBrief(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const user_id = req.user!.user_id;
      const hres = await query(`SELECT house_id FROM user_houses WHERE user_id = $1`, [user_id]);
      const house_ids = hres.rows.map((r: any) => r.house_id);
      const brief = await dailyGovernanceService.latestTeamBrief(company_id, house_ids, user_id);
      return res.json({ success: true, data: brief, meta: {} });
    } catch (err: any) {
      logger.error('Error fetching team brief', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // Historical playback — the signed-off log for a service on a chosen date.
  async getLogForDate(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const house_id = String(req.query.house_id || '');
      const date = String(req.query.date || '');
      if (!house_id || !date) return res.status(400).json({ success: false, message: 'house_id and date are required', errors: [] });
      const log = await dailyGovernanceService.logForDate(company_id, house_id, date);
      return res.json({ success: true, data: log, meta: {} });
    } catch (err: any) {
      logger.error('Error fetching daily log for date', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // TL "Daily Governance" inbox — recent briefs for the TL's services.
  async getTeamBriefs(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const user_id = req.user!.user_id;
      const hres = await query(`SELECT house_id FROM user_houses WHERE user_id = $1`, [user_id]);
      const house_ids = hres.rows.map((r: any) => r.house_id);
      const briefs = await dailyGovernanceService.recentTeamBriefs(company_id, house_ids, user_id);
      return res.json({ success: true, data: briefs, meta: {} });
    } catch (err: any) {
      logger.error('Error fetching team briefs', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async acknowledgeBrief(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await dailyGovernanceService.acknowledgeBrief(id, req.user!.user_id, req.user!.company_id!);
      return res.json({ success: true, data, meta: {} });
    } catch (err: any) {
      logger.error('Error acknowledging brief', err);
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
