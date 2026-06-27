import { Request, Response } from 'express';
import { reportsService } from '../services/reports.service';
import { reportsDataService } from '../services/reportsData.service';
import { reconstructionService, ReconstructionScope } from '../services/reconstruction.service';
import { narrativeService } from '../services/narrative.service';
import { query } from '../config/database';

export class ReportsController {
  // ─── Canonical report data (spec module 10: only four reports) ──────────────
  async weeklyGovernance(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await reportsDataService.weeklyGovernance(company_id, req.query.service_id as string, req.query.start as string, req.query.end as string);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build weekly governance report', errors: [] });
    }
  }

  async strategicRisks(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await reportsDataService.strategicRisks(company_id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build strategic risk report', errors: [] });
    }
  }

  async escalationsReport(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await reportsDataService.escalations(company_id, req.query.start as string, req.query.end as string);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build escalation report', errors: [] });
    }
  }

  async reconstructionReport(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const scope = (req.query.scope as ReconstructionScope) || 'service';
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ success: false, message: 'id query param is required', errors: [] });
      const data = await reconstructionService.reconstruct(company_id, scope, id, req.query.start as string, req.query.end as string);
      return res.json({ success: true, data: { report: 'Reconstruction Report', ...data }, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build reconstruction report', errors: [] });
    }
  }
  async crossServiceControl(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await reportsDataService.crossServiceControl(company_id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build cross-service control report', errors: [] });
    }
  }

  async inspectionEvidence(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await reportsDataService.inspectionEvidence(company_id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build inspection evidence pack', errors: [] });
    }
  }

  // Locked reconstructions (built + locked in the Reconstruction wizard) so they
  // appear in the report set instead of being disconnected from Reports. (Bug B6.)
  async savedReconstructions(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const r = await query(
        `SELECT id, scope, scope_label, incident_date, trajectory, narrative,
                summary, timeline_events, status, locked_at, created_at
           FROM governance_reconstructions
          WHERE company_id = $1 AND status = 'Locked'
          ORDER BY locked_at DESC NULLS LAST, created_at DESC`,
        [company_id]
      );
      return res.json({ success: true, data: r.rows, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to load saved reconstructions', errors: [] });
    }
  }

  // AI narrative draft for a report. The frontend posts the structured report data
  // it already fetched; we return prose for the manager to review and edit.
  async narrative(req: Request, res: Response) {
    try {
      const { reportTitle, periodLabel, serviceName, data } = req.body || {};
      if (!reportTitle || data === undefined) {
        return res.status(400).json({ success: false, message: 'reportTitle and data are required', errors: [] });
      }
      const result = await narrativeService.generate({ reportTitle, periodLabel, serviceName, data });
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to generate narrative', errors: [] });
    }
  }

  async request(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;

      // Enforce RM/TL report scoping
      const rbacRoles = ['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'];
      const userRole = req.user!.role.toUpperCase();
      if (!req.body.parameters) req.body.parameters = {};
      
      if (!rbacRoles.includes(userRole)) {
        if (!req.user!.assigned_house_id) {
          return res.status(403).json({ success: false, message: 'Access denied: No house assigned for reporting.', errors: [] });
        }
        if (req.body.parameters.house_id && req.body.parameters.house_id !== req.user!.assigned_house_id) {
          return res.status(403).json({ success: false, message: 'Access denied: Cannot generate cross-house reports.', errors: [] });
        }
        // Force scoping
        req.body.parameters.house_id = req.user!.assigned_house_id;
      }

      const report = await reportsService.requestReport(company_id, req.user!.user_id, req.body);
      return res.status(202).json({ success: true, data: report, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to request report', errors: [] });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await reportsService.findAll(company_id, page, limit);
      return res.json({ success: true, data: result.reports, meta: { total: result.total, page, limit } });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch reports', errors: [] });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const report = await reportsService.findById(req.params.id, company_id);
      return res.json({ success: true, data: report, meta: {} });
    } catch (err: unknown) {
      return res.status(404).json({ success: false, message: err instanceof Error ? err.message : 'Report not found', errors: [] });
    }
  }

  async download(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await reportsService.getDownloadUrl(req.params.id, company_id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Download unavailable', errors: [] });
    }
  }
}

export const reportsController = new ReportsController();
