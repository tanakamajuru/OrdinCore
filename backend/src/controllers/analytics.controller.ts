import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';

export class AnalyticsController {
  async riskTrends(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const days = parseInt(req.query.days as string) || 30;
      const data = await analyticsService.getRiskTrends(company_id, days);
      return res.json({ success: true, data, meta: { days } });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to get risk trends', errors: [] });
    }
  }

  async sitePerformance(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await analyticsService.getSitePerformance(company_id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to get site performance', errors: [] });
    }
  }

  async governanceCompliance(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const days = parseInt(req.query.days as string) || 90;
      const data = await analyticsService.getGovernanceCompliance(company_id, days);
      return res.json({ success: true, data, meta: { days } });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to get governance compliance', errors: [] });
    }
  }

  async escalationRate(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const days = parseInt(req.query.days as string) || 30;
      const data = await analyticsService.getEscalationRate(company_id, days);
      return res.json({ success: true, data, meta: { days } });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to get escalation rate', errors: [] });
    }
  }

  async dashboard(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await analyticsService.getDashboardSummary(company_id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to get dashboard', errors: [] });
    }
  }
}

export const analyticsController = new AnalyticsController();
