import { Request, Response } from 'express';
import { interventionsService } from '../services/interventions.service';
import { interventionLinksService } from '../services/interventionLinks.service';
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
  listActions: async (req: Request, res: Response) => {
    try { res.json({ success: true, data: await interventionLinksService.listLinkedActions(cid(req), req.params.id), meta: {} }); }
    catch (e) { fail(res, e); }
  },
  linkActions: async (req: Request, res: Response) => {
    try { res.json({ success: true, data: await interventionLinksService.linkActions(cid(req), req.user!.user_id, req.params.id, req.body?.action_ids || []), meta: {} }); }
    catch (e) { fail(res, e); }
  },
  unlinkAction: async (req: Request, res: Response) => {
    try { res.json({ success: true, data: await interventionLinksService.unlinkAction(cid(req), req.user!.user_id, req.params.id, req.params.actionId), meta: {} }); }
    catch (e) { fail(res, e); }
  },
  linkHistory: async (req: Request, res: Response) => {
    try { res.json({ success: true, data: await interventionLinksService.linkHistory(cid(req), req.params.id), meta: {} }); }
    catch (e) { fail(res, e); }
  },
};
