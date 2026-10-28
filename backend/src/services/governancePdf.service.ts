import PDFDocument from 'pdfkit';
import { drawReportHeader } from '../utils/pdfHelper';
import { learningService } from './learning.service';
import { escalationsService } from './escalations.service';

// 24 Oct developer brief: "Learning and Escalation PDF download requirements".
// These are live-data snapshots, not the frozen/published reports under reports.service
// — each page is explicitly stamped "current data as generated" so a reader never
// mistakes a live export for an immutable published report.

function fmtDate(v: unknown): string {
  if (!v) return '—';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function finish(doc: typeof PDFDocument, buffers: Buffer[], filename: string): Promise<{ content: Buffer; filename: string; contentType: string }> {
  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve({ content: Buffer.concat(buffers), filename, contentType: 'application/pdf' }));
  });
}

function stampSnapshot(doc: typeof PDFDocument) {
  doc.fontSize(8).fillColor('gray')
    .text(`Live data snapshot generated ${new Date().toLocaleString('en-GB')}. Not a frozen or published report — figures reflect the current state of the record and may change.`, { align: 'right' });
  doc.fillColor('black');
  doc.moveDown();
}

function learningStateLabel(state: string): string {
  if (state === 'IDENTIFIED') return 'Learning identified';
  if (state === 'NONE_IDENTIFIED') return 'No learning identified';
  if (state === 'NOT_YET_ASSESSED') return 'Not yet assessed';
  return state || '—';
}

function learningProgressLabel(progress: string): string {
  if (progress === 'RECORDED') return 'Recorded';
  if (progress === 'CHANGE_IMPLEMENTED') return 'Change implemented';
  if (progress === 'IMPROVEMENT_VERIFIED') return 'Improvement verified';
  return progress || '—';
}

export const governancePdfService = {
  async learningRecord(id: string, company_id: string) {
    const lr = await learningService.findById(id, company_id);
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', (c: Buffer) => buffers.push(c));
    drawReportHeader(doc as any, 'Learning Record');
    stampSnapshot(doc);

    doc.fontSize(10).fillColor('gray').text(`Record ID: ${lr.id}`);
    doc.fillColor('black');
    doc.fontSize(14).font('Helvetica-Bold').text(lr.source_action_title || lr.source_pattern_label || `${lr.source_type} learning`);
    doc.font('Helvetica').fontSize(10);
    doc.moveDown(0.5);
    doc.text(`Service: ${lr.house_name || 'Organisation-wide'}`);
    doc.text(`Source: ${lr.source_type}${lr.linked_action_title ? ` — action "${lr.linked_action_title}"` : ''}`);
    doc.text(`Recorded: ${fmtDate(lr.created_at)} by ${lr.author_name || 'Unknown'}`);
    doc.text(`Status: ${learningStateLabel(lr.state)} · ${learningProgressLabel(lr.progress)}`);
    doc.text(`Human-approved: ${lr.is_ai_suggested ? 'No — AI-suggested, unapproved' : `Yes, by ${lr.approved_by_name || lr.author_name || 'Unknown'} on ${fmtDate(lr.approved_at)}`}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('What happened');
    doc.font('Helvetica').text(lr.what_happened || 'Not recorded.', { indent: 10 });
    doc.moveDown(0.5);

    if (lr.state === 'IDENTIFIED') {
      doc.font('Helvetica-Bold').text('What was learnt');
      doc.font('Helvetica').text(lr.what_learnt || '—', { indent: 10 });
      doc.moveDown(0.5);
      if (lr.change_needed) {
        doc.font('Helvetica-Bold').text('Change needed');
        doc.font('Helvetica').text(lr.change_needed, { indent: 10 });
        // 27 Oct developer review ("Finish the learning PDF" — success criteria, owners/
        // deadlines): the improvement plan's structured fields, added alongside change_needed.
        doc.text(`Owner: ${lr.owner_name || '—'} · Review date: ${fmtDate(lr.review_date)}${lr.plan_deadline ? ` · Deadline: ${fmtDate(lr.plan_deadline)}` : ''}`, { indent: 10 });
        if (lr.success_criteria) doc.text(`Success criteria: ${lr.success_criteria}`, { indent: 10 });
        doc.moveDown(0.5);
      }
    } else if (lr.state === 'NONE_IDENTIFIED') {
      doc.font('Helvetica-Bold').text('Reason no learning was identified');
      doc.font('Helvetica').text(lr.no_learning_reason || '—', { indent: 10 });
      doc.moveDown(0.5);
    } else {
      doc.font('Helvetica-Bold').text('Deferred assessment');
      doc.font('Helvetica').text(`Owner: ${lr.owner_name || '—'} · Review due: ${fmtDate(lr.review_date)}`, { indent: 10 });
      doc.moveDown(0.5);
    }

    if (lr.evidence_examined) {
      doc.font('Helvetica-Bold').text('Evidence examined');
      doc.font('Helvetica').text(lr.evidence_examined, { indent: 10 });
      doc.moveDown(0.5);
    }

    // 27 Oct developer corrections ("Make the downloaded PDF a complete record"): implementation
    // and verification were entirely absent from this export -- added as their own sections.
    // Render missing content as "Not recorded"/"Not yet assessed", and flag a legacy verified
    // status with no supporting evidence instead of silently showing nothing.
    if (lr.progress === 'CHANGE_IMPLEMENTED' || lr.progress === 'IMPROVEMENT_VERIFIED') {
      doc.font('Helvetica-Bold').text('Implementation');
      doc.font('Helvetica').text(
        lr.implementation_evidence
          ? `${lr.implementation_evidence}${lr.implemented_by_name ? ` — ${lr.implemented_by_name}, ${fmtDate(lr.implemented_at)}` : ''}`
          : 'Not recorded.',
        { indent: 10 },
      );
      doc.moveDown(0.5);
    }
    if (lr.progress === 'IMPROVEMENT_VERIFIED') {
      doc.font('Helvetica-Bold').text('Verification');
      if (lr.verification_outcome && lr.verification_evidence) {
        doc.font('Helvetica').text(
          `${lr.verification_outcome}${lr.verified_by_name ? ` — ${lr.verified_by_name}, ${fmtDate(lr.verified_at)}` : ''}: ${lr.verification_evidence}`,
          { indent: 10 },
        );
      } else {
        doc.font('Helvetica-Bold').fillColor('#92400e').text('Verification evidence missing — record requires review.', { indent: 10 });
        doc.fillColor('black').font('Helvetica');
      }
      doc.moveDown(0.5);
    } else if (lr.progress === 'CHANGE_IMPLEMENTED') {
      doc.font('Helvetica').fillColor('gray').text('Verification: Not yet assessed.', { indent: 10 });
      doc.fillColor('black');
      doc.moveDown(0.5);
    }
    // 27 Oct developer review ("Finish the learning PDF" — all verification attempts): append-
    // only history (migration 202) is preserved but was never included in the export either.
    const history = Array.isArray(lr.verification_history) ? lr.verification_history : [];
    if (history.length > 1) {
      doc.font('Helvetica-Bold').text(`All verification attempts (${history.length})`);
      doc.font('Helvetica').fontSize(9);
      [...history].reverse().forEach((h: any) => {
        doc.text(`${h.outcome}${h.reviewed_at ? ` · ${fmtDate(h.reviewed_at)}` : ''} — ${h.evidence}${h.review_due_at ? ` (follow-up was due ${fmtDate(h.review_due_at)})` : ''}`, { indent: 10 });
      });
      doc.fontSize(10);
      doc.moveDown(0.5);
    }

    if (lr.source_review_outcome) {
      doc.font('Helvetica-Bold').text('Originating effectiveness review');
      doc.font('Helvetica').text(`${lr.source_review_outcome} on ${fmtDate(lr.source_review_at)}${lr.source_review_evidence ? ` — ${lr.source_review_evidence}` : ''}`, { indent: 10 });
      doc.moveDown(0.5);
    }

    if (lr.linked_action_title) {
      doc.font('Helvetica-Bold').text('Follow-through action');
      doc.font('Helvetica').text(`${lr.linked_action_title} (${lr.linked_action_status || 'status unknown'})`, { indent: 10 });
    }

    return finish(doc, buffers, `Learning_${lr.id}.pdf`);
  },

  async learningSummary(company_id: string, filters: { houseIds?: string[] | null; state?: string; progress?: string; startDate?: string; endDate?: string }) {
    // 27 Oct developer review ("Finish the learning PDF"): the export was silently capped at 300
    // with no pagination, so a provider with more records never saw the rest. limit:0 = no cap.
    const rows = await learningService.list(company_id, { ...filters, limit: 0 });
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', (c: Buffer) => buffers.push(c));
    drawReportHeader(doc as any, 'Learning Register Summary');
    stampSnapshot(doc);

    const filterParts: string[] = [];
    if (filters.state) filterParts.push(`Status: ${learningStateLabel(filters.state)}`);
    if (filters.progress) filterParts.push(`Progress: ${learningProgressLabel(filters.progress)}`);
    if (filters.houseIds && filters.houseIds.length === 1) filterParts.push('Service: filtered');
    doc.fontSize(10).text(filterParts.length ? `Filters applied: ${filterParts.join(' · ')}` : 'No filters applied — all records in scope.');
    // 27 Oct: "Label the date basis, include selected filters... date-basis/range."
    doc.text(`Date basis: when the lesson was recorded (created). ${filters.startDate || filters.endDate ? `Range: ${filters.startDate || 'earliest'} to ${filters.endDate || 'latest'}.` : 'No date range applied — all dates in scope.'}`);
    doc.text(`${rows.length} record${rows.length === 1 ? '' : 's'} in this export — complete, not paginated or truncated.`);
    doc.moveDown();

    // 27 Oct: "identify outstanding carry-over separately."
    const carryOver = rows.filter((lr: any) => lr.state === 'NOT_YET_ASSESSED' || (lr.state === 'IDENTIFIED' && lr.progress !== 'IMPROVEMENT_VERIFIED'));
    if (carryOver.length) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#92400e').text(`${carryOver.length} record(s) below are outstanding carry-over (not yet assessed, or identified but not yet verified as improved).`);
      doc.fillColor('black').font('Helvetica');
      doc.moveDown(0.5);
    }

    rows.forEach((lr: any, i: number) => {
      if (doc.y > 700) doc.addPage();
      const isCarryOver = lr.state === 'NOT_YET_ASSESSED' || (lr.state === 'IDENTIFIED' && lr.progress !== 'IMPROVEMENT_VERIFIED');
      doc.fontSize(11).font('Helvetica-Bold').text(`${i + 1}. ${lr.source_action_title || lr.source_pattern_label || `${lr.source_type} learning`}${isCarryOver ? '  [CARRY-OVER]' : ''}`);
      doc.font('Helvetica').fontSize(9);
      doc.text(`${lr.house_name || 'Organisation-wide'} · ${fmtDate(lr.created_at)} · ${learningStateLabel(lr.state)} · ${learningProgressLabel(lr.progress)}`);
      if (lr.state === 'IDENTIFIED' && lr.what_learnt) doc.text(`Learnt: ${lr.what_learnt}`, { indent: 10 });
      if (lr.state === 'NONE_IDENTIFIED' && lr.no_learning_reason) doc.text(`No learning: ${lr.no_learning_reason}`, { indent: 10 });
      doc.moveDown(0.5);
    });
    if (!rows.length) doc.fontSize(10).text('No learning records match this filter.');

    return finish(doc, buffers, `Learning_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  async escalationRecord(id: string, company_id: string) {
    const e = await escalationsService.findById(id, company_id);
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', (c: Buffer) => buffers.push(c));
    drawReportHeader(doc as any, 'Escalation Record');
    stampSnapshot(doc);

    doc.fontSize(10).fillColor('gray').text(`Escalation ID: ${e.id}`);
    doc.fillColor('black');
    doc.fontSize(14).font('Helvetica-Bold').text(e.risk_title || e.incident_title || e.reason || 'Escalation');
    doc.font('Helvetica').fontSize(10);
    doc.moveDown(0.5);
    doc.text(`Service: ${e.service_name || e.house_name || '—'}`);
    doc.text(`Status: ${e.lifecycle_status || e.status || '—'}${e.overdue ? ' (OVERDUE)' : ''}`);
    doc.text(`Escalated by: ${e.escalated_by_name || '—'} to ${e.escalated_to_name || '—'} on ${fmtDate(e.created_at)}`);
    doc.text(`Due by: ${fmtDate(e.due_by)}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Reason for escalation');
    doc.font('Helvetica').text(e.reason || e.description || 'Not recorded.', { indent: 10 });
    doc.moveDown(0.5);

    if (e.observation) {
      doc.font('Helvetica-Bold').text('Originating signal');
      doc.font('Helvetica').text(`[${fmtDate(e.signal_logged_at)}] ${e.signal_severity || ''} ${e.signal_type || ''} — ${e.observation}`, { indent: 10 });
      if (e.signal_immediate_action) doc.text(`Immediate action taken: ${e.signal_immediate_action}`, { indent: 10 });
      doc.moveDown(0.5);
    }

    if (e.latest_note) {
      doc.font('Helvetica-Bold').text('Latest progress note');
      doc.font('Helvetica').text(e.latest_note, { indent: 10 });
      doc.moveDown(0.5);
    }

    doc.font('Helvetica-Bold').text('Linked delivery actions');
    doc.font('Helvetica').text(`${e.actions_completed_count || 0} of ${e.actions_total_count || 0} completed; ${e.actions_effectiveness_reviewed_count || 0} effectiveness-reviewed.`, { indent: 10 });
    if (e.latest_effectiveness) doc.text(`Latest effectiveness verdict: ${e.latest_effectiveness}`, { indent: 10 });

    return finish(doc, buffers, `Escalation_${e.id}.pdf`);
  },

  async escalationSummary(company_id: string, filters: { status?: string; house_id?: string | string[] }, page = 1, limit = 300) {
    const { escalations } = await escalationsService.findAll(company_id, filters, page, limit);
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', (c: Buffer) => buffers.push(c));
    drawReportHeader(doc as any, 'Escalation Log Summary');
    stampSnapshot(doc);

    const filterParts: string[] = [];
    if (filters.status) filterParts.push(`Status: ${filters.status}`);
    if (filters.house_id) filterParts.push(`Service filtered`);
    doc.fontSize(10).text(filterParts.length ? `Filters applied: ${filterParts.join(' · ')}` : 'No filters applied — all escalations in scope.');
    doc.text(`${escalations.length} escalation${escalations.length === 1 ? '' : 's'} in this export.`);
    doc.moveDown();

    escalations.forEach((e: any, i: number) => {
      if (doc.y > 700) doc.addPage();
      doc.fontSize(11).font('Helvetica-Bold').text(`${i + 1}. ${e.risk_title || e.incident_title || e.reason || 'Escalation'}`);
      doc.font('Helvetica').fontSize(9);
      doc.text(`${e.service_name || e.house_name || '—'} · Escalated ${fmtDate(e.created_at)} · ${e.lifecycle_status || e.status || '—'}${e.overdue ? ' (OVERDUE)' : ''} · Due ${fmtDate(e.due_by)}`);
      doc.moveDown(0.5);
    });
    if (!escalations.length) doc.fontSize(10).text('No escalations match this filter.');

    return finish(doc, buffers, `Escalations_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
  },
};
