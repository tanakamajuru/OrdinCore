import PDFDocument from 'pdfkit';
import { drawReportHeader } from '../utils/pdfHelper';
import {
  createGovernanceRecordDoc,
  stampGovernanceRecordFooters,
  govTitle,
  govSupportLine,
  govMetaRow,
  govSectionHeading,
  govParagraph,
  govSupportText,
  govGap,
  GOV_HEADING_BLOCK_GAP,
  GOV_HEADING_BLOCK_TO_DETAILS_GAP,
  GOV_ATTRIBUTION_GAP,
  GOV_COLORS,
} from '../utils/pdfHelper';
import { learningService } from './learning.service';
import { escalationsService } from './escalations.service';
import { reportsDataService } from './reportsData.service';

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

// learningRecord/escalationRecord use createGovernanceRecordDoc(), which buffers pages so the
// masthead/footer (with correct "Page X of Y") can be stamped on every page, however many the
// record's actual content ends up needing — never truncated or shrunk to force one page.
function finishGovernanceRecord(doc: typeof PDFDocument, buffers: Buffer[], filename: string): Promise<{ content: Buffer; filename: string; contentType: string }> {
  stampGovernanceRecordFooters(doc);
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
    const doc = createGovernanceRecordDoc();
    const buffers: Buffer[] = [];
    doc.on('data', (c: Buffer) => buffers.push(c));

    // Field report (12 Nov 2026): "we don't need codes" -- same as the escalation record, a raw
    // internal UUID has no reader-facing meaning and is dropped. Layout only changed below —
    // this conditional/data logic is unchanged from before the spec pass.
    // 30 Oct 2026 live bug report ("uniformity on the font... do this for all forms"): a source
    // action title can be a full paragraph (seen live: 200+ characters) — same class of defect
    // as escalationRecord's title below. Shortened so the heading reads as a heading everywhere.
    govTitle(doc, shortText(lr.source_action_title || lr.source_pattern_label || `${lr.source_type} learning`, 110));
    govGap(doc, GOV_HEADING_BLOCK_GAP);
    govSupportLine(doc, `Live data snapshot generated ${new Date().toLocaleString('en-GB')}. Not a frozen or published report — figures reflect the current state of the record and may change.`);
    govGap(doc, GOV_HEADING_BLOCK_TO_DETAILS_GAP);

    // Field report (12 Nov 2026): "scope -- service is not organisation-wide, the resident is
    // attached to a house." lr.house_name only ever came from the learning record's OWN house_id
    // field, which is routinely unset on an ESCALATION_CLOSURE-sourced record even though the
    // escalation it's about has a real house (source_escalation_house_name, joined above) --
    // falling back straight to "Organisation-wide" was wrong whenever that was the case.
    govMetaRow(doc, 'Service', lr.house_name || lr.source_escalation_house_name || 'Organisation-wide');
    // Field report (12 Nov 2026): "we need name of client." Only showed for an ESCALATION_CLOSURE
    // -sourced record at first; an EFFECTIVENESS-sourced record reaches its signal through the
    // source action's own escalation chain instead (action_signal_related_person), so both are
    // checked here.
    const clientName = lr.source_escalation_related_person || lr.action_signal_related_person;
    if (clientName) govMetaRow(doc, 'Client', String(clientName));
    govMetaRow(doc, 'Source', `${lr.source_type}${lr.linked_action_title ? ` — action "${lr.linked_action_title}"` : ''}`);
    govMetaRow(doc, 'Recorded', `${fmtDate(lr.created_at)} by ${lr.author_name || 'Unknown'}`);
    govMetaRow(doc, 'Status', `${learningStateLabel(lr.state)} · ${learningProgressLabel(lr.progress)}`);
    govMetaRow(doc, 'Human-approved', lr.is_ai_suggested ? 'No — AI-suggested, unapproved' : `Yes, by ${lr.approved_by_name || lr.author_name || 'Unknown'} on ${fmtDate(lr.approved_at)}`);

    govSectionHeading(doc, 'What happened', lr.what_happened || 'Not recorded.');
    govParagraph(doc, lr.what_happened || 'Not recorded.');

    if (lr.state === 'IDENTIFIED') {
      govSectionHeading(doc, 'What was learnt', lr.what_learnt || '—');
      govParagraph(doc, lr.what_learnt || '—');
      if (lr.change_needed) {
        govSectionHeading(doc, 'Change needed', lr.change_needed);
        govParagraph(doc, lr.change_needed);
        // 27 Oct developer review ("Finish the learning PDF" — success criteria, owners/
        // deadlines): the improvement plan's structured fields, added alongside change_needed.
        govParagraph(doc, `Owner: ${lr.owner_name || '—'} · Review date: ${fmtDate(lr.review_date)}${lr.plan_deadline ? ` · Deadline: ${fmtDate(lr.plan_deadline)}` : ''}`);
        if (lr.success_criteria) govParagraph(doc, `Success criteria: ${lr.success_criteria}`);
      }
    } else if (lr.state === 'NONE_IDENTIFIED') {
      govSectionHeading(doc, 'Reason no learning was identified', lr.no_learning_reason || '—');
      govParagraph(doc, lr.no_learning_reason || '—');
    } else {
      govSectionHeading(doc, 'Deferred assessment', `Owner: ${lr.owner_name || '—'} · Review due: ${fmtDate(lr.review_date)}`);
      govParagraph(doc, `Owner: ${lr.owner_name || '—'} · Review due: ${fmtDate(lr.review_date)}`);
    }

    if (lr.evidence_examined) {
      govSectionHeading(doc, 'Evidence examined', lr.evidence_examined);
      govParagraph(doc, lr.evidence_examined);
    }

    // 27 Oct developer corrections ("Make the downloaded PDF a complete record"): implementation
    // and verification were entirely absent from this export -- added as their own sections.
    // Render missing content as "Not recorded"/"Not yet assessed", and flag a legacy verified
    // status with no supporting evidence instead of silently showing nothing.
    if (lr.progress === 'CHANGE_IMPLEMENTED' || lr.progress === 'IMPROVEMENT_VERIFIED') {
      const implText = lr.implementation_evidence
        ? `${lr.implementation_evidence}${lr.implemented_by_name ? ` — ${lr.implemented_by_name}, ${fmtDate(lr.implemented_at)}` : ''}`
        : 'Not recorded.';
      govSectionHeading(doc, 'Implementation', implText);
      govParagraph(doc, implText);
    }
    if (lr.progress === 'IMPROVEMENT_VERIFIED') {
      if (lr.verification_outcome && lr.verification_evidence) {
        const verifyText = `${lr.verification_outcome}${lr.verified_by_name ? ` — ${lr.verified_by_name}, ${fmtDate(lr.verified_at)}` : ''}: ${lr.verification_evidence}`;
        govSectionHeading(doc, 'Verification', verifyText);
        govParagraph(doc, verifyText);
      } else {
        const missingText = 'Verification evidence missing — record requires review.';
        govSectionHeading(doc, 'Verification', missingText);
        govParagraph(doc, missingText, { color: GOV_COLORS.WARNING, bold: true });
      }
    } else if (lr.progress === 'CHANGE_IMPLEMENTED') {
      govSectionHeading(doc, 'Verification', 'Not yet assessed.');
      govParagraph(doc, 'Not yet assessed.', { color: GOV_COLORS.SUPPORT_TEXT });
    }
    // 27 Oct developer review ("Finish the learning PDF" — all verification attempts): append-
    // only history (migration 202) is preserved but was never included in the export either.
    const history = Array.isArray(lr.verification_history) ? lr.verification_history : [];
    if (history.length > 1) {
      govSectionHeading(doc, `All verification attempts (${history.length})`);
      [...history].reverse().forEach((h: any) => {
        govSupportText(doc, `${h.outcome}${h.reviewed_at ? ` · ${fmtDate(h.reviewed_at)}` : ''} — ${h.evidence}${h.review_due_at ? ` (follow-up was due ${fmtDate(h.review_due_at)})` : ''}`);
      });
    }

    // Field report (12 Nov 2026): "we need information to come in proper sequence, old date
    // first, newest date last — because old date has original source of information." This whole
    // block used to print newest-first (effectiveness review, then escalation, then the decision
    // that created the action, then the originating signal last) — backwards from how the event
    // actually unfolded. Reordered chronologically: signal -> decision -> escalation -> linked
    // risk -> (for an escalation-closure-sourced record) its own signal/decision chain ->
    // effectiveness review, which is always the LAST thing to happen in this chain.
    if (lr.action_signal_description) {
      const text = `${fmtDate(lr.action_signal_date)}${lr.action_signal_severity ? ` · ${lr.action_signal_severity}` : ''}: ${lr.action_signal_description}`;
      govSectionHeading(doc, 'Originating signal', text);
      govParagraph(doc, text);
    }
    // 30 Oct 2026 live bug report ("this history is not pulling on learning"): the common case —
    // an action created straight from a decision, with no escalation and no registered risk —
    // still showed nothing until the decision and its originating signal are followed too.
    if (lr.action_decision) {
      const text = `${lr.action_decision}${lr.action_decision_by_name ? ` — ${lr.action_decision_by_name}` : ''}${lr.action_decision_date ? `, ${fmtDate(lr.action_decision_date)}` : ''}`;
      govSectionHeading(doc, 'Decision that created the source action', text);
      govParagraph(doc, text);
      if (lr.action_decision_rationale) govParagraph(doc, `Rationale: ${lr.action_decision_rationale}`);
      if (lr.action_decision_instruction) govParagraph(doc, `Instruction: ${lr.action_decision_instruction}`);
    }
    // 16 Nov 2026 live report: the one decision that created the source action was never the
    // whole story — the same signal is routinely reviewed more than once across daily oversight
    // (Monitor, then a later Escalate or Close). Print every other decision on it too.
    if (lr.signal_decision_history) {
      govSectionHeading(doc, 'Other daily oversight decisions on this signal', lr.signal_decision_history);
      govParagraph(doc, lr.signal_decision_history);
    }
    // 29 Oct 2026 live bug report ("we need the whole bundle ... effectiveness maybe give us a
    // link to the whole escalation history"): when the source action itself resolved a real
    // escalation, print that escalation's own chronology — this was entirely absent before, so
    // a record like "Police attended and investigation done, client reassured" showed only the
    // bare action title with no visibility of what the underlying escalation actually was.
    if (lr.action_escalation_reason) {
      govSectionHeading(doc, 'Escalation history (from the source action)', `Raised: ${lr.action_escalation_reason}`);
      govParagraph(doc, `Raised: ${lr.action_escalation_reason}`);
      govParagraph(doc, `Status: ${lr.action_escalation_lifecycle_status || lr.action_escalation_status || '—'}${lr.action_escalation_to_name ? ` · Escalated to: ${lr.action_escalation_to_name}` : ''}`);
      govParagraph(doc, `Opened: ${fmtDate(lr.action_escalation_created_at)}${lr.action_escalation_due_by ? ` · Due: ${fmtDate(lr.action_escalation_due_by)}` : ''}${lr.action_escalation_closed_at ? ` · Closed: ${fmtDate(lr.action_escalation_closed_at)}` : ''}`);
      if (lr.action_escalation_closure_evidence) govParagraph(doc, `Closure evidence: ${lr.action_escalation_closure_evidence}`);
    }
    if (lr.action_risk_title) {
      const text = `${lr.action_risk_title} — ${lr.action_risk_status || 'status unknown'}${lr.action_risk_severity ? `, ${lr.action_risk_severity}` : ''}`;
      govSectionHeading(doc, 'Linked risk (from the source action)', text);
      govParagraph(doc, text);
      if (lr.linked_risk_assessment_history) govParagraph(doc, `Risk assessment history: ${lr.linked_risk_assessment_history}`);
    } else if (lr.linked_risk_assessment_history) {
      // A RISK_CLOSURE-sourced learning has no action_risk_title (there is no source action),
      // but the risk itself is the source — still show its assessment history.
      govSectionHeading(doc, 'Risk assessment history', lr.linked_risk_assessment_history);
      govParagraph(doc, lr.linked_risk_assessment_history);
    }
    // 16 Nov 2026 live report ("daily oversight decisions and actions, escalation decision and
    // action ... from this signal"): an escalation that followed the SAME risk/signal/pattern as
    // this learning's source, but wasn't the one tied directly via a foreign key, was invisible.
    if (lr.related_escalations) {
      govSectionHeading(doc, 'Other escalations on this risk/signal', lr.related_escalations);
      govParagraph(doc, lr.related_escalations);
    }

    // Field report (12 Nov 2026): "source is from all the information such as escalation -
    // original signal - decision made - effectiveness - impact, all pulled on this report." When
    // THIS learning record's own source is the escalation closure (source_type ESCALATION_CLOSURE,
    // as opposed to being reached indirectly via a source action), print that escalation's full
    // chronology the same way the action-sourced chain above does — signal first, decisions after.
    if (lr.source_escalation_id) {
      const firstLine = lr.source_escalation_signal_description
        ? `Originating signal: [${fmtDate(lr.source_escalation_signal_date)}]${lr.source_escalation_signal_severity ? ` ${lr.source_escalation_signal_severity}` : ''} — ${lr.source_escalation_signal_description}`
        : `Raised: ${lr.source_escalation_reason || 'Not recorded'}`;
      govSectionHeading(doc, 'Escalation (source of this learning)', firstLine);
      if (lr.source_escalation_signal_description) {
        govParagraph(doc, `Originating signal: [${fmtDate(lr.source_escalation_signal_date)}]${lr.source_escalation_signal_severity ? ` ${lr.source_escalation_signal_severity}` : ''} — ${lr.source_escalation_signal_description}`);
      }
      govParagraph(doc, `Raised: ${lr.source_escalation_reason || 'Not recorded'}`);
      govParagraph(doc, `Status: ${lr.source_escalation_lifecycle_status || lr.source_escalation_status || '—'}${lr.source_escalation_to_name ? ` · Escalated to: ${lr.source_escalation_to_name}` : ''}`);
      govParagraph(doc, `Opened: ${fmtDate(lr.source_escalation_created_at)}${lr.source_escalation_due_by ? ` · Due: ${fmtDate(lr.source_escalation_due_by)}` : ''}${lr.source_escalation_closed_at ? ` · Closed: ${fmtDate(lr.source_escalation_closed_at)}` : ''}`);
      if (lr.source_escalation_decision_history) govParagraph(doc, `Decisions recorded: ${lr.source_escalation_decision_history}`);
      if (lr.source_escalation_closure_evidence) govParagraph(doc, `Closure evidence: ${lr.source_escalation_closure_evidence}`);
    }

    // Always last: the effectiveness review is, by definition, the final event in this chain —
    // it judges the action taken in response to everything printed above it.
    if (lr.source_review_outcome) {
      const text = `${lr.source_review_outcome} on ${fmtDate(lr.source_review_at)}${lr.source_review_evidence ? ` — ${lr.source_review_evidence}` : ''}`;
      govSectionHeading(doc, 'Originating effectiveness review', text);
      govParagraph(doc, text);
    }

    if (lr.linked_action_title) {
      const text = `${lr.linked_action_title} (${lr.linked_action_status || 'status unknown'})`;
      govSectionHeading(doc, 'Follow-through action', text);
      govParagraph(doc, text);
    }

    return finishGovernanceRecord(doc, buffers, `Learning_${lr.id}.pdf`);
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
    const doc = createGovernanceRecordDoc();
    const buffers: Buffer[] = [];
    doc.on('data', (c: Buffer) => buffers.push(c));

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
    govTitle(doc, title);
    govGap(doc, GOV_HEADING_BLOCK_GAP);
    govSupportLine(doc, `Live data snapshot generated ${new Date().toLocaleString('en-GB')}. Not a frozen or published report — figures reflect the current state of the record and may change.`);
    govGap(doc, GOV_HEADING_BLOCK_TO_DETAILS_GAP);

    govMetaRow(doc, 'Service', e.service_name || e.house_name || '—');
    // Field report (12 Nov 2026): "name of client" -- the person this escalation concerns was
    // only ever implied inside the title text, never given its own labelled field.
    if (e.signal_related_person) govMetaRow(doc, 'Client', e.signal_related_person);
    govMetaRow(doc, 'Status', `${e.lifecycle_status || e.status || '—'}${e.overdue ? ' (OVERDUE)' : ''}`);
    govMetaRow(doc, 'Escalated by', `${e.escalated_by_name || '—'} to ${e.escalated_to_name || '—'} on ${fmtDate(e.created_at)}`);
    govMetaRow(doc, 'Due by', fmtDate(e.due_by));

    const reasonText = e.reason || e.description || 'Not recorded.';
    govSectionHeading(doc, 'Reason for escalation', reasonText);
    govParagraph(doc, reasonText);

    if (e.observation) {
      const sigText = `[${fmtDate(e.signal_logged_at)}] ${e.signal_severity || ''} ${e.signal_type || ''} — ${e.observation}`;
      govSectionHeading(doc, 'Originating signal', sigText);
      govParagraph(doc, sigText);
      if (e.signal_immediate_action) {
        govGap(doc, GOV_ATTRIBUTION_GAP);
        govParagraph(doc, `Immediate action taken: ${e.signal_immediate_action}`);
      }
    }

    // Field report (12 Nov 2026): "we need all information from original signal -> decisions made
    // from original signal -- monitoring if it was monitored and decisions; any/all recorded
    // decisions and actions on escalations assigned." This only ever showed the single MOST
    // RECENT progress note (escalations.service.ts findById's e.latest_note) -- the full history
    // of what was recorded against this escalation over time was fetched (e.actions) but never
    // rendered at all.
    const history = Array.isArray(e.actions) ? e.actions : [];
    if (history.length) {
      const reversedHistory = [...history].reverse();
      const firstEntryText = `[${fmtDate(reversedHistory[0].created_at)}] ${reversedHistory[0].action_type || 'Update'} — ${reversedHistory[0].taken_by_name || 'System'}`;
      govSectionHeading(doc, 'Monitoring and decision history', firstEntryText);
      // escalation_actions.created_at DESC from the service -- oldest first reads as a timeline.
      reversedHistory.forEach((a: any, idx: number) => {
        if (idx > 0 && doc.y + 24 > doc.page.height - (doc.page.margins as any).bottom) {
          (doc as any).addPage();
          govSectionHeading(doc, 'Monitoring and decision history (continued)');
        }
        govSupportText(doc, `[${fmtDate(a.created_at)}] ${a.action_type || 'Update'} — ${a.taken_by_name || 'System'}`, { bold: true });
        if (a.description) govSupportText(doc, a.description, { indent: 10 });
      });
    }

    const decisions = Array.isArray(e.decisions) ? e.decisions : [];
    if (decisions.length) {
      const firstDecisionText = `[${fmtDate(decisions[0].review_date)}] ${decisions[0].decision || 'Decision'} — ${decisions[0].reviewer_name || 'Not recorded'}`;
      govSectionHeading(doc, 'Governance decisions recorded against this escalation', firstDecisionText);
      decisions.forEach((d: any, idx: number) => {
        if (idx > 0 && doc.y + 24 > doc.page.height - (doc.page.margins as any).bottom) {
          (doc as any).addPage();
          govSectionHeading(doc, 'Governance decisions recorded against this escalation (continued)');
        }
        govSupportText(doc, `[${fmtDate(d.review_date)}] ${d.decision || 'Decision'} — ${d.reviewer_name || 'Not recorded'}`, { bold: true });
        if (d.decision_rationale) govSupportText(doc, `Rationale: ${d.decision_rationale}`, { indent: 10 });
        if (d.due_at) govSupportText(doc, `Due/review: ${fmtDate(d.due_at)}`, { indent: 10 });
      });
    }

    // 30 Oct 2026 live bug report ("the bottom section the effectiveness did not pull up with
    // their reviews"): this previously printed only the aggregate count and the single LATEST
    // effectiveness verdict across all linked actions — never the individual actions, each with
    // its own outcome and evidence. escalationsService.findById() already returns the full
    // linked_actions array (same data the live screen's "Linked control position" uses); it was
    // simply never iterated here.
    const countsText = `${e.actions_completed_count || 0} of ${e.actions_total_count || 0} completed; ${e.actions_effectiveness_reviewed_count || 0} effectiveness-reviewed.`;
    govSectionHeading(doc, 'Linked delivery actions', countsText);
    govParagraph(doc, countsText);
    const linkedActions = Array.isArray(e.linked_actions) ? e.linked_actions : [];
    if (linkedActions.length) {
      linkedActions.forEach((a: any, idx: number) => {
        const outcome = a.effectiveness_outcome || (a.effectiveness && a.effectiveness !== 'Neutral' && a.effectiveness !== 'Ineffective' ? a.effectiveness : null)
          || (a.effectiveness === 'Ineffective' ? 'Not Effective' : a.effectiveness === 'Neutral' ? 'Partially Effective' : null);
        const statusLine = `${a.is_completed || /complete/i.test(String(a.status || a.canonical_status || '')) ? 'Completed' : 'Open'}${a.completed_at ? ` ${fmtDate(a.completed_at)}` : ''}${a.assigned_to_name ? ` · ${a.assigned_to_name}` : ''}${outcome ? ` · Effectiveness: ${outcome}` : ' · Effectiveness: Not yet reviewed'}`;
        if (doc.y + 28 > doc.page.height - (doc.page.margins as any).bottom) {
          (doc as any).addPage();
          govSectionHeading(doc, 'Linked delivery actions (continued)');
        }
        govSupportText(doc, `• ${shortText(a.title || a.action || 'Action', 120)}`, { bold: true });
        govSupportText(doc, statusLine, { indent: 10 });
        if (a.effectiveness_evidence) govSupportText(doc, `Evidence: ${a.effectiveness_evidence}`, { indent: 10 });
        if (idx < linkedActions.length - 1) govGap(doc, 4);
      });
    } else if (e.latest_effectiveness) {
      govParagraph(doc, `Latest effectiveness verdict: ${e.latest_effectiveness}`);
    }

    // Gap #10 fix: when this escalation closed with no linked action, the chosen evidence
    // basis and its specific supporting evidence (cited control / verified justification /
    // no-longer-applicable reason) must be visible here, not just folded into the general
    // closure_evidence text — otherwise a reviewer can't tell whether the basis was genuinely
    // substantiated or just an enum pick.
    if (e.closure_evidence_basis && e.closure_evidence_basis !== 'LINKED_ACTIONS') {
      govSectionHeading(doc, 'Closure basis (no linked action)', `Basis: ${e.closure_evidence_basis}`);
      govParagraph(doc, `Basis: ${e.closure_evidence_basis}`);
      if (e.closure_cited_control_action_id_title) {
        govSupportText(doc, `Cited existing control: ${e.closure_cited_control_action_id_title}`, { indent: 10 });
      }
      if (e.closure_basis_justification) {
        govSupportText(doc, `Justification: ${e.closure_basis_justification}`, { indent: 10 });
      }
      if (e.closure_verification_confirmed) {
        govSupportText(doc, 'The closer confirmed they personally verified this outcome.', { indent: 10 });
      }
    }

    return finishGovernanceRecord(doc, buffers, `Escalation_${e.id}.pdf`);
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

  // RI / Board Assurance Report PDF — same live-record spec/helpers as learningRecord/
  // escalationRecord above. Reads reportsData.service's providerAssurance(), which itself
  // reads the signed sign-off row directly (never recomputes), so this never shows a figure
  // the RI didn't actually see at sign-off. No raw UUIDs are rendered (validated_weekly_review_ids
  // is shown only as a count, per the frozen-report "no UUIDs" convention also followed by
  // learningRecord/escalationRecord above).
  async providerAssuranceRecord(company_id: string, weekEnding?: string) {
    const data = await reportsDataService.providerAssurance(company_id, weekEnding);
    const doc = createGovernanceRecordDoc();
    const buffers: Buffer[] = [];
    doc.on('data', (c: Buffer) => buffers.push(c));

    const weekLabel = data.week_ending ? fmtDate(data.week_ending) : (weekEnding ? fmtDate(weekEnding) : 'Not recorded');
    govTitle(doc, `Provider Assurance — week ending ${weekLabel}`);
    govGap(doc, GOV_HEADING_BLOCK_GAP);
    govSupportLine(doc, `Live data snapshot generated ${new Date().toLocaleString('en-GB')}. Not a frozen or published report — figures reflect the current state of the record and may change.`);
    govGap(doc, GOV_HEADING_BLOCK_TO_DETAILS_GAP);

    if (!data.signed) {
      const text = data.narrative || 'No provider assurance sign-off has been recorded for this week.';
      govSectionHeading(doc, 'No sign-off recorded', text);
      govParagraph(doc, text);
      return finishGovernanceRecord(doc, buffers, `Provider_Assurance_${weekEnding || 'latest'}.pdf`);
    }

    govMetaRow(doc, 'Week ending', weekLabel);
    govMetaRow(doc, 'Conclusion', data.conclusion || '—');
    govMetaRow(doc, 'Signed by', `${data.signer || '—'} on ${fmtDate(data.signed_at)}`);

    const rationaleText = data.rationale || 'Not recorded.';
    govSectionHeading(doc, 'Rationale', rationaleText);
    govParagraph(doc, rationaleText);

    const coverage = Array.isArray(data.validated_service_coverage) ? data.validated_service_coverage : [];
    const coverageText = coverage.length ? coverage.map((s: any) => s.name).filter(Boolean).join(', ') : 'Not recorded.';
    govSectionHeading(doc, `Validated service coverage (${coverage.length})`, coverageText);
    govParagraph(doc, coverageText);
    const reviewCount = Array.isArray(data.validated_weekly_review_ids) ? data.validated_weekly_review_ids.length : 0;
    if (reviewCount) {
      govParagraph(doc, `${reviewCount} Director-validated weekly review${reviewCount === 1 ? '' : 's'} were examined for this sign-off.`);
    }

    if (data.evidence_unavailable) {
      const unavailableText = 'Evidence snapshot unavailable — this sign-off predates evidence snapshotting (migration 213). The RI relied on the figures visible at the time; they are no longer recoverable and are not substituted with today\'s live totals.';
      govSectionHeading(doc, 'Evidence snapshot', unavailableText);
      govParagraph(doc, unavailableText, { color: GOV_COLORS.WARNING, bold: true });
    } else {
      const snap = data.evidence_totals_snapshot || {};
      const eff = snap.effectiveness || {};
      const firstLine = `Signals (7-day inflow): ${snap.signals ?? '—'}`;
      govSectionHeading(doc, 'Evidence snapshot (as recorded at sign-off)', firstLine);
      govParagraph(doc, firstLine);
      govParagraph(doc, `Unlinked patterns: ${snap.patterns ?? '—'}`);
      govParagraph(doc, `Open risks: ${snap.open_risks ?? '—'}`);
      govParagraph(doc, `Open escalations: ${snap.open_escalations ?? '—'}`);
      govParagraph(doc, `Overdue actions: ${snap.overdue_actions ?? '—'}`);
      govParagraph(doc, `Effectiveness — Effective: ${eff.effective ?? '—'} · Partially effective: ${eff.partially_effective ?? '—'} · Not effective: ${eff.not_effective ?? '—'} · Too early to assess: ${eff.too_early ?? '—'}`);
    }

    const followups = Array.isArray(data.linked_followups) ? data.linked_followups : [];
    if (followups.length) {
      govSectionHeading(doc, `Linked follow-ups (${followups.length})`);
      followups.forEach((f: any, idx: number) => {
        if (idx > 0 && doc.y + 28 > doc.page.height - (doc.page.margins as any).bottom) {
          (doc as any).addPage();
          govSectionHeading(doc, 'Linked follow-ups (continued)');
        }
        const title = shortText(f?.title || f?.description || f?.label || f?.name || 'Follow-up', 120);
        const owner = f?.owner_name || f?.owner || '—';
        const due = f?.due_date || f?.due_by || f?.due;
        govSupportText(doc, `• ${title}`, { bold: true });
        govSupportText(doc, `Owner: ${owner}${due ? ` · Due: ${fmtDate(due)}` : ''}`, { indent: 10 });
        if (idx < followups.length - 1) govGap(doc, 4);
      });
    } else {
      govSectionHeading(doc, 'Linked follow-ups', 'None recorded.');
      govParagraph(doc, 'None recorded.');
    }

    return finishGovernanceRecord(doc, buffers, `Provider_Assurance_${data.week_ending || weekEnding || 'latest'}.pdf`);
  },
};
