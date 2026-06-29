import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { weeklyReviewsService } from '../services/weeklyReviews.service';

export class WeeklyReviewsController {
  async save(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const review = await weeklyReviewsService.save(company_id, req.user!.user_id, req.body);
      return res.status(201).json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to save weekly review' });
    }
  }

  async findByHouse(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const reviews = await weeklyReviewsService.findByHouse(company_id, req.params.houseId);
      return res.json({ success: true, data: reviews });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch weekly reviews' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const review = await weeklyReviewsService.findById(req.params.id, company_id);
      return res.json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(404).json({ success: false, message: 'Weekly review not found' });
    }
  }

  async prepareReview(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { house_id, week_ending } = req.query;

      // Validate house_id as UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!house_id || !uuidRegex.test(house_id as string)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing house_id. Please ensure a house is selected.' });
      }

      const data = await weeklyReviewsService.prepareReview(company_id, house_id as string, week_ending as string);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to prepare weekly review' });
    }
  }

  async update(req: Request, res: Response) {

    try {
      const company_id = req.user!.company_id!;
      const { id } = req.params;
      const existing = await weeklyReviewsService.findById(id, company_id);
      if (!existing) return res.status(404).json({ success: false, message: 'Review not found' });

      const review = await weeklyReviewsService.save(company_id, req.user!.user_id, {
        house_id: existing.house_id,
        week_ending: existing.week_ending,
        ...req.body
      });
      return res.json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to update weekly review' });
    }
  }

  async complete(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const review = await weeklyReviewsService.complete(req.params.id, company_id, req.user!.user_id);
      return res.json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to complete weekly review' });
    }
  }

  async finalise(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const review = await weeklyReviewsService.finalise(req.params.id, company_id, req.user!.user_id);
      return res.json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to finalise weekly review' });
    }
  }

  async validate(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const review = await weeklyReviewsService.validate(req.params.id, company_id, req.user!.user_id, req.body);
      return res.json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to validate weekly review' });
    }
  }

  async publish(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const review = await weeklyReviewsService.publish(req.params.id, company_id, req.user!.user_id);
      return res.json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to publish weekly review' });
    }
  }

  async acknowledge(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await weeklyReviewsService.acknowledge(req.params.id, company_id, req.user!.user_id);
      return res.json({ success: true, data: result });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to acknowledge weekly review' });
    }
  }

  async getAcknowledgements(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const result = await weeklyReviewsService.getAcknowledgements(req.params.id, company_id);
      return res.json({ success: true, data: result });
    } catch (err: unknown) {
      return res.status(404).json({ success: false, message: err instanceof Error ? err.message : 'Failed to load acknowledgements' });
    }
  }

  // Server-rendered, locked PDF of the review — portable for supervision files /
  // handovers, and can't be quietly edited after the fact.
  async downloadPdf(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const rev = await weeklyReviewsService.findById(req.params.id, company_id);
      if (!rev) return res.status(404).json({ success: false, message: 'Weekly review not found' });

      const c = rev.content || {};
      const houseName = rev.house_name || 'Service';
      const safe = `weekly-review-${houseName}-${rev.week_ending}`.replace(/[^a-z0-9-_]/gi, '').slice(0, 70) || 'weekly-review';

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safe}.pdf"`);

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.pipe(res);

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#15803d').text('WEEKLY GOVERNANCE REVIEW', { characterSpacing: 1 });
      doc.moveDown(0.3).fillColor('#0f172a').fontSize(20).text(`${houseName} — week ending ${rev.week_ending}`);
      doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor('#555');
      doc.text(`Prepared by ${rev.created_by_name || 'Registered Manager'}${rev.rm_finalised_at ? ' · finalised ' + new Date(rev.rm_finalised_at).toLocaleString('en-GB') : ''}`);
      if (rev.validation_status) doc.text(`Validation: ${rev.validation_status}${rev.validation_at ? ' · ' + new Date(rev.validation_at).toLocaleString('en-GB') : ''}`);
      if (rev.published_at) doc.text(`Published to team: ${new Date(rev.published_at).toLocaleString('en-GB')}`);
      doc.fillColor('#000').moveDown(1);

      const section = (title: string) => { doc.moveDown(0.6).font('Helvetica-Bold').fontSize(12).fillColor('#15803d').text(title.toUpperCase()); doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor('#000'); };

      section('Overall position');
      doc.text(c.step14_overall_position || '—');

      if (c.step8_interpretation) { section('Leadership interpretation'); doc.text(c.step8_interpretation); }
      if (c.step15_narrative) { section('Governance narrative'); doc.text(c.step15_narrative); }

      section('This week at a glance');
      const signalCount = c.step3_pulse_count ?? (Array.isArray(c.step4_signals) ? c.step4_signals.length : 0);
      doc.text(`Signals captured: ${signalCount}`);
      doc.text(`Repeat patterns reaching review: ${Array.isArray(c.step5_repeats) ? c.step5_repeats.length : 0}`);

      const risks = Array.isArray(c.step10_risk_analysis) ? c.step10_risk_analysis : [];
      if (risks.length) {
        section('Risks under oversight');
        risks.forEach((r: any) => doc.text(`• ${r.title || r.id}${r.current_trajectory ? ` — ${r.current_trajectory}` : ''}`));
      }

      doc.moveDown(1).font('Helvetica-Oblique').fontSize(8).fillColor('#888')
        .text(`Generated ${new Date().toLocaleString('en-GB')} · OrdinCore governance record${rev.status === 'published' || rev.status === 'LOCKED' ? ' · locked' : ''}`);

      doc.end();
    } catch (err: unknown) {
      if (!res.headersSent) return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to render PDF' });
    }
  }
}


export const weeklyReviewsController = new WeeklyReviewsController();
