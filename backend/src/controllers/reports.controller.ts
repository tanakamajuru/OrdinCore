import { Request, Response } from 'express';
import { reportsService } from '../services/reports.service';

export class ReportsController {
  async request(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const report = await reportsService.requestReport(company_id, req.user!.user_id, req.body);
      return res.status(202).json({ success: true, data: report, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to request report', errors: [] });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await reportsService.findAll(company_id, page, limit);
      return res.json({ success: true, data: result.reports, meta: { total: result.total, page, limit } });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch reports', errors: [] });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const report = await reportsService.findById(req.params.id, company_id);
      return res.json({ success: true, data: report, meta: {} });
    } catch (err: unknown) {
      return res.status(404).json({ success: false, message: err instanceof Error ? err.message : 'Report not found', errors: [] });
    }
  }

  async download(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await reportsService.getDownloadUrl(req.params.id, company_id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Download unavailable', errors: [] });
    }
  }
}

export const reportsController = new ReportsController();
