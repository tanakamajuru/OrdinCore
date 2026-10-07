import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { dailyGovernanceService } from '../services/dailyGovernance.service';
import { query } from '../config/database';
import logger from '../utils/logger';

export class DailyGovernanceController {
  // Presentable, portable PDF of a single published Daily Governance brief — for handovers and
  // supervision files. Built from the stored brief so the PDF and the in-app view cannot diverge.
  async downloadDailyPdf(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const user_id = req.user!.user_id;
      const hres = await query(`SELECT house_id FROM user_houses WHERE user_id = $1`, [user_id]);
      const house_ids = hres.rows.map((r: any) => r.house_id);
      const b = await dailyGovernanceService.dailyBriefForPdf(company_id, house_ids, req.params.id);
      if (!b) return res.status(404).json({ success: false, message: 'Daily governance brief not found' });

      const dateLabel = b.review_date ? new Date(`${b.review_date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const safe = `daily-governance-${b.house_name || 'service'}-${b.review_date || ''}`.replace(/[^a-z0-9-_]/gi, '').slice(0, 70) || 'daily-governance';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safe}.pdf"`);

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.pipe(res);

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f766e').text('PUBLISHED DAILY GOVERNANCE BRIEF', { characterSpacing: 1 });
      doc.moveDown(0.3).fillColor('#0f172a').fontSize(20).text('Daily Governance Review');
      doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor('#555');
      doc.text(`${b.house_name || 'Service'}${dateLabel ? ' · ' + dateLabel : ''}`);
      doc.text(`Prepared by ${b.prepared_by || 'Registered Manager'}${b.published_at ? ' · published ' + new Date(b.published_at).toLocaleString('en-GB') : ''}`);
      doc.fillColor('#000').moveDown(0.6);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke().moveDown(0.6);

      const section = (title: string) => { doc.moveDown(0.5).font('Helvetica-Bold').fontSize(12).fillColor('#0f766e').text(title.toUpperCase()); doc.moveDown(0.2).font('Helvetica').fontSize(10.5).fillColor('#000'); };

      section('Overall position');
      if (!b.material_change || !b.team_brief) {
        doc.text('No material change was declared. The Registered Manager published a positive confirmation; existing actions continue.');
      } else {
        doc.text(String(b.leadership_narrative || '').trim() || 'See the team brief below.');
      }

      if (b.team_brief && b.material_change) {
        section('Team brief');
        doc.text(String(b.team_brief).trim());
      }

      const priorities: any[] = Array.isArray(b.priorities) ? b.priorities : [];
      if (priorities.length) {
        section('Decisions recorded');
        priorities.forEach((p: any) => {
          const due = p.dueLabel ? ' · due ' + new Date(p.dueLabel).toLocaleDateString('en-GB') : '';
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(`• ${p.decision || 'Decision'}${p.owner ? ' · ' + p.owner : ''}${due}`);
          if (p.title) doc.font('Helvetica').fontSize(10).fillColor('#333').text(`   ${String(p.title).trim()}`);
          if (p.rationale) doc.font('Helvetica-Oblique').fontSize(9.5).fillColor('#555').text(`   Rationale: ${String(p.rationale).trim()}`);
          doc.moveDown(0.25);
        });
      }

      doc.moveDown(1).font('Helvetica-Oblique').fontSize(8.5).fillColor('#94a3b8')
        .text('Generated from the published governance record. Completion records activity; effectiveness is rated separately.', { align: 'center' });

      doc.end();
    } catch (err: any) {
      logger.error('Error generating daily governance PDF', err);
      if (!res.headersSent) res.status(500).json({ success: false, message: err.message });
    }
  }

  async openLog(req: Request, res: Response) {
    try {
      const { house_id } = req.body;
      const user_id = req.user!.user_id;
      const company_id = req.user!.company_id!;
      const log = await dailyGovernanceService.openLog(house_id, user_id, company_id);
      return res.status(201).json({ success: true, data: log });
    } catch (err: any) {
      logger.error('Error opening governance log', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async completeLog(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { note, is_deputy_review, leadership_narrative, team_brief, material_change, decisions, exceptions_acknowledged } = req.body;
      const user_id = req.user!.user_id;
      const company_id = req.user!.company_id!;
      const log = await dailyGovernanceService.completeLog(id, {
        note, user_id, company_id, is_deputy_review,
        leadership_narrative, team_brief, material_change,
        exceptions_acknowledged: !!exceptions_acknowledged,
        decisions: Array.isArray(decisions) ? decisions : undefined,
      });
      return res.json({ success: true, data: log });
    } catch (err: any) {
      logger.error('Error completing governance log', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // TL-facing: the latest published Team Brief for the TL's assigned services today.
  async getTeamBrief(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const user_id = req.user!.user_id;
      const hres = await query(`SELECT house_id FROM user_houses WHERE user_id = $1`, [user_id]);
      const house_ids = hres.rows.map((r: any) => r.house_id);
      const brief = await dailyGovernanceService.latestTeamBrief(company_id, house_ids, user_id);
      return res.json({ success: true, data: brief, meta: {} });
    } catch (err: any) {
      logger.error('Error fetching team brief', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // Historical playback — the signed-off log for a service on a chosen date.
  async getLogForDate(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const house_id = String(req.query.house_id || '');
      const date = String(req.query.date || '');
      if (!house_id || !date) return res.status(400).json({ success: false, message: 'house_id and date are required', errors: [] });
      const log = await dailyGovernanceService.logForDate(company_id, house_id, date);
      return res.json({ success: true, data: log, meta: {} });
    } catch (err: any) {
      logger.error('Error fetching daily log for date', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // TL "Daily Governance" inbox — recent briefs for the TL's services.
  async getTeamBriefs(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const user_id = req.user!.user_id;
      const hres = await query(`SELECT house_id FROM user_houses WHERE user_id = $1`, [user_id]);
      const house_ids = hres.rows.map((r: any) => r.house_id);
      // Optional date range turns the inbox into a by-date archive (see recentTeamBriefs).
      const isDate = (v: any) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
      const from = isDate(req.query.from) ? String(req.query.from) : undefined;
      const to = isDate(req.query.to) ? String(req.query.to) : undefined;
      const briefs = await dailyGovernanceService.recentTeamBriefs(company_id, house_ids, user_id, from, to);
      return res.json({ success: true, data: briefs, meta: {} });
    } catch (err: any) {
      logger.error('Error fetching team briefs', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async acknowledgeBrief(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await dailyGovernanceService.acknowledgeBrief(id, req.user!.user_id, req.user!.company_id!);
      return res.json({ success: true, data, meta: {} });
    } catch (err: any) {
      logger.error('Error acknowledging brief', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getReadiness(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const house_id = String(req.query.house_id || '');
      if (!house_id) return res.status(400).json({ success:false, message:'house_id is required' });
      const data = await dailyGovernanceService.readiness(company_id, house_id);
      return res.json({ success:true, data, meta:{ canonical:true } });
    } catch (err:any) {
      return res.status(400).json({ success:false, message:err.message });
    }
  }

  // Same-day addendum to a signed daily governance record (doctrine §9.2). Never unlocks the primary.
  async addAddendum(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason, evidence_ids, decisions } = req.body;
      const data = await dailyGovernanceService.addAddendum(id, {
        company_id: req.user!.company_id!, user_id: req.user!.user_id,
        reason, evidence_ids: Array.isArray(evidence_ids) ? evidence_ids : undefined,
        decisions: Array.isArray(decisions) ? decisions : undefined,
      });
      return res.status(201).json({ success: true, data });
    } catch (err: any) {
      logger.error('Error adding daily governance addendum', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async listAddenda(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await dailyGovernanceService.listAddenda(req.user!.company_id!, id);
      return res.json({ success: true, data, meta: {} });
    } catch (err: any) {
      logger.error('Error listing daily governance addenda', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getCoverage(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const coverage = await dailyGovernanceService.getCoverage(company_id);
      return res.json({ success: true, data: coverage });
    } catch (err: any) {
      logger.error('Error fetching governance coverage', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const dailyGovernanceController = new DailyGovernanceController();
