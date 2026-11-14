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

function shortText(v: unknown, max = 90): string {
  const s = String(v ?? '').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function firstDomain(v: unknown): string {
  if (Array.isArray(v)) return String(v[0] || '').trim();
  return String(v || '').trim();
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

    // Field report (12 Nov 2026): "we don't need codes" -- same as the escalation record, a raw
    // internal UUID has no reader-facing meaning and is dropped.
    // 30 Oct 2026 live bug report ("uniformity on the font... do this for all forms"): a source
    // action title can be a full paragraph (seen live: 200+ characters) — same class of defect
    // as escalationRecord's title below. Shortened so the heading reads as a heading everywhere.
    doc.fontSize(14).font('Helvetica-Bold').text(shortText(lr.source_action_title || lr.source_pattern_label || `${lr.source_type} learning`, 110));
    doc.font('Helvetica').fontSize(10);
    doc.moveDown(0.5);
    // Field report (12 Nov 2026): "scope -- service is not organisation-wide, the resident is
    // attached to a house." lr.house_name only ever came from the learning record's OWN house_id
    // field, which is routinely unset on an ESCALATION_CLOSURE-sourced record even though the
    // escalation it's about has a real house (source_escalation_house_name, joined above) --
    // falling back straight to "Organisation-wide" was wrong whenever that was the case.
    doc.text(`Service: ${lr.house_name || lr.source_escalation_house_name || 'Organisation-wide'}`);
    // Field report (12 Nov 2026): "we need name of client." Only showed for an ESCALATION_CLOSURE
    // -sourced record at first; an EFFECTIVENESS-sourced record reaches its signal through the
    // source action's own escalation chain instead (action_signal_related_person), so both are
    // checked here.
    const clientName = lr.source_escalation_related_person || lr.action_signal_related_person;
    if (clientName) doc.text(`Client: ${clientName}`);
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

    // Field report (12 Nov 2026): "we need information to come in proper sequence, old date
    // first, newest date last — because old date has original source of information." This whole
    // block used to print newest-first (effectiveness review, then escalation, then the decision
    // that created the action, then the originating signal last) — backwards from how the event
    // actually unfolded. Reordered chronologically: signal -> decision -> escalation -> linked
    // risk -> (for an escalation-closure-sourced record) its own signal/decision chain ->
    // effectiveness review, which is always the LAST thing to happen in this chain.
    if (lr.action_signal_description) {
      doc.font('Helvetica-Bold').text('Originating signal');
      doc.font('Helvetica').text(`${fmtDate(lr.action_signal_date)}${lr.action_signal_severity ? ` · ${lr.action_signal_severity}` : ''}: ${lr.action_signal_description}`, { indent: 10 });
      doc.moveDown(0.5);
    }
    // 30 Oct 2026 live bug report ("this history is not pulling on learning"): the common case —
    // an action created straight from a decision, with no escalation and no registered risk —
    // still showed nothing until the decision and its originating signal are followed too.
    if (lr.action_decision) {
      doc.font('Helvetica-Bold').text('Decision that created the source action');
      doc.font('Helvetica').text(`${lr.action_decision}${lr.action_decision_by_name ? ` — ${lr.action_decision_by_name}` : ''}${lr.action_decision_date ? `, ${fmtDate(lr.action_decision_date)}` : ''}`, { indent: 10 });
      if (lr.action_decision_rationale) doc.text(`Rationale: ${lr.action_decision_rationale}`, { indent: 10 });
      if (lr.action_decision_instruction) doc.text(`Instruction: ${lr.action_decision_instruction}`, { indent: 10 });
      doc.moveDown(0.5);
    }
    // 29 Oct 2026 live bug report ("we need the whole bundle ... effectiveness maybe give us a
    // link to the whole escalation history"): when the source action itself resolved a real
    // escalation, print that escalation's own chronology — this was entirely absent before, so
    // a record like "Police attended and investigation done, client reassured" showed only the
    // bare action title with no visibility of what the underlying escalation actually was.
    if (lr.action_escalation_reason) {
      doc.font('Helvetica-Bold').text('Escalation history (from the source action)');
      doc.font('Helvetica').text(`Raised: ${lr.action_escalation_reason}`, { indent: 10 });
      doc.text(`Status: ${lr.action_escalation_lifecycle_status || lr.action_escalation_status || '—'}${lr.action_escalation_to_name ? ` · Escalated to: ${lr.action_escalation_to_name}` : ''}`, { indent: 10 });
      doc.text(`Opened: ${fmtDate(lr.action_escalation_created_at)}${lr.action_escalation_due_by ? ` · Due: ${fmtDate(lr.action_escalation_due_by)}` : ''}${lr.action_escalation_closed_at ? ` · Closed: ${fmtDate(lr.action_escalation_closed_at)}` : ''}`, { indent: 10 });
      if (lr.action_escalation_closure_evidence) doc.text(`Closure evidence: ${lr.action_escalation_closure_evidence}`, { indent: 10 });
      doc.moveDown(0.5);
    }
    if (lr.action_risk_title) {
      doc.font('Helvetica-Bold').text('Linked risk (from the source action)');
      doc.font('Helvetica').text(`${lr.action_risk_title} — ${lr.action_risk_status || 'status unknown'}${lr.action_risk_severity ? `, ${lr.action_risk_severity}` : ''}`, { indent: 10 });
      doc.moveDown(0.5);
    }

    // Field report (12 Nov 2026): "source is from all the information such as escalation -
    // original signal - decision made - effectiveness - impact, all pulled on this report." When
    // THIS learning record's own source is the escalation closure (source_type ESCALATION_CLOSURE,
    // as opposed to being reached indirectly via a source action), print that escalation's full
    // chronology the same way the action-sourced chain above does — signal first, decisions after.
    if (lr.source_escalation_id) {
      doc.font('Helvetica-Bold').text('Escalation (source of this learning)');
      doc.font('Helvetica');
      if (lr.source_escalation_signal_description) {
        doc.text(`Originating signal: [${fmtDate(lr.source_escalation_signal_date)}]${lr.source_escalation_signal_severity ? ` ${lr.source_escalation_signal_severity}` : ''} — ${lr.source_escalation_signal_description}`, { indent: 10 });
      }
      doc.text(`Raised: ${lr.source_escalation_reason || 'Not recorded'}`, { indent: 10 });
      doc.text(`Status: ${lr.source_escalation_lifecycle_status || lr.source_escalation_status || '—'}${lr.source_escalation_to_name ? ` · Escalated to: ${lr.source_escalation_to_name}` : ''}`, { indent: 10 });
      doc.text(`Opened: ${fmtDate(lr.source_escalation_created_at)}${lr.source_escalation_due_by ? ` · Due: ${fmtDate(lr.source_escalation_due_by)}` : ''}${lr.source_escalation_closed_at ? ` · Closed: ${fmtDate(lr.source_escalation_closed_at)}` : ''}`, { indent: 10 });
      if (lr.source_escalation_decision_history) doc.text(`Decisions recorded: ${lr.source_escalation_decision_history}`, { indent: 10 });
      if (lr.source_escalation_closure_evidence) doc.text(`Closure evidence: ${lr.source_escalation_closure_evidence}`, { indent: 10 });
      doc.moveDown(0.5);
    }

    // Always last: the effectiveness review is, by definition, the final event in this chain —
    // it judges the action taken in response to everything printed above it.
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
      doc.fontSize(11).font('Helvetica-Bold').text(`${i + 1}. ${shortText(lr.source_action_title || lr.source_pattern_label || `${lr.source_type} learning`, 100)}${isCarryOver ? '  [CARRY-OVER]' : ''}`);
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

    // Field report (12 Nov 2026): "no codes on reports sir" -- a raw internal UUID has no meaning
    // to a reader and doesn't belong on a document meant to be read/printed (matches the frozen
    // reports' own "no UUIDs" rule). Dropped; nothing below identified the record by this id.
    // 30 Oct 2026 live bug report ("the form itself is not aligned properly, the writing font
    // is different there is no uniformity"): when neither a risk nor an incident is linked —
    // the common case for a signal-raised escalation like this one — this fell back to the
    // FULL reason paragraph rendered as a 14pt bold heading, then printed the identical text
    // again below under "Reason for escalation" in 10pt regular. A short, distinct title (the
    // concern's domain and person, matching how the live screen and other PDFs label it)
    // replaces that duplication.
    const titleDomain = firstDomain(e.signal_risk_domain);
    const title = e.risk_title || e.incident_title
      || (titleDomain ? `${titleDomain}${e.signal_related_person ? ` — ${e.signal_related_person}` : ''}` : shortText(e.reason, 90))
      || 'Escalation';
    doc.fontSize(14).font('Helvetica-Bold').text(title);
    doc.font('Helvetica').fontSize(10).fillColor('black');
    doc.moveDown(0.5);
    doc.text(`Service: ${e.service_name || e.house_name || '—'}`);
    // Field report (12 Nov 2026): "name of client" -- the person this escalation concerns was
    // only ever implied inside the title text, never given its own labelled field.
    if (e.signal_related_person) doc.text(`Client: ${e.signal_related_person}`);
    doc.text(`Status: ${e.lifecycle_status || e.status || '—'}${e.overdue ? ' (OVERDUE)' : ''}`);
    doc.text(`Escalated by: ${e.escalated_by_name || '—'} to ${e.escalated_to_name || '—'} on ${fmtDate(e.created_at)}`);
    doc.text(`Due by: ${fmtDate(e.due_by)}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(10).text('Reason for escalation');
    doc.font('Helvetica').text(e.reason || e.description || 'Not recorded.', { indent: 10 });
    doc.moveDown(0.5);

    if (e.observation) {
      doc.font('Helvetica-Bold').text('Originating signal');
      doc.font('Helvetica').text(`[${fmtDate(e.signal_logged_at)}] ${e.signal_severity || ''} ${e.signal_type || ''} — ${e.observation}`, { indent: 10 });
      if (e.signal_immediate_action) doc.text(`Immediate action taken: ${e.signal_immediate_action}`, { indent: 10 });
      doc.moveDown(0.5);
    }

    // Field report (12 Nov 2026): "we need all information from original signal -> decisions made
    // from original signal -- monitoring if it was monitored and decisions; any/all recorded
    // decisions and actions on escalations assigned." This only ever showed the single MOST
    // RECENT progress note (escalations.service.ts findById's e.latest_note) -- the full history
    // of what was recorded against this escalation over time was fetched (e.actions) but never
    // rendered at all.
    const history = Array.isArray(e.actions) ? e.actions : [];
    if (history.length) {
      doc.font('Helvetica-Bold').text('Monitoring and decision history');
      doc.font('Helvetica').fontSize(9.5);
      // escalation_actions.created_at DESC from the service -- oldest first reads as a timeline.
      for (const a of [...history].reverse()) {
        doc.text(`[${fmtDate(a.created_at)}] ${a.action_type || 'Update'} — ${a.taken_by_name || 'System'}`, { indent: 10 });
        if (a.description) doc.text(a.description, { indent: 16 });
        doc.moveDown(0.2);
      }
      doc.fontSize(10);
      doc.moveDown(0.3);
    }

    const decisions = Array.isArray(e.decisions) ? e.decisions : [];
    if (decisions.length) {
      doc.font('Helvetica-Bold').text('Governance decisions recorded against this escalation');
      doc.font('Helvetica').fontSize(9.5);
      for (const d of decisions) {
        doc.text(`[${fmtDate(d.review_date)}] ${d.decision || 'Decision'} — ${d.reviewer_name || 'Not recorded'}`, { indent: 10 });
        if (d.decision_rationale) doc.text(`Rationale: ${d.decision_rationale}`, { indent: 16 });
        if (d.due_at) doc.text(`Due/review: ${fmtDate(d.due_at)}`, { indent: 16 });
        doc.moveDown(0.2);
      }
      doc.fontSize(10);
      doc.moveDown(0.3);
    }

    // 30 Oct 2026 live bug report ("the bottom section the effectiveness did not pull up with
    // their reviews"): this previously printed only the aggregate count and the single LATEST
    // effectiveness verdict across all linked actions — never the individual actions, each with
    // its own outcome and evidence. escalationsService.findById() already returns the full
    // linked_actions array (same data the live screen's "Linked control position" uses); it was
    // simply never iterated here.
    doc.font('Helvetica-Bold').text('Linked delivery actions');
    doc.font('Helvetica').text(`${e.actions_completed_count || 0} of ${e.actions_total_count || 0} completed; ${e.actions_effectiveness_reviewed_count || 0} effectiveness-reviewed.`, { indent: 10 });
    const linkedActions = Array.isArray(e.linked_actions) ? e.linked_actions : [];
    if (linkedActions.length) {
      doc.moveDown(0.3);
      for (const a of linkedActions) {
        const outcome = a.effectiveness_outcome || (a.effectiveness && a.effectiveness !== 'Neutral' && a.effectiveness !== 'Ineffective' ? a.effectiveness : null)
          || (a.effectiveness === 'Ineffective' ? 'Not Effective' : a.effectiveness === 'Neutral' ? 'Partially Effective' : null);
        doc.font('Helvetica-Bold').fontSize(9.5).text(`• ${shortText(a.title || a.action || 'Action', 120)}`, { indent: 10 });
        doc.font('Helvetica').fontSize(9).text(
          `${a.is_completed || /complete/i.test(String(a.status || a.canonical_status || '')) ? 'Completed' : 'Open'}${a.completed_at ? ` ${fmtDate(a.completed_at)}` : ''}${a.assigned_to_name ? ` · ${a.assigned_to_name}` : ''}${outcome ? ` · Effectiveness: ${outcome}` : ' · Effectiveness: Not yet reviewed'}`,
          { indent: 16 },
        );
        if (a.effectiveness_evidence) doc.text(`Evidence: ${a.effectiveness_evidence}`, { indent: 16 });
        doc.moveDown(0.3);
      }
      doc.font('Helvetica').fontSize(10);
    } else if (e.latest_effectiveness) {
      doc.text(`Latest effectiveness verdict: ${e.latest_effectiveness}`, { indent: 10 });
    }

    return finish(doc, buffers, `Escalation_${e.id}.pdf`);
  },

  async escalationSummary(company_id: string, filters: { status?: string; house_id?: string | string[]; startDate?: string; endDate?: string; client?: string }, page = 1, limit = 300) {
    const { escalations } = await escalationsService.findAll(company_id, filters, page, limit);
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', (c: Buffer) => buffers.push(c));
    drawReportHeader(doc as any, 'Escalation Log Summary');
    stampSnapshot(doc);

    const filterParts: string[] = [];
    if (filters.status) filterParts.push(`Status: ${filters.status}`);
    if (filters.house_id) filterParts.push(`Service filtered`);
    if (filters.startDate || filters.endDate) filterParts.push(`Period: ${filters.startDate ? fmtDate(filters.startDate) : 'earliest'} to ${filters.endDate ? fmtDate(filters.endDate) : 'latest'}`);
    if (filters.client) filterParts.push(`Client: ${filters.client}`);
    doc.fontSize(10).text(filterParts.length ? `Filters applied: ${filterParts.join(' · ')}` : 'No filters applied — all escalations in scope.');
    doc.text(`${escalations.length} escalation${escalations.length === 1 ? '' : 's'} in this export.`);
    doc.moveDown();

    escalations.forEach((e: any, i: number) => {
      if (doc.y > 700) doc.addPage();
      // 30 Oct 2026 live bug report ("do this for all forms, uniformity on the font"): same
      // long-reason-as-heading defect as escalationRecord — a reason paragraph rendered bold
      // at list-row scale reads no differently from the detail PDF's bug, just repeated N times.
      const rowDomain = firstDomain(e.signal_risk_domain);
      const rowTitle = e.risk_title || e.incident_title
        || (rowDomain ? `${rowDomain}${e.signal_related_person ? ` — ${e.signal_related_person}` : ''}` : shortText(e.reason, 90))
        || 'Escalation';
      doc.fontSize(11).font('Helvetica-Bold').text(`${i + 1}. ${rowTitle}`);
      doc.font('Helvetica').fontSize(9);
      doc.text(`${e.service_name || e.house_name || '—'} · Escalated ${fmtDate(e.created_at)} · ${e.lifecycle_status || e.status || '—'}${e.overdue ? ' (OVERDUE)' : ''} · Due ${fmtDate(e.due_by)}`);
      doc.moveDown(0.5);
    });
    if (!escalations.length) doc.fontSize(10).text('No escalations match this filter.');

    return finish(doc, buffers, `Escalations_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
  },
};
