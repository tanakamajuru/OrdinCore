import { Request, Response } from 'express';
import { systemService } from '../services/system.service';

export class SystemController {
  async getSettings(req: Request, res: Response) {
    try {
      const group = req.query.group as string;
      const settings = await systemService.getSettings(group);
      return res.json({ success: true, data: settings, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch settings';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async updateSettings(req: Request, res: Response) {
    try {
      const updates = req.body.settings; // Expected array of {key, value}
      if (!Array.isArray(updates)) throw new Error('Invalid settings format');
      
      const updated = await systemService.updateSettings(updates, req.user!.user_id);
      return res.json({ success: true, data: updated, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getAuditLogs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const filters = {
        event_type: req.query.event_type as string,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string
      };
      
      const logs = await systemService.getAuditLogs(page, limit, filters);
      return res.json({ success: true, data: logs.logs, meta: { total: logs.total, page: logs.page, limit: logs.limit, pages: logs.pages } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch audit logs';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async getJobLogs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const logs = await systemService.getJobLogs(page, limit);
      return res.json({ success: true, data: logs.logs, meta: { total: logs.total, page: logs.page, limit: logs.limit, pages: logs.pages } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch job logs';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }
}

export const systemController = new SystemController();
