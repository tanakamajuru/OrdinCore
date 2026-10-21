import { Request, Response } from 'express';
import { governanceQueriesService } from '../services/governanceQueries.service';

const requireCompany = (req: Request): string => {
  const c = req.user?.company_id;
  if (!c) throw new Error('No company context.');
  return c;
};

export const governanceQueriesController = {
  async list(req: Request, res: Response) {
    try {
      const company_id = requireCompany(req);
      const data = await governanceQueriesService.list(company_id, {
        status: req.query.status as string | undefined,
        assigned_to: req.query.assigned_to as string | undefined,
        raised_by: req.query.raised_by as string | undefined,
      });
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const company_id = requireCompany(req);
      const data = await governanceQueriesService.create(company_id, req.user!.user_id, req.body || {});
      res.status(201).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  async respond(req: Request, res: Response) {
    try {
      const company_id = requireCompany(req);
      const { id } = req.params;
      const data = await governanceQueriesService.respond(id, company_id, req.user!.user_id, req.body?.response_text);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  async close(req: Request, res: Response) {
    try {
      const company_id = requireCompany(req);
      const { id } = req.params;
      const data = await governanceQueriesService.close(id, company_id, req.user!.user_id, req.body?.close_reason);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  async reopen(req: Request, res: Response) {
    try {
      const company_id = requireCompany(req);
      const { id } = req.params;
      const data = await governanceQueriesService.reopen(id, company_id, req.body?.reopen_reason);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  },
};
