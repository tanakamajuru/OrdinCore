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

  async publishedForMe(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const reviews = await weeklyReviewsService.publishedForUser(company_id, req.user!.user_id);
      return res.json({ success: true, data: reviews });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch published reviews' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const review = await weeklyReviewsService.findById(req.params.id, company_id);
      const role = String(req.user!.role || '').toUpperCase();
      if (['TEAM_LEADER', 'SUPPORT_WORKER'].includes(role)) {
        const allowed = req.user!.assigned_house_ids || [];
        if (review?.status !== 'published' || !allowed.includes(review?.house_id)) {
          return res.status(404).json({ success: false, message: 'Weekly review not found', errors: [] });
        }
      }
      return res.json({ success: true, data: review });
    } catch (err: unknown) {
      return res.status(404).json({ success: false, message: 'Weekly review not found' });
    }
  }

  async getReadStatus(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await weeklyReviewsService.getReadStatus(req.params.id, company_id);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load read status';
      return res.status(400).json({ success: false, message });
    }
  }

  async remind(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await weeklyReviewsService.remindUnacknowledged(req.params.id, company_id, req.user!.user_id);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reminders';
      return res.status(400).json({ success: false, message });
    }
  }

  async providerRollup(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const week_ending = String(req.query.week_ending || '');
      if (!week_ending) return res.status(400).json({ success: false, message: 'week_ending is required' });
      const data = await weeklyReviewsService.providerRollup(company_id, week_ending);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load provider roll-up';
      return res.status(400).json({ success: false, message });
    }
  }

  async signProviderRollup(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await weeklyReviewsService.signProviderRollup(company_id, String(req.body.week_ending || ''), req.user!.user_id, req.body);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign provider roll-up';
      return res.status(400).json({ success: false, message });
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

  async aiDraft(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const { house_id, week_ending } = req.body || {};
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!house_id || !uuidRegex.test(String(house_id))) {
        return res.status(400).json({ success: false, message: 'A valid service (house_id) is required.' });
      }
      const data = await weeklyReviewsService.aiDraftNarrative(company_id, house_id, week_ending);
      return res.json({ success: true, data });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to generate AI draft' });
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

  // Director/RI read-only service-level roll-up of the week's house reviews.
  async serviceRollup(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const data = await weeklyReviewsService.serviceRollup(company_id, req.query.week_ending as string);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to build service roll-up' });
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

      // Render the SAME canonical report the screen and Team Leaders see (one document, one
      // format). Values come from the stored team_report + RM content so the PDF and the web view
      // can never diverge. Dated briefs are concise source lines, not the full daily dump.
      const tr = rev.team_report || {};
      const groups: any[] = Array.isArray(tr.domain_groups) ? tr.domain_groups : [];
      const normTraj = (t: any) => { const s = String(t || '').toUpperCase(); return s.includes('DETERIOR') ? 'Deteriorating' : s.includes('IMPROV') ? 'Improving' : s.includes('STAB') ? 'Stable' : 'Not assessed'; };
      const weekEndDirection = (() => { const ts = groups.map((g) => normTraj(g.trajectory)); return ts.includes('Deteriorating') ? 'Deteriorating' : ts.includes('Improving') ? 'Improving' : ts.includes('Stable') ? 'Stable' : 'Not assessed'; })();
      const firstLine = (s: any) => String(s || '').split(/\r?\n/).map((x) => x.trim()).find(Boolean) || '';
      const overview = String(c.step15_narrative || c.step14_overall_position || rev.governance_narrative || 'This report is drawn from the governance record for the week; see the sections below.').trim();

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f766e').text('PUBLISHED WEEKLY GOVERNANCE REVIEW', { characterSpacing: 1 });
      doc.moveDown(0.3).fillColor('#0f172a').fontSize(20).text('Weekly Governance Team Report');
      doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor('#555');
      doc.text(`${houseName} · week ending ${rev.week_ending}`);
      doc.text(`Prepared by ${rev.created_by_name || 'Registered Manager'}${rev.rm_finalised_at ? ' · finalised ' + new Date(rev.rm_finalised_at).toLocaleString('en-GB') : ''}`);
      if (rev.validation_status) doc.text(`Validation: ${rev.validation_status}${rev.validation_at ? ' · ' + new Date(rev.validation_at).toLocaleString('en-GB') : ''}`);
      if (rev.published_at) doc.text(`Published to team: ${new Date(rev.published_at).toLocaleString('en-GB')}`);
      doc.fillColor('#000').moveDown(0.8);

      const section = (title: string) => { doc.moveDown(0.6).font('Helvetica-Bold').fontSize(12).fillColor('#0f766e').text(title.toUpperCase()); doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor('#000'); };

      section('This week');
      doc.text(`Signals reviewed: ${tr.signals_reviewed ?? 0}   ·   High / critical: ${tr.high_critical ?? 0}   ·   Main domains: ${tr.main_domain_count ?? 0}   ·   Week-end direction: ${weekEndDirection}`);

      section('The week at a glance');
      doc.text(overview);

      section('Collective Daily Team Briefing');
      doc.text(c.collective_daily_brief_summary || 'No collective Daily Team Briefing summary was recorded by the Registered Manager.');
      doc.moveDown(0.3).font('Helvetica-Oblique').fillColor('#555')
        .text(`${tr.brief_days || 0} of 7 days contain a completed published Daily Team Brief.`)
        .font('Helvetica').fillColor('#000');

      section('How events unfolded');
      if (Array.isArray(tr.events) && tr.events.length) {
        tr.events.forEach((event: any) => {
          const date = event.date ? new Date(event.date).toLocaleDateString('en-GB') : 'Date not recorded';
          doc.font('Helvetica-Bold').text(date, { continued: true }).font('Helvetica').text(`  ${event.headline || firstLine(event.summary)}`);
        });
      } else {
        doc.font('Helvetica-Oblique').fillColor('#555').text('No dated briefing was recorded for this week.').font('Helvetica').fillColor('#000');
      }

      if (groups.length) {
        section('Major issues and present position');
        groups.forEach((g: any) => doc.text(`• ${g.domain} — ${g.signal_count} signal(s)${g.trajectory ? ` · ${normTraj(g.trajectory)}` : ''}`));
      }

      const measures: any[] = Array.isArray(tr.measures) ? tr.measures : [];
      if (measures.length) {
        section('What has been done');
        measures.forEach((m: any) => {
          const review = m.effectiveness_review_date || m.due_date;
          doc.text(`• ${m.measure}${m.owner ? ` · ${m.owner}` : ' · Unassigned'}${review ? ` · review ${new Date(review).toLocaleDateString('en-GB')}` : ''} · ${m.status}`);
        });
      }

      if (c.unresolved_concerns_text) { section('What remains a concern'); doc.text(c.unresolved_concerns_text); }
      if (Array.isArray(tr.evidence_gaps) && tr.evidence_gaps.length) {
        section('Information still required');
        tr.evidence_gaps.forEach((gap: string) => doc.text(`- ${gap}`));
      }
      if (c.lessons_learnt) { section('What we are learning'); doc.text(c.lessons_learnt); }
      if (c.anticipated_risks?.rm_note) { section('What to expect next week'); doc.text(c.anticipated_risks.rm_note); }

      doc.moveDown(1).font('Helvetica-Oblique').fontSize(8).fillColor('#888')
        .text(`Generated ${new Date().toLocaleString('en-GB')} · OrdinCore governance record${rev.status === 'published' || rev.status === 'LOCKED' ? ' · locked' : ''}`);

      doc.end();
    } catch (err: unknown) {
      if (!res.headersSent) return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to render PDF' });
    }
  }

  // Queue of finalised reviews awaiting a Director/RI validation decision.
  async awaitingValidation(req: Request, res: Response) {
    try {
      const data = await weeklyReviewsService.awaitingValidation(req.user!.company_id!);
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to list reviews awaiting validation' });
    }
  }
}


export const weeklyReviewsController = new WeeklyReviewsController();
