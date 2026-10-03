import { Request, Response } from 'express';
import { learningService, LearningSource, LearningProgress } from '../services/learning.service';

export class LearningController {
  async create(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const author_id = req.user!.user_id!;
      const record = await learningService.create(company_id, author_id, req.body);
      return res.status(201).json({ success: true, data: record });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to record learning' });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const houseIds = (req.user as any)?.assigned_house_ids as string[] | undefined;
      const role = String(req.user!.role || '').toUpperCase();
      // Org-wide roles see everything; service roles are scoped to their houses.
      const scoped = ['DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN'].includes(role) ? null : (houseIds || null);
      const rows = await learningService.list(company_id, {
        houseIds: scoped,
        state: req.query.state as string | undefined,
        progress: req.query.progress as string | undefined,
      });
      return res.json({ success: true, data: rows });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to load learning register' });
    }
  }

  async listBySource(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { source_type, source_id } = req.query as { source_type?: string; source_id?: string };
      if (!source_type || !source_id) return res.status(400).json({ success: false, message: 'source_type and source_id are required' });
      const rows = await learningService.listBySource(company_id, source_type as LearningSource, source_id);
      return res.json({ success: true, data: rows });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to load learning' });
    }
  }

  async approve(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const record = await learningService.approve(req.params.id, company_id, req.user!.user_id!);
      return res.json({ success: true, data: record });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to approve learning' });
    }
  }

  async setProgress(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const record = await learningService.setProgress(req.params.id, company_id, (req.body?.progress) as LearningProgress);
      return res.json({ success: true, data: record });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to update learning progress' });
    }
  }
}

export const learningController = new LearningController();
