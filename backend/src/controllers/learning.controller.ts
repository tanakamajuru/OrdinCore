import { Request, Response } from 'express';
import { learningService, LearningSource } from '../services/learning.service';
import { governancePdfService } from '../services/governancePdf.service';

export class LearningController {
  async downloadPdf(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { content, filename, contentType } = await governancePdfService.learningRecord(req.params.id, company_id);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(content);
    } catch (err: unknown) {
      return res.status(404).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build learning record PDF' });
    }
  }

  async downloadSummaryPdf(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const houseIds = (req.user as any)?.assigned_house_ids as string[] | undefined;
      const role = String(req.user!.role || '').toUpperCase();
      const scoped = ['DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN'].includes(role) ? null : (houseIds || null);
      const { content, filename, contentType } = await governancePdfService.learningSummary(company_id, {
        houseIds: scoped,
        state: req.query.state as string | undefined,
        progress: req.query.progress as string | undefined,
      });
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(content);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build learning summary PDF' });
    }
  }

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

  async recordImplementation(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const record = await learningService.recordImplementation(req.params.id, company_id, req.user!.user_id!, req.body?.evidence);
      return res.json({ success: true, data: record });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to record implementation' });
    }
  }

  async verifyImprovement(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const record = await learningService.verifyImprovement(req.params.id, company_id, req.user!.user_id!, req.body?.outcome, req.body?.evidence, req.body?.review_due_at);
      return res.json({ success: true, data: record });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to verify improvement' });
    }
  }

  async markDuplicate(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const record = await learningService.markDuplicate(req.params.id, company_id, req.body?.duplicate_of_id);
      return res.json({ success: true, data: record });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to mark as already recorded' });
    }
  }

  async assess(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const record = await learningService.assess(req.params.id, company_id, req.user!.user_id!, req.body || {});
      return res.json({ success: true, data: record });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to complete the learning assessment' });
    }
  }
}

export const learningController = new LearningController();
