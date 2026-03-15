import { Request, Response } from 'express';
import { notificationsService } from '../services/notifications.service';

export class NotificationsController {
  async findAll(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await notificationsService.findAll(req.user!.user_id, company_id, page, limit);
      return res.json({ success: true, data: result.notifications, meta: { total: result.total, unread_count: result.unread_count, page, limit } });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch notifications', errors: [] });
    }
  }

  async markRead(req: Request, res: Response) {
    try {
      await notificationsService.markRead(req.params.id, req.user!.user_id);
      return res.json({ success: true, data: { message: 'Marked as read' }, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to mark notification', errors: [] });
    }
  }

  async markAllRead(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await notificationsService.markAllRead(req.user!.user_id, company_id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to mark all', errors: [] });
    }
  }

  async getPreferences(req: Request, res: Response) {
    try {
      const prefs = await notificationsService.getPreferences(req.user!.user_id);
      return res.json({ success: true, data: prefs, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to get preferences', errors: [] });
    }
  }

  async updatePreferences(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      await notificationsService.updatePreferences(req.user!.user_id, company_id, req.body);
      return res.json({ success: true, data: { message: 'Preferences updated' }, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to update preferences', errors: [] });
    }
  }
}

export const notificationsController = new NotificationsController();
