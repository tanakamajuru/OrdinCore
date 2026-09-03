import { Request, Response } from 'express';
import { helpService } from '../services/help.service';

export const helpController = {
  // Reader: articles for the current user's role.
  async listForMe(req: Request, res: Response) {
    try {
      const { company_id, role } = (req as any).user;
      const data = await helpService.listForRole(company_id, role);
      return res.json({ success: true, data, meta: {} });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to load help content' });
    }
  },

  // Admin: manage all articles.
  async listAll(req: Request, res: Response) {
    try {
      const { company_id } = (req as any).user;
      const data = await helpService.listAll(company_id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to load help content' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { company_id, user_id } = (req as any).user;
      const data = await helpService.create(company_id, user_id, req.body);
      return res.status(201).json({ success: true, data, meta: {} });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to create help content' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { company_id } = (req as any).user;
      const data = await helpService.update(company_id, req.params.id, req.body);
      return res.json({ success: true, data, meta: {} });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to update help content' });
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const { company_id } = (req as any).user;
      const data = await helpService.remove(company_id, req.params.id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to delete help content' });
    }
  },
};
