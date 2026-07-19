import { Request, Response } from 'express';
import { interventionsService } from '../services/interventions.service';
import { riskMetricsService } from '../services/riskMetrics.service';

const cid = (req: Request) => req.user!.company_id!;
const fail = (res: Response, e: unknown) =>
  res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Error', errors: [] });

export const interventionsController = {
  themes: async (req: Request, res: Response) => {
    try { res.json({ success: true, data: await interventionsService.themes(cid(req)), meta: {} }); }
    catch (e) { fail(res, e); }
  },
  upsert: async (req: Request, res: Response) => {
    try { res.json({ success: true, data: await interventionsService.upsertIntervention(cid(req), req.user!.user_id, req.body), meta: {} }); }
    catch (e) { fail(res, e); }
  },
  governanceHealth: async (req: Request, res: Response) => {
    try { res.json({ success: true, data: await riskMetricsService.governanceHealth(cid(req)), meta: {} }); }
    catch (e) { fail(res, e); }
  },
};
