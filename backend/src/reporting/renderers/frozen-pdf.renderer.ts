import PDFDocument from 'pdfkit';
import { findReport } from '../config/report-catalog';

// Renders a PDF from the STORED snapshot only — never from live data, and never from a legacy
// inspection/governance narrative. Each recognised report is produced entirely from its
// report-specific structured renderer over the immutable snapshot (row.data + data.evidence).
// Missing information is stated ("Not recorded - follow-up required"); it is never invented.

const NAVY = '#12233f', BLUE = '#17689b', INK = '#1e2936', MUTED = '#607080';
const LINE = '#d6e0e7', PALE = '#eaf3f7';
const LEFT = 50, WIDTH = 495, PAGE_BOTTOM = 742;

const MISSING = 'Not recorded - follow-up required';
const date = (v?: any) => {
  if (!v) return 'Not recorded';
  const d = new Date(v);
  return isNaN(d.getTime()) ? 'Not recorded' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Remove Markdown control characters while keeping the words. Never leave **, #, ` or list markers.
const stripMarkup = (value: string) => value
  .replace(/\*\*/g, '')
  .replace(/^#{1,6}\s*/gm, '')
  .replace(/`/g, '')
  .replace(/^\s*[-*]\s+/gm, '')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
const label = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Turn any snapshot value into readable text. Objects become labelled "Key: value" fields (never
// [object Object] or raw JSON); arrays are joined; empty values state that nothing was recorded.
const clean = (v?: any): string => {
  if (v === null || v === undefined || v === '') return MISSING;
  if (Array.isArray(v)) return v.length ? v.map(clean).filter((s) => s !== MISSING).join(', ') || MISSING : MISSING;
  if (typeof v === 'object') {
    const parts = Object.entries(v)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${label(key)}: ${clean(value)}`);
    return parts.length ? parts.join('. ') : MISSING;
  }
  return stripMarkup(String(v).replace(/[{}\[\]"]/g, '').replace(/_/g, ' '));
};
export const formatReportText = clean;
const short = (v: any, max = 180) => (clean(v).length > max ? `${clean(v).slice(0, max - 1)}…` : clean(v));
// Manager reflection fields must only ever be free text. A structured value (e.g. the 13-step
// weekly-review wizard state, which contains record IDs) is never expanded into the report — it
// is treated as absent so no database identifier can leak into a narrative field.
const asText = (v: any) => (typeof v === 'string' || typeof v === 'number' ? clean(v) : '');

// ── layout primitives (every one resets doc.x to the left margin and uses explicit x/width) ────
function ensure(doc: PDFKit.PDFDocument, needed = 90, continuation?: string) {
  if (doc.y + needed > PAGE_BOTTOM) {
    doc.addPage();
    doc.x = LEFT;
    if (continuation) doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text(`${continuation} - continued`, LEFT, doc.y, { width: WIDTH }).moveDown(0.4);
  }
}

function heading(doc: PDFKit.PDFDocument, title: string) {
  ensure(doc, 46);
  doc.x = LEFT;
  doc.moveDown(0.9);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(BLUE).text(title, LEFT, doc.y, { width: WIDTH }).moveDown(0.3);
  doc.x = LEFT;
}

function paragraph(doc: PDFKit.PDFDocument, text?: any, italic = false) {
  ensure(doc, 40);
  doc.x = LEFT;
  const blocks = clean(text).split(/\n\s*\n/).filter(Boolean);
  for (const block of blocks) {
    doc.font(italic ? 'Helvetica-Oblique' : 'Helvetica').fontSize(9).fillColor(italic ? MUTED : INK)
      .text(block, LEFT, doc.y, { width: WIDTH, lineGap: 3 }).moveDown(0.55);
    doc.x = LEFT;
  }
}

function bullets(doc: PDFKit.PDFDocument, values: any[], empty: string, limit = 6) {
  const shown = values.filter(Boolean).slice(0, limit);
  if (!shown.length) return paragraph(doc, empty, true);
  for (const value of shown) {
    ensure(doc, 34);
    doc.x = LEFT;
    doc.font('Helvetica').fontSize(9).fillColor(INK).text(`• ${short(value, 230)}`, LEFT, doc.y, { width: WIDTH, indent: 10, lineGap: 3 }).moveDown(0.35);
    doc.x = LEFT;
  }
  if (values.length > shown.length) paragraph(doc, `${values.length - shown.length} additional record(s) remain in the frozen snapshot.`, true);
}

type Col = { label: string; key: string; width: number; map?: (r: any) => string };

function table(doc: PDFKit.PDFDocument, title: string, rows: any[], columns: Col[], empty: string, limit = 8) {
  heading(doc, title);
  const shown = (rows || []).slice(0, limit);
  if (!shown.length) return paragraph(doc, empty, true);

  const header = () => {
    ensure(doc, 40, title);
    const y = doc.y;
    doc.rect(LEFT, y, WIDTH, 20).fill(PALE);
    let x = LEFT + 4;
    doc.font('Helvetica-Bold').fontSize(7.2).fillColor(NAVY);
    for (const c of columns) { doc.text(c.label, x, y + 6, { width: c.width - 7 }); x += c.width; }
    doc.x = LEFT; doc.y = y + 24;
  };
  header();

  for (const row of shown) {
    const values = columns.map((c) => (c.map ? clean(c.map(row)) : clean(row[c.key])));
    const rowHeight = Math.min(72, Math.max(16, ...values.map((v, i) => doc.heightOfString(v, { width: columns[i].width - 7 }) + 8)));
    if (doc.y + rowHeight > PAGE_BOTTOM) { doc.addPage(); doc.x = LEFT; header(); }
    const y = doc.y;
    let x = LEFT + 4;
    doc.font('Helvetica').fontSize(7.4).fillColor(INK);
    values.forEach((v, i) => { doc.text(v, x, y + 4, { width: columns[i].width - 7, height: rowHeight - 7, ellipsis: true }); x += columns[i].width; });
    doc.moveTo(LEFT, y + rowHeight).lineTo(LEFT + WIDTH, y + rowHeight).strokeColor(LINE).lineWidth(0.5).stroke();
    doc.x = LEFT; doc.y = y + rowHeight;
  }
  doc.x = LEFT; doc.moveDown(0.55);
  if (rows.length > shown.length) paragraph(doc, `${rows.length - shown.length} additional record(s) remain in the frozen snapshot.`, true);
}

// ── evidence-led helpers ───────────────────────────────────────────────────────
const isOpen = (status: any) => !/complete|completed|cancel|closed|resolved/i.test(clean(status));
const inPeriod = (value: any, data: any) => {
  if (!value || !data.period?.start || !data.period?.end) return false;
  const at = new Date(value).getTime();
  return at >= new Date(data.period.start).getTime() && at <= new Date(data.period.end).getTime();
};
const priorityActions = (data: any, actions: any[]) => [...actions].sort((a: any, b: any) => {
  const score = (x: any) => (isOpen(x.status) ? 0 : inPeriod(x.completed_at, data) ? 1 : 2);
  return score(a) - score(b) || new Date(a.due_date || '9999-12-31').getTime() - new Date(b.due_date || '9999-12-31').getTime();
});

// Overall position, tied to visible evidence. A CRITICAL position must name the open critical risk
// that justifies it, or state that the basis was not identified and requires confirmation.
function position(data: any): string {
  const critical = (data.per_site || []).filter((s: any) => s.status === 'CRITICAL');
  const attention = (data.per_site || []).filter((s: any) => s.status === 'ATTENTION');
  if (critical.length) {
    const criticalRisks = (data.evidence?.risks || []).filter((r: any) => /critical/i.test(clean(r.severity)) && isOpen(r.status));
    const reason = criticalRisks.length
      ? ` This position is supported by the following open critical risk${criticalRisks.length === 1 ? '' : 's'}: ${criticalRisks.slice(0, 3).map((r: any) => `${clean(r.service)} - ${clean(r.risk)}`).join('; ')}.`
      : ' The snapshot does not identify the specific critical risk, so management must confirm the basis for this position.';
    return `Significant concern requires urgent oversight in ${critical.map((s: any) => clean(s.site_name)).join(', ')}.${reason}`;
  }
  if (attention.length) return `Management attention is required in ${attention.map((s: any) => clean(s.site_name)).join(', ')}.`;
  return 'No immediate exception was identified from the information reviewed for this period.';
}

function renderWeeklyReviews(doc: PDFKit.PDFDocument, reviews: any[], limit = 3) {
  const shown = (reviews || []).slice(0, limit);
  if (!shown.length) return paragraph(doc, 'No manager reflection was recorded for this reporting period.', true);
  for (const review of shown) {
    heading(doc, `${clean(review.service)} - week ending ${date(review.week_ending)}`);
    const content = asText(review.content);
    if (content) paragraph(doc, content);
    const lessons = asText(review.lessons_learnt);
    if (lessons) { doc.x = LEFT; doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY).text('Learning recorded', LEFT, doc.y, { width: WIDTH }); paragraph(doc, lessons); }
    const risks = asText(review.anticipated_risks);
    if (risks) { doc.x = LEFT; doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY).text('Next risks to watch', LEFT, doc.y, { width: WIDTH }); paragraph(doc, risks); }
    if (!content && !lessons && !risks) paragraph(doc, 'No manager reflection text was recorded for this review.', true);
  }
}

// ── the ten report templates ───────────────────────────────────────────────────
// Weekly Governance Review — the approved four-question format ("what we knew, what we did,
// what we learned, what to expect next week") plus a manager conclusion and evidence-gaps
// section. This is the ONLY renderer for this report key; no legacy weekly format runs before,
// after or between these sections.
function renderWeekly(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  const latestReview = (e.weekly_reviews || [])[0];
  const openRisks = (e.risks || []).filter((r: any) => isOpen(r.status));
  const openActions = priorityActions(data, e.actions || []).filter((a: any) => isOpen(a.status));
  const openEscalations = (e.escalations || []).filter((x: any) => isOpen(x.status));
  const completedThisWeek = (e.actions || []).filter((a: any) => !isOpen(a.status) && inPeriod(a.completed_at, data));

  heading(doc, '1. What did we know?');
  paragraph(doc, position(data));
  bullets(doc, [
    ...openRisks.map((r: any) => `${clean(r.service)}: ${clean(r.risk)} remained ${clean(r.status)}; severity ${clean(r.severity)}, direction ${clean(r.direction)}.`),
    ...(e.signals || []).filter((s: any) => /high|critical/i.test(clean(s.severity))).map((s: any) => `${clean(s.service)}: ${clean(s.concern)}`),
  ], 'No significant open risk or high-severity concern was identified from the selected snapshot.', 4);

  table(doc, '2. What did we do?', [
    ...(e.decisions || []).map((r: any) => ({ ...r, response: r.decision, owner_name: r.reviewer, response_status: r.status })),
    ...completedThisWeek.map((r: any) => ({ ...r, concern: r.action, response: 'Action completed', owner_name: r.owner, response_status: r.effectiveness })),
    ...openEscalations.map((r: any) => ({ ...r, concern: r.reason, response: 'Escalated', owner_name: r.escalated_to, response_status: r.status })),
  ], [
    { label: 'Concern / information', key: 'concern', width: 205 }, { label: 'Response', key: 'response', width: 90 },
    { label: 'Responsible', key: 'owner_name', width: 90 }, { label: 'Evidence / position', key: 'response_status', width: 110 },
  ], 'No management decision, completed response or escalation was recorded this week.', 6);

  heading(doc, '3. What did we learn?');
  bullets(doc, [
    asText(latestReview?.lessons_learnt),
    ...(e.actions || []).filter((a: any) => a.effectiveness && !/not yet/i.test(a.effectiveness)).map((a: any) => `${clean(a.action)}: ${clean(a.effectiveness)}. Evidence: ${clean(a.completion_evidence)}`),
  ], 'No learning or effectiveness conclusion was recorded. A completed action is not proof that the concern was resolved.', 4);

  table(doc, '4. What should we expect next week?', openActions, [
    { label: 'Required action', key: 'action', width: 205 }, { label: 'Owner', key: 'owner', width: 90 },
    { label: 'Due', key: 'due_date', width: 70, map: (r) => date(r.due_date) },
    { label: 'Evidence expected', key: 'completion_evidence', width: 130, map: (r) => r.completion_evidence || 'Outcome evidence required' },
  ], 'No open action was identified. The manager should confirm whether any follow-up is still required.', 5);
  const anticipated = asText(latestReview?.anticipated_risks);
  if (anticipated) {
    doc.x = LEFT; doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY).text('Risks to watch', LEFT, doc.y, { width: WIDTH });
    paragraph(doc, anticipated);
  }

  heading(doc, 'Manager conclusion');
  paragraph(doc, asText(latestReview?.content) || `${position(data)} The coming week should focus on completing and verifying the open actions shown above.`);

  const gaps = [
    ...(e.decisions || []).filter((d: any) => !d.reason).map((d: any) => `The reason for the ${clean(d.decision)} decision about ${short(d.concern, 90)} was not recorded.`),
    ...openActions.filter((a: any) => !a.owner).map((a: any) => `No owner was recorded for ${short(a.action, 100)}.`),
    ...openActions.filter((a: any) => !a.due_date).map((a: any) => `No due date was recorded for ${short(a.action, 100)}.`),
    ...completedThisWeek.filter((a: any) => !a.effectiveness || /not yet/i.test(a.effectiveness)).map((a: any) => `Effectiveness has not been reviewed for ${short(a.action, 100)}.`),
  ];
  heading(doc, 'Evidence gaps to correct');
  bullets(doc, gaps, 'No specific evidence gap was identified from the fields reviewed. The manager must still confirm completeness before finalisation.', 4);
}

function renderOverview(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  heading(doc, '1. Overall position'); paragraph(doc, position(data));
  table(doc, '2. Services requiring attention', (data.per_site || []).filter((s: any) => s.status !== 'STABLE'), [
    { label: 'Service', key: 'site_name', width: 150 }, { label: 'Position', key: 'status', width: 90 },
    { label: 'Gov %', key: 'governance_confidence', width: 60, map: (r) => `${r.governance_confidence ?? '—'}%` },
    { label: 'Open risks', key: 'open_risks', width: 95, map: (r) => String(r.open_risks ?? 0) },
    { label: 'Overdue', key: 'overdue_actions', width: 100, map: (r) => String(r.overdue_actions ?? 0) },
  ], 'No service was rated ATTENTION or CRITICAL in this period.', 12);
  heading(doc, '3. Recorded response');
  bullets(doc, (e.decisions || []).map((d: any) => `${clean(d.service)}: ${clean(d.decision)} - ${clean(d.reason)}`), 'No management response was recorded in this period.', 5);
  heading(doc, '4. Evidenced improvement');
  bullets(doc, (e.actions || []).filter((a: any) => a.effectiveness && /effective|improv|reduc/i.test(a.effectiveness) && !/not yet/i.test(a.effectiveness)).map((a: any) => `${clean(a.action)}: ${clean(a.effectiveness)}`), 'Improvement is not yet demonstrated by recorded effectiveness evidence.', 5);
  heading(doc, '5. Unresolved work');
  bullets(doc, [...(e.actions || []).filter((a: any) => isOpen(a.status)).map((a: any) => `${clean(a.action)} - due ${date(a.due_date)}`), ...(e.escalations || []).filter((x: any) => isOpen(x.status)).map((x: any) => `Escalation: ${clean(x.reason)} - due ${date(x.due_by)}`)], 'No unresolved action or escalation was recorded.', 6);
  heading(doc, '6. Management priority'); paragraph(doc, position(data));
}

function renderRisks(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  heading(doc, '1. Key risks and management response');
  paragraph(doc, 'Each risk below is drawn from the frozen snapshot with its recorded severity, direction, status and review date. A missing review date is shown so it can be corrected.');
  table(doc, '2. Risks on record', e.risks || [], [
    { label: 'Service', key: 'service', width: 80 }, { label: 'Risk', key: 'risk', width: 170 },
    { label: 'Severity / direction', key: 'severity', width: 110, map: (r) => `${clean(r.severity)} / ${clean(r.direction)}` },
    { label: 'Status', key: 'status', width: 60 },
    { label: 'Review due', key: 'review_due_date', width: 75, map: (r) => date(r.review_due_date) },
  ], 'No risk was recorded in scope for this period.', 12);
  heading(doc, '3. Closed risks - reason for closure');
  bullets(doc, (e.risks || []).filter((r: any) => /closed|resolved/i.test(clean(r.status))).map((r: any) => `${clean(r.risk)} (${clean(r.service)}): ${clean(r.resolution_reason)}`), 'No risk was closed in this period.', 6);
}

function renderEscalations(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  heading(doc, '1. Escalations and management response');
  paragraph(doc, `This report covers matters escalated for management attention in ${clean(data.scope_label)} during the selected period, with the recorded response to each.`);
  table(doc, '2. Escalations', e.escalations || [], [
    { label: 'Raised', key: 'date', width: 60, map: (r) => date(r.date) }, { label: 'Service', key: 'service', width: 75 },
    { label: 'Reason', key: 'reason', width: 150 }, { label: 'Recipient', key: 'escalated_to', width: 80 },
    { label: 'Position / due', key: 'status', width: 130, map: (r) => `${clean(r.status)} / ${date(r.due_by)}` },
  ], 'No escalation was recorded in this period.', 10);
  heading(doc, '3. Outcomes recorded');
  bullets(doc, (e.escalations || []).filter((x: any) => x.outcome).map((x: any) => `${date(x.date)} ${clean(x.service)} - escalated to ${clean(x.escalated_to)}: ${clean(x.outcome)}`), 'No escalation outcome was recorded in this period.', 6);
  paragraph(doc, 'Closing an escalation does not automatically close the underlying concern or risk.', true);
}

function renderManager(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  heading(doc, '1. What stood out this week'); paragraph(doc, position(data));
  heading(doc, '2. What the information may be telling us');
  bullets(doc, (data.cross_site_themes || []).map((t: any) => `${clean(t.theme)} appeared in ${t.n} recorded signal(s). This is not by itself proof of a pattern.`), 'No recurring theme was visible.', 4);
  heading(doc, '3. Important decisions made');
  bullets(doc, (e.decisions || []).map((d: any) => `${clean(d.service)}: ${clean(d.decision)} - ${clean(d.reason)}`), 'No management decision was recorded.', 5);
  heading(doc, '4. What requires continued attention');
  bullets(doc, (e.actions || []).filter((a: any) => isOpen(a.status)).map((a: any) => `${clean(a.action)} - ${clean(a.owner) === MISSING ? 'owner not recorded' : clean(a.owner)} - due ${date(a.due_date)}`), 'No continuing action was identified.', 4);
  heading(doc, '5. Reflections recorded by managers'); renderWeeklyReviews(doc, e.weekly_reviews || [], 3);
  heading(doc, '6. Management conclusion'); paragraph(doc, position(data));
}

function renderPatterns(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  table(doc, '1. Patterns identified across services', (e.patterns || []).filter((p: any) => p.scope === 'cross_service' && !/dismissed|closed/i.test(clean(p.status))), [
    { label: 'Pattern', key: 'pattern', width: 150 }, { label: 'Domain', key: 'domain', width: 90 },
    { label: 'Services affected', key: 'affected_scope', width: 140 },
    { label: 'Evidence / review', key: 'signal_count', width: 115, map: (r) => `${clean(r.signal_count)} signal(s); ${clean(r.review_outcome || r.status)}` },
  ], 'No active cross-service pattern was recorded.', 8);
  heading(doc, '2. Why the connection matters');
  paragraph(doc, 'A repeated category alone is not enough. Management must confirm the shared feature, consider alternatives and record why organisation-wide oversight is justified.');
  table(doc, '3. Organisation-wide response', (e.actions || []).filter((a: any) => a.service === 'Organisation-wide'), [
    { label: 'Required response', key: 'action', width: 230 }, { label: 'Owner', key: 'owner', width: 110 },
    { label: 'Position / due', key: 'status', width: 155, map: (r) => `${clean(r.status)} / ${date(r.due_date)}` },
  ], 'No organisation-wide response was recorded.', 6);
}

function renderEvidence(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  heading(doc, '1. Evidence index');
  paragraph(doc, `Recorded pathway for ${clean(data.scope_label)} in this period: ${(e.signals || []).length} concern(s) logged; ${(e.risks || []).length} risk(s) on record; ${(e.actions || []).length} action(s); ${(e.escalations || []).length} escalation(s); ${(e.decisions || []).length} decision(s). The complete records remain available in-system.`);
  table(doc, '2. Recorded concerns', e.signals || [], [
    { label: 'Date', key: 'date', width: 62, map: (r) => date(r.date) }, { label: 'Service', key: 'service', width: 90 },
    { label: 'Concern', key: 'concern', width: 215 }, { label: 'Domain', key: 'domain', width: 128 },
  ], 'No concern was recorded in this period.', 6);
  table(doc, '3. Risks on record', e.risks || [], [
    { label: 'Risk', key: 'risk', width: 200 }, { label: 'Service', key: 'service', width: 100 },
    { label: 'Severity', key: 'severity', width: 90 }, { label: 'Status', key: 'status', width: 105 },
  ], 'No risk was recorded in this period.', 6);
  table(doc, '4. Decisions on record', e.decisions || [], [
    { label: 'Date', key: 'date', width: 62, map: (r) => date(r.date) }, { label: 'Decision', key: 'decision', width: 130 },
    { label: 'Reason', key: 'reason', width: 155 }, { label: 'Reviewer', key: 'reviewer', width: 148 },
  ], 'No decision was recorded in this period.', 6);
  heading(doc, '5. Evidence gaps and limitations');
  const decNoReason = (e.decisions || []).filter((d: any) => !d.reason).length;
  const riskNoReview = (e.risks || []).filter((r: any) => !r.review_due_date && isOpen(r.status)).length;
  const actNoEff = (e.actions || []).filter((a: any) => !isOpen(a.status) && /not yet/i.test(clean(a.effectiveness))).length;
  const gaps: string[] = [
    ...(Array.isArray(data.limitations) ? data.limitations : []),
    decNoReason ? `${decNoReason} decision(s) have no recorded rationale.` : '',
    riskNoReview ? `${riskNoReview} open risk(s) have no review date.` : '',
    actNoEff ? `${actNoEff} completed action(s) have no effectiveness judgement.` : '',
  ].filter(Boolean);
  bullets(doc, gaps, 'No specific evidence gap was identified beyond the records shown.', 6);
}

function renderReconstruction(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  const timeline = [
    ...(e.signals || []).map((r: any) => ({ date: r.date, type: 'Signal', information: r.concern, response: r.review_status, person: 'Recorded source' })),
    ...(e.decisions || []).map((r: any) => ({ date: r.date, type: 'Decision', information: r.concern, response: `${clean(r.decision)}: ${clean(r.reason)}`, person: r.reviewer })),
    ...(e.escalations || []).map((r: any) => ({ date: r.date, type: 'Escalation', information: r.reason, response: r.status, person: r.escalated_to })),
    ...(e.actions || []).map((r: any) => ({ date: r.created_at, type: 'Action', information: r.action, response: `${clean(r.status)}; due ${date(r.due_date)}; ${clean(r.effectiveness)}`, person: r.owner })),
  ].filter((r: any) => inPeriod(r.date, data))
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  heading(doc, '1. Scope and factual account');
  paragraph(doc, `This reconstruction covers ${clean(data.scope_label)} and uses only records retained in the frozen snapshot, limited to events within the selected period.`);
  table(doc, '2. Governance timeline', timeline, [
    { label: 'Date / type', key: 'date', width: 90, map: (r) => `${date(r.date)} / ${r.type}` },
    { label: 'Information available', key: 'information', width: 185 },
    { label: 'Response recorded', key: 'response', width: 150 }, { label: 'Source', key: 'person', width: 70 },
  ], 'No in-period governance event was recorded for this reconstruction.', 20);
  table(doc, '3. Actions and follow-through', (e.actions || []).filter((a: any) => inPeriod(a.created_at, data)), [
    { label: 'Action', key: 'action', width: 190 }, { label: 'Completed / status', key: 'status', width: 100, map: (r) => `${clean(r.status)} (created ${date(r.created_at)})` },
    { label: 'Completion evidence', key: 'completion_evidence', width: 115 }, { label: 'Effectiveness', key: 'effectiveness', width: 90 },
  ], 'No action was created within this reconstruction period.', 10);
  heading(doc, '4. Learning and limitations');
  bullets(doc, (e.weekly_reviews || []).map((r: any) => r.lessons_learnt).filter(Boolean), 'No learning or missed opportunity was recorded. The report must not invent causation, blame or information that was unavailable at the time.', 4);
}

function renderAssurance(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  heading(doc, '1. Leadership position'); paragraph(doc, position(data));
  table(doc, '2. Services and position', data.per_site || [], [
    { label: 'Service', key: 'site_name', width: 175 }, { label: 'Position', key: 'status', width: 95 },
    { label: 'Gov %', key: 'governance_confidence', width: 70, map: (r) => `${r.governance_confidence ?? '—'}%` },
    { label: 'Open risks', key: 'open_risks', width: 75, map: (r) => String(r.open_risks ?? 0) },
    { label: 'Overdue', key: 'overdue_actions', width: 70, map: (r) => String(r.overdue_actions ?? 0) },
  ], 'No service was in scope for this report.', 12);
  heading(doc, '3. What is evidenced as working');
  bullets(doc, (e.actions || []).filter((a: any) => a.effectiveness && /effective|improv|reduc/i.test(a.effectiveness) && !/not yet/i.test(a.effectiveness)).map((a: any) => `${clean(a.action)}: ${clean(a.effectiveness)}`), 'Improvement is not yet demonstrated by recorded effectiveness evidence.', 5);
  heading(doc, '4. Assurance limitations');
  bullets(doc, [
    ...(data.material_exceptions || []).map((x: any) => `${clean(x.site_name)} - ${clean(x.status)} (governance confidence ${x.governance_confidence ?? '—'}%)`),
    ...(Array.isArray(data.limitations) ? data.limitations : []),
  ], 'No material exception was recorded for this period.', 6);
  heading(doc, '5. Required response');
  bullets(doc, [...(e.actions || []).filter((a: any) => isOpen(a.status)).map((a: any) => `${clean(a.action)} - due ${date(a.due_date)}`), ...(e.escalations || []).filter((x: any) => isOpen(x.status)).map((x: any) => `Escalation: ${clean(x.reason)} - due ${date(x.due_by)}`)], 'No outstanding response was recorded.', 5);
  heading(doc, '6. Conclusion');
  paragraph(doc, 'This assurance is limited to the recorded evidence, scope and period shown. Where evidence is absent, assurance cannot be given and management confirmation is required.', true);
}

function renderDecisions(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  table(doc, 'Governance decision record', (e.decisions || []).map((r: any) => ({ ...r, reason: r.reason || MISSING, followup: `${clean(r.status)}; ${date(r.due_at)}` })), [
    { label: 'Date', key: 'date', width: 55, map: (r) => date(r.date) }, { label: 'Concern / information', key: 'concern', width: 125 },
    { label: 'Decision', key: 'decision', width: 65 }, { label: 'Reason', key: 'reason', width: 125 },
    { label: 'Responsible', key: 'reviewer', width: 70 }, { label: 'Follow-up', key: 'followup', width: 55 },
  ], 'No governance decision was recorded.', 18);
  heading(doc, 'Related audit activity');
  table(doc, 'Audit trail', e.audit || [], [
    { label: 'When', key: 'date', width: 90, map: (r) => date(r.date) }, { label: 'Actor', key: 'actor', width: 105 },
    { label: 'Action', key: 'action', width: 120 }, { label: 'Reason', key: 'reason', width: 180 },
  ], 'No audit entry is on record for the items in this report.', 12);
}

function renderSafeFallback(doc: PDFKit.PDFDocument, data: any) {
  heading(doc, 'Recorded snapshot');
  paragraph(doc, 'This report type does not have a structured template configured. Only the recorded snapshot position is shown; no narrative is generated.');
  paragraph(doc, position(data));
}

export function renderSnapshotPdf(row: any): Promise<Buffer> {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
  const title = findReport(row.report_key)?.title || row.report_key;

  const doc = new PDFDocument({ margin: LEFT, size: 'A4', bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const finished = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  // Masthead
  doc.x = LEFT;
  doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text(title, LEFT, doc.y, { width: WIDTH });
  doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor(MUTED)
    .text(`${clean(data.scope_label) === MISSING ? row.scope_type : clean(data.scope_label)}  ·  ${date(row.period_start)} to ${date(row.period_end)}`, LEFT, doc.y, { width: WIDTH });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED)
    .text(`Status: ${clean(row.status)}${row.approved_at ? ` | Approved ${date(row.approved_at)}` : ''}`, LEFT, doc.y, { width: WIDTH });
  doc.moveDown(0.5).moveTo(LEFT, doc.y).lineTo(LEFT + WIDTH, doc.y).strokeColor(LINE).stroke();
  doc.x = LEFT; doc.moveDown(0.4);

  // Body — route to the report-specific structured template. No legacy narrative is appended.
  switch (row.report_key) {
    case 'weekly-governance-review': renderWeekly(doc, data); break;
    case 'executive-governance-dashboard': renderOverview(doc, data); break;
    case 'strategic-risk-register': renderRisks(doc, data); break;
    case 'escalation-intervention': renderEscalations(doc, data); break;
    case 'weekly-leadership-narrative': renderManager(doc, data); break;
    case 'cross-service-governance': renderPatterns(doc, data); break;
    case 'inspection-evidence-pack': renderEvidence(doc, data); break;
    case 'governance-reconstruction': renderReconstruction(doc, data); break;
    case 'board-ri-assurance': renderAssurance(doc, data); break;
    case 'governance-audit-log': renderDecisions(doc, data); break;
    default: renderSafeFallback(doc, data);
  }

  // Integrity block (content, not footer, so it can never overlap or create a blank page).
  heading(doc, 'Report integrity');
  paragraph(doc, 'Rendered from an immutable, authorised snapshot. Conclusions are limited to the recorded evidence, scope and period shown.', true);
  paragraph(doc, `Evidence hash: ${String(row.evidence_hash || '').slice(0, 32) || 'Not recorded'}`, true);

  // Page numbers only, drawn below the content frame with lineBreak:false so no blank page is added.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Zero the bottom margin only for the page-number write so PDFKit does not treat the text as
    // overflowing the content frame and append a blank page; restore it immediately afterwards.
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(7).fillColor(MUTED)
      .text(`Page ${i - range.start + 1} of ${range.count}`, LEFT, doc.page.height - 30, { width: WIDTH, align: 'right', lineBreak: false });
    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
  return finished;
}
