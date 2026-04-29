import { Request, Response } from 'express';
import { directorGovernanceService } from '../services/directorGovernance.service';
import logger from '../utils/logger';

export const directorGovernanceController = {
  async getEffectivenessSummary(req: Request, res: Response) {
    try {
      const { start, end } = req.query;
      const companyId = (req as any).user.company_id;
      
      const summary = await directorGovernanceService.getActionEffectivenessSummary(
        companyId, 
        { 
          start: (start as string) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: (end as string) || new Date().toISOString()
        }
      );
      
      res.json({ status: 'success', data: summary });
    } catch (error: any) {
      logger.error('Failed to get effectiveness summary:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  async getControlFailures(req: Request, res: Response) {
    try {
      const companyId = (req as any).user.company_id;
      const failures = await directorGovernanceService.getControlFailures(companyId);
      res.json({ status: 'success', data: failures });
    } catch (error: any) {
      logger.error('Failed to get control failures:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  async resolveControlFailure(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const userId = (req as any).user.user_id;
      
      const resolved = await directorGovernanceService.resolveControlFailure(id, userId, note);
      res.json({ status: 'success', data: resolved });
    } catch (error: any) {
      logger.error('Failed to resolve control failure:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  async generateMonthlyReportDraft(req: Request, res: Response) {
    try {
      const { periodStart, periodEnd } = req.query;
      const companyId = (req as any).user.company_id;
      const directorId = (req as any).user.user_id;
      
      if (!periodStart || !periodEnd) {
        return res.status(400).json({ status: 'error', message: 'periodStart and periodEnd are required' });
      }

      const draft = await directorGovernanceService.generateMonthlyBoardReportDraft(
        companyId,
        directorId,
        periodStart as string,
        periodEnd as string
      );
      
      res.json({ status: 'success', data: draft });
    } catch (error: any) {
      logger.error('Failed to generate monthly report draft:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  async finaliseMonthlyReport(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { final_narrative } = req.body;
      const userId = (req as any).user.user_id;
      
      const report = await directorGovernanceService.finaliseMonthlyReport(id, userId, final_narrative);
      res.json({ status: 'success', data: report });
    } catch (error: any) {
      logger.error('Failed to finalise monthly report:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  async getUnacknowledgedIncidents(req: Request, res: Response) {
    try {
      const companyId = (req as any).user.company_id;
      const incidents = await directorGovernanceService.getUnacknowledgedSeriousIncidents(companyId);
      res.json({ status: 'success', data: incidents });
    } catch (error: any) {
      logger.error('Failed to get unacknowledged incidents:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  async createIntervention(req: Request, res: Response) {
    try {
      const directorId = (req as any).user.user_id;
      const intervention = await directorGovernanceService.createIntervention(directorId, req.body);
      res.json({ status: 'success', data: intervention });
    } catch (error: any) {
      logger.error('Failed to create intervention:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
};
