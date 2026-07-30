import { Request, Response } from 'express';
import { frozenReportService } from '../services/frozen-report.service';
import { renderSnapshotPdf } from '../renderers/frozen-pdf.renderer';
import { REPORT_CATALOG } from '../config/report-catalog';
import logger from '../../utils/logger';

function authUser(req: Request) {
  return {
    user_id: req.user!.user_id,
    company_id: req.user!.company_id,
    role: req.user!.role,
    assigned_house_ids: req.user!.assigned_house_ids,
  };
}

export const frozenReportsController = {
  // The frozen catalogue + which scopes each report supports.
  catalog(_req: Request, res: Response) {
    return res.json({ success: true, data: REPORT_CATALOG, meta: {} });
  },

  async generate(req: Request, res: Response) {
    try {
      const reportKey = req.params.reportKey;
      const { scope, periodStart, periodEnd, timezone } = req.body || {};
      if (!scope?.type || !periodStart || !periodEnd) {
        return res.status(400).json({ success: false, message: 'scope.type, periodStart and periodEnd are required.' });
      }
      const out = await frozenReportService.generate(authUser(req), reportKey, { scope, periodStart, periodEnd, timezone });
      return res.status(201).json({ success: true, data: out, meta: {} });
    } catch (err: any) {
      return res.status(err.statusCode ?? 400).json({ success: false, message: err.message });
    }
  },

  async approve(req: Request, res: Response) {
    try {
      const out = await frozenReportService.approve(req.params.id, authUser(req));
      return res.json({ success: true, data: out, meta: {} });
    } catch (err: any) {
      return res.status(err.statusCode ?? 400).json({ success: false, message: err.message });
    }
  },

  async list(req: Request, res: Response) {
    try {
      const rows = await frozenReportService.list(req.user!.company_id!, req.query.reportKey as string | undefined);
      return res.json({ success: true, data: rows, meta: {} });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async get(req: Request, res: Response) {
    try {
      const row = await frozenReportService.get(req.params.id, req.user!.company_id!);
      return res.json({ success: true, data: row, meta: {} });
    } catch (err: any) {
      return res.status(404).json({ success: false, message: err.message });
    }
  },

  async download(req: Request, res: Response) {
    try {
      const row = await frozenReportService.get(req.params.id, req.user!.company_id!);
      const buffer = await renderSnapshotPdf(row);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${row.report_key}-${String(row.created_at).slice(0, 10)}.pdf"`);
      return res.send(buffer);
    } catch (err: any) {
      logger.error('Frozen report download failed', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  },
};
