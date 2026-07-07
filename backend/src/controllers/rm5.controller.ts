import { Request, Response } from 'express';
import { rm5Service } from '../services/rm5.service';

const ok = (res: Response, data: any) => res.json({ success: true, data, meta: {} });
const fail = (res: Response, e: unknown) => res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Error', errors: [] });
const cid = (req: Request) => req.user!.company_id!;

export const rm5Controller = {
  today: async (req: Request, res: Response) => { try { ok(res, await rm5Service.today(cid(req))); } catch (e) { fail(res, e); } },
  counts: async (req: Request, res: Response) => { try { ok(res, await rm5Service.counts(cid(req))); } catch (e) { fail(res, e); } },
  patterns: async (req: Request, res: Response) => { try { ok(res, await rm5Service.patterns(cid(req))); } catch (e) { fail(res, e); } },
  register: async (req: Request, res: Response) => {
    try {
      const t = (['active', 'strategic', 'closed'].includes(String(req.query.type)) ? req.query.type : 'active') as 'active' | 'strategic' | 'closed';
      ok(res, await rm5Service.register(cid(req), t));
    } catch (e) { fail(res, e); }
  },
  actions: async (req: Request, res: Response) => { try { ok(res, await rm5Service.actionsLens(cid(req))); } catch (e) { fail(res, e); } },
  effectiveness: async (req: Request, res: Response) => { try { ok(res, await rm5Service.effectivenessLens(cid(req))); } catch (e) { fail(res, e); } },
};
