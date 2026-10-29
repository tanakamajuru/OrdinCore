import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { findReport } from '../config/report-catalog';
import { isDemonstratedEffective, hasWeakEvidence } from '../domain/effectiveness-evidence';

// Renders a PDF from the STORED snapshot only — never from live data, and never from a legacy
// inspection/governance narrative. Each recognised report is produced entirely from its
// report-specific structured renderer over the immutable snapshot (row.data + data.evidence).
// Missing information is stated ("Not recorded - follow-up required"); it is never invented.

const NAVY = '#102A43', BLUE = '#2474C6', AQUA = '#14A0A8';
const INK = '#172B3A', MUTED = '#475D6E', SOFT = '#667A8B';
const LINE = '#CFDEE8', PALE = '#F0F6FA', HEADER_PALE = '#E8F2F9';
const LEFT = 50, WIDTH = 495, PAGE_BOTTOM = 742;
const LOGO_SIZE = 54;

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

// 28 Oct developer instructions (Revision 3, P1 "Weekly learning and forward look"): RM-recorded
// anticipated_risks is a structured object ({ items: [{theme, reason}], rm_note }), not a string.
// asText() silently dropped it (returns '' for any non-string/number), so "Risks to watch" never
// rendered at all even when the RM had recorded items -- a formatter suppressing real content,
// exactly what the brief warns against. Format items and the RM note deliberately instead.
const formatAnticipatedRisks = (v: any): string => {
  if (typeof v === 'string') return clean(v);
  if (!v || typeof v !== 'object') return '';
  const items = Array.isArray(v.items) ? v.items : [];
  const note = typeof v.rm_note === 'string' ? v.rm_note.trim() : '';
  const list = items
    .map((a: any) => [clean(a?.theme), clean(a?.reason)].filter(Boolean).join(' — '))
    .filter(Boolean)
    .join('\n');
  return [list, note ? `Manager note: ${note}` : ''].filter(Boolean).join('\n');
};

const roleLabel = (value?: any) => {
  const raw = String(value || '').trim().toLowerCase();
  const labels: Record<string, string> = {
    rm: 'Registered Manager', registered_manager: 'Registered Manager',
    team_leader: 'Team Leader', tl: 'Team Leader',
    director: 'Director', ri: 'Responsible Individual', responsible_individual: 'Responsible Individual',
    admin: 'Administrator', super_admin: 'Super Administrator', superadmin: 'Super Administrator',
  };
  return labels[raw] || (raw ? label(raw) : 'Not recorded');
};

const dateTime = (v?: any) => {
  if (!v) return 'Not recorded';
  const d = new Date(v);
  return isNaN(d.getTime()) ? 'Not recorded' : d.toLocaleString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

function resolveLogoPath(): string | null {
  const candidates = [
    path.resolve(__dirname, '../assets/ordin-core-logo.png'),
    path.resolve(process.cwd(), 'src/reporting/assets/ordin-core-logo.png'),
    path.resolve(process.cwd(), 'backend/src/reporting/assets/ordin-core-logo.png'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function metadataValue(data: any, row: any, key: string, fallback?: any): string {
  const metadata = data?.report_metadata || {};
  const value = metadata[key] ?? fallback;
  return clean(value);
}

function reportMasthead(doc: PDFKit.PDFDocument, row: any, data: any, title: string) {
  const top = 44;
  const logoPath = resolveLogoPath();

  // Brand identifier - same on every report.
  doc.font('Helvetica-Bold').fontSize(9).fillColor(BLUE)
    .text('ORDIN CORE', LEFT, top, { width: 280, characterSpacing: 1.4 });
  doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY)
    .text('Governance & Oversight', LEFT, top + 16, { width: 320 });

  if (logoPath) {
    doc.image(logoPath, LEFT + WIDTH - LOGO_SIZE, top - 7, { fit: [LOGO_SIZE, LOGO_SIZE], align: 'right' });
  } else {
    // Visible fallback if packaging omitted the image: retain brand identity without breaking PDF generation.
    doc.roundedRect(LEFT + WIDTH - 48, top - 3, 44, 44, 9).lineWidth(1.5).strokeColor(BLUE).stroke();
    doc.font('Helvetica-Bold').fontSize(20).fillColor(BLUE)
      .text('O', LEFT + WIDTH - 48, top + 7, { width: 44, align: 'center' });
  }

  doc.moveTo(LEFT, top + 58).lineTo(LEFT + WIDTH, top + 58).lineWidth(1.2).strokeColor(BLUE).stroke();
  doc.y = top + 72;
  doc.x = LEFT;

  // Report title is visually distinct from the Ordin Core masthead.
  doc.font('Helvetica-Bold').fontSize(19).fillColor(NAVY)
    .text(title, LEFT, doc.y, { width: WIDTH - 8, lineGap: 2 });
  doc.moveDown(0.55);

  const organisation = metadataValue(data, row, 'organisation', row.organisation_name || 'Not recorded');
  const producedAt = metadataValue(data, row, 'produced_at', row.created_at);
  const producedByName = metadataValue(data, row, 'produced_by_name', row.generated_by_name || 'Not recorded');
  const producedByRole = metadataValue(data, row, 'produced_by_role', row.generated_by_role || 'Not recorded');
  const scope = clean(data.scope_label) === MISSING ? clean(row.scope_type) : clean(data.scope_label);
  const reportStatus = `${clean(row.status)}${row.approved_at ? ` - approved ${dateTime(row.approved_at)}` : ''}`;

  const metadataRows = [
    ['Organisation', organisation],
    ['Date and time produced', producedAt === 'Not recorded' ? producedAt : dateTime(producedAt)],
    ['Produced by', `${producedByName}${producedByRole !== 'Not recorded' ? ` - ${roleLabel(producedByRole)}` : ''}`],
    ['Title of report', title],
    ['Reporting period', `${date(row.period_start)} to ${date(row.period_end)}`],
    ['Scope', scope],
    ['Status', reportStatus],
  ];

  const labelWidth = 132;
  const valueWidth = WIDTH - labelWidth;
  const rowX = LEFT;
  let y = doc.y;
  metadataRows.forEach(([metaLabel, value], index) => {
    const valueHeight = doc.font('Helvetica').fontSize(9.5).heightOfString(value, { width: valueWidth - 14, lineGap: 1.5 });
    const rowHeight = Math.max(24, valueHeight + 10);
    if (index % 2 === 0) doc.rect(rowX, y, WIDTH, rowHeight).fill(HEADER_PALE);
    doc.font('Helvetica-Bold').fontSize(9.2).fillColor(NAVY)
      .text(metaLabel, rowX + 8, y + 7, { width: labelWidth - 12 });
    doc.font('Helvetica').fontSize(9.5).fillColor(INK)
      .text(value, rowX + labelWidth, y + 7, { width: valueWidth - 10, lineGap: 1.5 });
    doc.moveTo(rowX, y + rowHeight).lineTo(rowX + WIDTH, y + rowHeight).lineWidth(0.45).strokeColor(LINE).stroke();
    y += rowHeight;
  });
  doc.y = y + 12;
  doc.x = LEFT;
}

// ── layout primitives (every one resets doc.x to the left margin and uses explicit x/width) ────
function ensure(doc: PDFKit.PDFDocument, needed = 90, continuation?: string) {
  if (doc.y + needed > PAGE_BOTTOM) {
    doc.addPage();
    doc.x = LEFT;
    if (continuation) doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY).text(`${continuation} - continued`, LEFT, doc.y, { width: WIDTH, lineGap: 2 }).moveDown(0.5);
  }
}

function heading(doc: PDFKit.PDFDocument, title: string) {
  ensure(doc, 46);
  doc.x = LEFT;
  doc.moveDown(1.0);
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(NAVY).text(title, LEFT, doc.y, { width: WIDTH, lineGap: 2 });
  doc.moveDown(0.18).moveTo(LEFT, doc.y).lineTo(LEFT + WIDTH, doc.y).lineWidth(0.7).strokeColor(LINE).stroke();
  doc.moveDown(0.35);
  doc.x = LEFT;
}

function paragraph(doc: PDFKit.PDFDocument, text?: any, italic = false) {
  ensure(doc, 40);
  doc.x = LEFT;
  const blocks = clean(text).split(/\n\s*\n/).filter(Boolean);
  for (const block of blocks) {
    doc.font(italic ? 'Helvetica-Oblique' : 'Helvetica').fontSize(10.2).fillColor(italic ? MUTED : INK)
      .text(block, LEFT, doc.y, { width: WIDTH, lineGap: 4 }).moveDown(0.65);
    doc.x = LEFT;
  }
}

function bullets(doc: PDFKit.PDFDocument, values: any[], empty: string, limit = 6) {
  // PDF is the evidence document, not a dashboard preview: paginate every frozen row.
  const shown = values.filter(Boolean);
  if (!shown.length) return paragraph(doc, empty, true);
  for (const value of shown) {
    ensure(doc, 34);
    doc.x = LEFT;
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(`• ${short(value, 230)}`, LEFT, doc.y, { width: WIDTH, indent: 12, lineGap: 4 }).moveDown(0.45);
    doc.x = LEFT;
  }
}

type Col = { label: string; key: string; width: number; map?: (r: any) => string };

// 28 Oct developer instructions (Revision 3, §7 "Full evidence without truncation"): the table
// renderer previously capped row height at 86 and relied on PDFKit's ellipsis to silently cut
// off anything longer, with no way to recover the rest — a concise summary became the SOLE
// retained representation of a management reason, learning text, closure evidence or finding,
// which the brief explicitly prohibits. Cells that would be truncated are now shortened with a
// visible, guaranteed-fitting "[full text: appendix N]" marker, and the full text is retained
// and printed in a dedicated appendix section at the end of the document — never dropped.
let appendixEntries: { ref: number; title: string; column: string; text: string }[] = [];
export function resetReportAppendix() { appendixEntries = []; }
function addAppendixEntry(title: string, column: string, text: string): number {
  appendixEntries.push({ ref: appendixEntries.length + 1, title, column, text });
  return appendixEntries[appendixEntries.length - 1].ref;
}

function table(doc: PDFKit.PDFDocument, title: string, rows: any[], columns: Col[], empty: string, limit = 8) {
  heading(doc, title);
  // Do not hide evidence behind "additional records". PDFKit paginates the complete set.
  const shown = (rows || []);
  if (!shown.length) return paragraph(doc, empty, true);

  const header = () => {
    ensure(doc, 40, title);
    const y = doc.y;
    doc.rect(LEFT, y, WIDTH, 24).fill(PALE);
    let x = LEFT + 4;
    doc.font('Helvetica-Bold').fontSize(8.3).fillColor(NAVY);
    for (const c of columns) { doc.text(c.label, x, y + 7, { width: c.width - 7, lineGap: 1.5 }); x += c.width; }
    doc.x = LEFT; doc.y = y + 28;
  };
  header();

  const ROW_CAP = 86;
  for (const row of shown) {
    const rawValues = columns.map((c) => (c.map ? clean(c.map(row)) : clean(row[c.key])));
    const availH = ROW_CAP - 10;
    // A cell whose full text would not fit in the capped row height is shortened to a length
    // that DOES fit alongside a guaranteed-visible appendix marker; the full original text is
    // preserved verbatim in appendixEntries, never discarded.
    const values = rawValues.map((v, i) => {
      const colWidth = columns[i].width - 9;
      const naturalH = doc.font('Helvetica').fontSize(8.5).heightOfString(v, { width: colWidth, lineGap: 2 });
      if (naturalH <= availH) return v;
      const ref = addAppendixEntry(title, columns[i].label, v);
      const marker = ` [full text: appendix ${ref}]`;
      let text = v;
      // Shrink until (truncated text + marker) fits the capped height, bounded iteration count.
      for (let iter = 0; iter < 25 && doc.heightOfString(text + marker, { width: colWidth, lineGap: 2 }) > availH; iter++) {
        text = text.slice(0, Math.max(0, Math.floor(text.length * 0.85)));
      }
      return `${text}…${marker}`;
    });
    const rowHeight = Math.min(ROW_CAP, Math.max(22, ...values.map((v, i) => doc.font('Helvetica').fontSize(8.5).heightOfString(v, { width: columns[i].width - 9, lineGap: 2 }) + 11)));
    if (doc.y + rowHeight > PAGE_BOTTOM) { doc.addPage(); doc.x = LEFT; header(); }
    const y = doc.y;
    let x = LEFT + 4;
    doc.font('Helvetica').fontSize(8.5).fillColor(INK);
    values.forEach((v, i) => { doc.text(v, x, y + 6, { width: columns[i].width - 9, height: rowHeight - 10, ellipsis: true, lineGap: 2 }); x += columns[i].width; });
    doc.moveTo(LEFT, y + rowHeight).lineTo(LEFT + WIDTH, y + rowHeight).strokeColor(LINE).lineWidth(0.5).stroke();
    doc.x = LEFT; doc.y = y + rowHeight;
  }
  doc.x = LEFT; doc.moveDown(0.75);
}

// Prints every cell's full text that the row-height cap above would otherwise have silently
// dropped. Rendered once, at the end of the document, after the report body.
function renderAppendix(doc: PDFKit.PDFDocument) {
  if (!appendixEntries.length) return;
  heading(doc, 'Evidence appendix — full text');
  paragraph(doc, 'Each entry below is the complete, untruncated text for a table cell referenced as "[full text: appendix N]" in the report body.', true);
  for (const entry of appendixEntries) {
    ensure(doc, 30);
    doc.x = LEFT;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY).text(`Appendix ${entry.ref} — ${clean(entry.title)} / ${clean(entry.column)}`, LEFT, doc.y, { width: WIDTH });
    doc.x = LEFT;
    doc.font('Helvetica').fontSize(9).fillColor(INK).text(entry.text, LEFT, doc.y, { width: WIDTH, lineGap: 3 }).moveDown(0.6);
    doc.x = LEFT;
  }
}

function renderClosingSummary(doc: PDFKit.PDFDocument, row: any, data: any) {
  const e = data.evidence || {};
  const openRisks = (e.risks || []).filter((r: any) => isOpen(r.status)).length;
  const openActions = (e.actions || []).filter((a: any) => isOpen(a.status)).length;
  const openEscalations = (e.escalations || []).filter((x: any) => isOpen(x.status)).length;
  const gaps = [
    ...(e.decisions || []).filter((d: any) => !d.reason),
    ...(e.actions || []).filter((a: any) => isOpen(a.status) && (!a.owner || !a.due_date)),
  ].length;
  heading(doc, 'Report summary');
  paragraph(doc, `${position(data)} The frozen evidence records ${openRisks} open risk(s), ${openEscalations} open escalation(s), and ${openActions} open action(s). ${gaps ? `${gaps} record(s) require missing ownership, due-date or decision-rationale information to be completed.` : 'No missing ownership, due-date or decision-rationale field was identified in the records tested.'}`);
  const eff = data.totals?.effectiveness;
  if (eff) paragraph(doc, `Effectiveness reviews in this snapshot: ${eff.effective || 0} Effective, ${eff.partially_effective || 0} Partially Effective, ${eff.not_effective || 0} Not Effective, and ${eff.too_early || 0} Too Early to Assess. Too Early is an interim review and is not included as a final verdict.`);
  if (row.narrative) {
    heading(doc, 'Narrative explanation');
    paragraph(doc, row.narrative);
    if (data.narrative_label) paragraph(doc, clean(data.narrative_label), true);
    paragraph(doc, 'This is the exact narrative stored with this snapshot. It explains the evidence but does not replace the underlying records or determine severity.', true);
  }
}

// ── evidence-led helpers ───────────────────────────────────────────────────────
const isOpen = (status: any) => !/complete|completed|cancel|closed|resolved/i.test(clean(status));
// 28 Oct developer instructions (Revision 3, P1 "Evidence-supported conclusions"): isDemonstratedEffective
// and hasWeakEvidence moved to reporting/domain/effectiveness-evidence.ts (imported above) so
// scoped-report-data.service.ts's theme-evidence projection applies the same definition, not a
// looser one based on the label alone.
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

function renderWeeklyReviews(doc: PDFKit.PDFDocument, reviews: any[], limit?: number) {
  // B4 correction (21 Oct 2026): "Remove the three-reflection cap" -- every approved review in
  // scope is the authoritative record and must be shown, not an arbitrary first-3 subset.
  const shown = limit ? (reviews || []).slice(0, limit) : (reviews || []);
  if (!shown.length) return paragraph(doc, 'No manager reflection was recorded for this reporting period.', true);
  for (const review of shown) {
    heading(doc, `${clean(review.service)} - week ending ${date(review.week_ending)}`);
    const content = asText(review.content);
    if (content) paragraph(doc, content);
    const lessons = asText(review.lessons_learnt);
    if (lessons) { doc.x = LEFT; doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY).text('Learning recorded', LEFT, doc.y, { width: WIDTH }); paragraph(doc, lessons); }
    const risks = formatAnticipatedRisks(review.anticipated_risks);
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
    // B1 correction: the response column shows the decision AND the recorded management
    // instruction together (e.g. "Monitor: Attend the bank") -- the instruction is no longer
    // substituted for the concern column, which now shows the actual concern.
    ...(e.decisions || []).map((r: any) => ({ ...r, response: r.management_instruction ? `${clean(r.decision)}: ${short(r.management_instruction, 90)}` : clean(r.decision), owner_name: r.reviewer, response_status: r.status })),
    ...completedThisWeek.map((r: any) => ({ ...r, concern: r.action, response: 'Action completed', owner_name: r.owner, response_status: r.effectiveness })),
    ...openEscalations.map((r: any) => ({ ...r, concern: r.reason, response: 'Escalated', owner_name: r.escalated_to, response_status: r.status })),
  ], [
    { label: 'Concern / information', key: 'concern', width: 205 }, { label: 'Response', key: 'response', width: 90 },
    { label: 'Responsible', key: 'owner_name', width: 90 }, { label: 'Evidence / position', key: 'response_status', width: 110 },
  ], 'No management decision, completed response or escalation was recorded this week.', 6);

  // B1 correction: "What did we learn?" must come from the RM's actual learning/reflection, never
  // manufactured from completion text or an effectiveness rating -- a rating is a judgement about
  // an action, not a recorded lesson, and conflating the two let a completed-but-unreflected-on
  // action read as "learning" when none was actually written down.
  // 28 Oct developer instructions (Revision 3, P1 "Complete house/week coverage and approval"):
  // this used only latestReview (e.weekly_reviews[0]) -- a multi-house scope silently dropped
  // every other house's recorded learning. Show every authorised review in scope, source-labelled.
  heading(doc, '3. What did we learn?');
  const allReviews = e.weekly_reviews || [];
  bullets(doc, allReviews
      .map((r: any) => ({ service: clean(r.service), text: asText(r.lessons_learnt) }))
      .filter((r: any) => r.text)
      .map((r: any) => allReviews.length > 1 ? `${r.service}: ${r.text}` : r.text),
    'No learning was recorded for this period. A completed action or an effectiveness rating is not itself a recorded lesson.', 4);

  // B1 correction: next week's priorities must include due monitoring reviews, open escalations
  // and actions awaiting an effectiveness review -- not only open actions.
  const dueMonitoring = e.due_monitoring || [];
  const pendingEffectiveness = (e.actions || []).filter((a: any) => !isOpen(a.status) && a.effectiveness_review_state === 'NOT_REVIEWED');
  table(doc, '4. What should we expect next week?', [
    ...openActions.map((r: any) => ({ ...r, action: clean(r.action), due_date: r.due_date, evidence_expected: r.completion_evidence || 'Outcome evidence required' })),
    ...dueMonitoring.map((r: any) => ({ action: `Monitoring review due: ${clean(r.concern) || 'see signal'}`, owner: r.owner, due_date: r.due_at, evidence_expected: 'Record what happened during monitoring and the next decision' })),
    ...openEscalations.map((r: any) => ({ action: `Escalation outstanding: ${clean(r.reason)}`, owner: r.escalated_to, due_date: r.due_by, evidence_expected: 'Management response and closure evidence' })),
    ...pendingEffectiveness.map((r: any) => ({ action: `Effectiveness review due: ${clean(r.action)}`, owner: r.owner, due_date: r.next_review_date, evidence_expected: 'Outcome evidence against the intended outcome' })),
  ], [
    { label: 'Required action', key: 'action', width: 205 }, { label: 'Owner', key: 'owner', width: 90 },
    { label: 'Due', key: 'due_date', width: 70, map: (r) => date(r.due_date) },
    { label: 'Evidence expected', key: 'evidence_expected', width: 130 },
  ], 'No open action, due monitoring review, open escalation or pending effectiveness review was identified.', 5);
  const anticipatedByService = allReviews
    .map((r: any) => ({ service: clean(r.service), text: formatAnticipatedRisks(r.anticipated_risks) }))
    .filter((r: any) => r.text);
  if (anticipatedByService.length) {
    doc.x = LEFT; doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY).text('Risks to watch', LEFT, doc.y, { width: WIDTH });
    paragraph(doc, anticipatedByService.map((r: any) => allReviews.length > 1 ? `${r.service}: ${r.text}` : r.text).join('\n'));
  }

  // 28 Oct developer instructions: same coverage gap — every authorised review's own conclusion,
  // source-labelled, not just the first house's.
  heading(doc, 'Manager conclusion');
  const conclusions = allReviews
    .map((r: any) => ({ service: clean(r.service), text: asText(r.content) }))
    .filter((r: any) => r.text);
  if (conclusions.length) {
    paragraph(doc, conclusions.map((r: any) => allReviews.length > 1 ? `${r.service}: ${r.text}` : r.text).join('\n'));
  } else {
    paragraph(doc, `${position(data)} The coming week should focus on completing and verifying the open actions shown above.`);
  }

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
  // B2 correction: status now also triggers on ineffective controls, overdue monitoring and
  // unpromoted urgent concerns -- a "Why" column makes the reason visible (previously a service
  // could show ATTENTION with 0 open risks and 0 overdue, with no way to tell why from this table).
  table(doc, '2. Services requiring attention', (data.per_site || []).filter((s: any) => s.status !== 'STABLE'), [
    { label: 'Service', key: 'site_name', width: 110 }, { label: 'Position', key: 'status', width: 60 },
    { label: 'Assurance', key: 'assurance_label', width: 90 },
    { label: 'Evidence cov.', key: 'evidence_coverage', width: 60, map: (r) => `${r.evidence_coverage ?? r.evidence_confidence ?? '—'}%` },
    { label: 'Control assur.', key: 'control_assurance', width: 60, map: (r) => r.control_assurance == null ? 'n/a' : `${r.control_assurance}%` },
    { label: 'Why', key: 'why', width: 100, map: (r) => [
        r.critical_risks ? `${r.critical_risks} critical risk` : null,
        r.open_risks ? `${r.open_risks} open risk` : null,
        r.overdue_actions ? `${r.overdue_actions} overdue action` : null,
        r.controls_ineffective ? `${r.controls_ineffective} ineffective control` : null,
        r.overdue_monitoring ? `${r.overdue_monitoring} overdue monitoring` : null,
        r.urgent_unpromoted ? `${r.urgent_unpromoted} unpromoted concern` : null,
      ].filter(Boolean).join(', ') || 'See basis' },
  ], 'No service was rated ATTENTION or CRITICAL in this period.', 12);
  heading(doc, '3. Recorded response');
  bullets(doc, (e.decisions || []).map((d: any) => `${clean(d.service)}: ${clean(d.decision)} - ${clean(d.reason)}`), 'No management response was recorded in this period.', 5);
  heading(doc, '4. Evidenced improvement');
  bullets(doc, (e.actions || []).filter((a: any) => isDemonstratedEffective(a)).map((a: any) => `${clean(a.action)}: Demonstrated Effective - ${clean(a.effectiveness_evidence)}`), 'Improvement is not yet demonstrated by recorded effectiveness evidence.', 5);
  heading(doc, '5. Unresolved work');
  bullets(doc, [...(e.actions || []).filter((a: any) => isOpen(a.status)).map((a: any) => `${clean(a.action)} - due ${date(a.due_date)}`), ...(e.escalations || []).filter((x: any) => isOpen(x.status)).map((x: any) => `Escalation: ${clean(x.reason)} - due ${date(x.due_by)}`)], 'No unresolved action or escalation was recorded.', 6);
  heading(doc, '6. Management priority'); paragraph(doc, position(data));
}

function renderRisks(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  const risks = e.risks || [];
  heading(doc, '1. Key risks and management response');
  paragraph(doc, 'Each risk below is drawn from the frozen snapshot with its recorded severity, direction, status, response and review date. A missing field is shown as such so it can be corrected.');
  // B3 correction (21 Oct 2026): "Populate sections 2-3 with risks active during the period,
  // severity/basis, direction/evidence, response, linked work and review date" -- the table only
  // showed severity/direction/status/review date before; basis, evidence and linked work were
  // never shown anywhere.
  table(doc, '2. Risks on record', risks, [
    { label: 'Service', key: 'service', width: 70 }, { label: 'Risk', key: 'risk', width: 130 },
    { label: 'Severity / direction', key: 'severity', width: 90, map: (r) => `${clean(r.severity)} / ${clean(r.direction)}` },
    { label: 'Evidence / basis', key: 'trajectory_basis', width: 100, map: (r) => r.trajectory_basis || r.description || 'Not recorded' },
    { label: 'Linked work', key: 'linked_actions', width: 100, map: (r) => [r.linked_actions, r.linked_escalation_count ? `${r.linked_escalation_count} escalation(s)` : null].filter(Boolean).join('; ') || 'None recorded' },
    { label: 'Status', key: 'status', width: 50 },
    { label: 'Review due', key: 'review_due_date', width: 65, map: (r) => date(r.review_due_date) },
  ], 'No risk was recorded in scope for this period.', 12);
  // B3 correction: "For in-period closures include date, decision-maker, reason and outcome
  // evidence" -- previously only the reason text, with no date, no decision-maker and no outcome
  // evidence distinct from the reason.
  table(doc, '3. Closed risks - decision and outcome evidence', risks.filter((r: any) => /closed|resolved/i.test(clean(r.status))), [
    { label: 'Risk', key: 'risk', width: 130 }, { label: 'Service', key: 'service', width: 70 },
    { label: 'Closed', key: 'closed_at', width: 60, map: (r) => date(r.closed_at || r.resolved_at) },
    { label: 'Decision-maker', key: 'closed_by_name', width: 80, map: (r) => r.closed_by_name || 'Not recorded' },
    { label: 'Reason', key: 'resolution_reason', width: 100, map: (r) => r.resolution_reason || 'Not recorded' },
    { label: 'Outcome evidence', key: 'resolution_outcome', width: 115, map: (r) => r.resolution_outcome || 'Not recorded' },
  ], 'No risk was closed in this period.', 6);
  // B3 correction: "Add a separate section for significant unpromoted/monitored concerns" --
  // confirmed/escalated patterns with no risk promoted yet were otherwise invisible from this report.
  const unpromoted = (e.patterns || []).filter((p: any) => !p.linked_risk_id && /escalated|confirmed/i.test(clean(p.status)));
  heading(doc, '4. Significant unpromoted or monitored concerns');
  paragraph(doc, 'Patterns with confirmed or escalated evidence that have not been promoted to a formal risk. These remain under active monitoring, not formal risk management.', true);
  bullets(doc, unpromoted.map((p: any) => `${clean(p.pattern)} (${clean(p.affected_scope)}): ${p.signal_count} signal(s), ${clean(p.status)}${p.next_review_date ? `, next review ${date(p.next_review_date)}` : ''}.`),
    'No significant pattern is currently unpromoted.', 6);
}

// B5 correction (21 Oct 2026): "Classify raised, carried-forward, closed and outstanding items
// explicitly" -- previously only a free-text lifecycle status string, no classification against
// the period boundary.
function escalationStage(r: any, data: any): string {
  const st = String(r.status || '').toLowerCase();
  if (st === 'closed') return 'Closed';
  const raisedInPeriod = inPeriod(r.date, data);
  if (raisedInPeriod) return 'Raised this period';
  const dueBy = r.due_by ? new Date(r.due_by).getTime() : null;
  if (dueBy && dueBy < Date.now()) return 'Outstanding (overdue)';
  return 'Carried forward';
}

function renderEscalations(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  const escalations = e.escalations || [];
  heading(doc, '1. Escalations and management response');
  paragraph(doc, `This report covers matters escalated for management attention in ${clean(data.scope_label)} during the selected period, with the recorded response to each.`);
  // B5 correction: "Show reason/priority, recipient, management response, controls/actions,
  // deadline, stage" -- priority, controls/actions and an explicit stage classification were not
  // shown at all; deadline was combined into one ambiguous "position / due" string.
  table(doc, '2. Escalations', escalations, [
    { label: 'Raised', key: 'date', width: 55, map: (r) => date(r.date) }, { label: 'Service', key: 'service', width: 65 },
    { label: 'Reason', key: 'reason', width: 110 }, { label: 'Priority', key: 'priority', width: 45, map: (r) => r.priority || '—' },
    { label: 'Recipient', key: 'escalated_to', width: 65 },
    { label: 'Stage', key: 'stage', width: 70, map: (r) => escalationStage(r, data) },
    { label: 'Deadline', key: 'due_by', width: 55, map: (r) => date(r.due_by) },
  ], 'No escalation was recorded in this period.', 10);
  // B5 correction: "outcome, closure evidence/date and continuing work" as distinct fields --
  // closure evidence/date was conflated with the general "outcome" text, and ongoing (non-closed)
  // continuing work was not shown at all alongside the closed ones.
  heading(doc, '3. Response, controls and outcome');
  bullets(doc, escalations.map((x: any) => {
    const closed = /closed/i.test(clean(x.status));
    const parts = [
      `${date(x.date)} ${clean(x.service)} - escalated to ${clean(x.escalated_to)}`,
      x.linked_actions ? `Controls/actions: ${x.linked_actions}` : 'Controls/actions: none recorded',
      closed
        ? `Closed ${date(x.closed_at || x.resolved_at)}. Closure evidence: ${clean(x.outcome)}`
        : `Continuing work: ${clean(x.status)}, due ${date(x.due_by)}. Outcome so far: ${x.outcome ? clean(x.outcome) : 'not yet recorded'}`,
    ];
    return parts.join(' — ');
  }), 'No escalation was recorded in this period.', 6);
  paragraph(doc, 'Closing an escalation does not automatically close the underlying concern or risk.', true);
}

// B4 correction (21 Oct 2026): "The RM-completed weekly review is authoritative. Reports must
// display/download that approved version; remove the independent summary narrative." This report
// previously opened with a system-generated "What stood out"/"conclusion" narrative (position())
// that competed with, and could drift from, what the RM actually wrote and signed. The approved
// weekly reviews are now the primary, uncapped content; the combined summary is the optional
// service-coverage view the correction also asks for, not a replacement narrative.
function renderManager(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  const coverage: any[] = e.service_coverage || [];
  const statusLabel = (s: any) => {
    const st = String(s?.status || '').toLowerCase();
    if (st === 'published' || st === 'locked') return 'Approved';
    if (st === 'pending_validation') return 'Awaiting validation';
    if (!s?.status) return 'Not started';
    return 'In progress';
  };
  const missing = coverage.filter((s) => !s.status);

  heading(doc, '1. Approved weekly reviews');
  paragraph(doc, 'Every RM-approved weekly review in scope for this period, shown in full as the authoritative record -- not a system-generated summary of it.', true);
  renderWeeklyReviews(doc, e.weekly_reviews || []);

  table(doc, '2. Service coverage this period', coverage, [
    { label: 'Service', key: 'service', width: 160 },
    { label: 'Status', key: 'status', width: 110, map: statusLabel },
    { label: 'Reviewer', key: 'reviewer', width: 110, map: (r) => r.reviewer || '—' },
    { label: 'Approved', key: 'published_at', width: 115, map: (r) => r.published_at ? date(r.published_at) : '—' },
  ], 'No service is in scope for this report.', 20);
  if (missing.length) {
    paragraph(doc, `Missing or unpublished: ${missing.map((s) => clean(s.service)).join(', ')}.`, true);
  }

  heading(doc, '3. Decisions recorded');
  bullets(doc, (e.decisions || []).map((d: any) => `${clean(d.service)} · ${short(d.concern, 110)} — ${clean(d.decision)}. Rationale: ${clean(d.reason)}${d.reviewer ? ` · ${clean(d.reviewer)}` : ''}${d.due_at ? ` · review/due ${date(d.due_at)}` : ''}`), 'No management decision was recorded.', 5);

  heading(doc, '4. Open and unresolved at cut-off');
  const continuedAttention = [
    ...(e.risks || []).filter((r: any) => isOpen(r.status)).map((r: any) => `Risk: ${clean(r.risk)} (${clean(r.service)}) · ${clean(r.severity)} · review ${date(r.review_due_date)}`),
    ...(e.escalations || []).filter((x: any) => isOpen(x.status)).map((x: any) => `Escalation: ${short(x.reason, 120)} · ${clean(x.status)} · due ${date(x.due_by)}`),
    ...(e.actions || []).filter((a: any) => isOpen(a.status)).map((a: any) => `Action: ${clean(a.action)} · ${clean(a.owner) === MISSING ? 'owner not recorded' : clean(a.owner)} · due ${date(a.due_date)}`),
    ...(e.actions || []).filter((a: any) => clean(a.effectiveness) === 'Not Effective').map((a: any) => `Control not effective: ${clean(a.action)} · evidence: ${clean(a.effectiveness_evidence)}`),
    ...(e.actions || []).filter((a: any) => clean(a.effectiveness) === 'Partially Effective').map((a: any) => `Control only partially effective: ${clean(a.action)} · evidence: ${clean(a.effectiveness_evidence)}`),
    ...(e.actions || []).filter((a: any) => clean(a.effectiveness) === 'Too Early To Assess').map((a: any) => `Effectiveness review pending: ${clean(a.action)} · too early to assess`),
  ];
  bullets(doc, continuedAttention, 'No open risk, escalation, action or unresolved effectiveness concern was identified in the frozen snapshot.', 4);
}

// B6 correction (21 Oct 2026): "Distinguish suspected recurrence, confirmed cross-service patterns
// and no recorded pattern" -- previously one undifferentiated table lumped Emerging (suspected)
// together with Confirmed/Escalated (confirmed), with no distinction visible to the reader.
function renderPatterns(doc: PDFKit.PDFDocument, data: any) {
  const e = data.evidence || {};
  const crossService = (e.patterns || []).filter((p: any) => p.scope === 'cross_service' && !/dismissed|closed/i.test(clean(p.status)));
  const confirmed = crossService.filter((p: any) => /confirmed|escalated/i.test(clean(p.status)));
  const suspected = crossService.filter((p: any) => /emerging/i.test(clean(p.status)));

  const columns = [
    { label: 'Pattern (shared feature)', key: 'pattern', width: 110 }, { label: 'Domain', key: 'domain', width: 65 },
    { label: 'Services', key: 'affected_scope', width: 90 },
    { label: 'Dated examples', key: 'dated_examples', width: 130, map: (r: any) => r.dated_examples || 'Not recorded' },
    { label: 'Reviewer decision', key: 'review_outcome', width: 85, map: (r: any) => r.review_outcome || 'Not yet decided' },
  ];
  table(doc, '1. Confirmed cross-service patterns', confirmed, columns, 'No pattern has been confirmed across services in this period.', 8);
  table(doc, '2. Suspected recurrence (not yet confirmed)', suspected, columns, 'No suspected recurrence is currently under review.', 8);
  if (crossService.length === 0) paragraph(doc, 'No recorded pattern spans more than one service in this period.', true);

  heading(doc, '3. Why the connection matters');
  paragraph(doc, 'A repeated category alone is not enough. Management must confirm the shared feature and record why organisation-wide oversight is justified, rather than inferring a shared problem from category counts.');
  // Honest gap, not a fabricated field: the system does not currently capture a structured
  // "alternative explanations considered" record against a pattern (only a constrained
  // review_outcome decision). Say so rather than leaving it silently absent.
  paragraph(doc, 'Alternative explanations considered are not currently captured as a structured field against a pattern — only the reviewer\'s decision (above) is recorded. This is a gap in what the system captures, not a confirmation that no alternative was considered.', true);

  const patternIds = new Set(crossService.map((p: any) => p.id));
  table(doc, '4. Organisation-wide response and outcome', (e.actions || []).filter((a: any) => a.source_cluster_id && patternIds.has(a.source_cluster_id)), [
    { label: 'Required response', key: 'action', width: 170 }, { label: 'Owner', key: 'owner', width: 80 },
    { label: 'Status / due', key: 'status', width: 110, map: (r) => `${clean(r.status)} / ${date(r.due_date)}` },
    { label: 'Outcome', key: 'effectiveness', width: 110, map: (r) => r.effectiveness || 'Not yet reviewed' },
  ], 'No organisation-wide response was recorded. This does not by itself mean no response is required.', 6);
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
    { label: 'Date', key: 'date', width: 55, map: (r) => date(r.date) }, { label: 'Concern', key: 'concern', width: 155 },
    { label: 'Decision', key: 'decision', width: 75 }, { label: 'Rationale', key: 'reason', width: 145 },
    { label: 'Reviewer', key: 'reviewer', width: 65 },
  ], 'No decision was recorded in this period.', 8);
  table(doc, '5. Dismissed concerns and reasons', e.dismissed_concerns || [], [
    { label: 'Date', key: 'date', width: 72, map: (r) => `${date(r.date)}${r.date_reliable === false ? ' (legacy)' : ''}` },
    { label: 'Service', key: 'service', width: 85 }, { label: 'Domain', key: 'domain', width: 110 },
    { label: 'Reason', key: 'reason', width: 150 },
    { label: 'By / process', key: 'actor', width: 73, map: (r) => `${clean(r.actor) || 'System'} · ${clean(r.event_type)}` },
  ], 'No concern was dismissed in this period.', 8);
  table(doc, '6. Effectiveness reviews in this period', e.effectiveness_reviews || [], [
    { label: 'Reviewed', key: 'date', width: 72, map: (r) => date(r.date) },
    { label: 'Action', key: 'action', width: 150 },
    { label: 'Outcome', key: 'outcome', width: 95, map: (r) => `${clean(r.outcome)}${r.is_early_review ? ' · early' : ''}` },
    { label: 'Evidence / basis', key: 'evidence', width: 120, map: (r) => clean(r.evidence) || (r.evidence_still_needed ? `Still needed: ${clean(r.evidence_still_needed)}` : MISSING) },
    { label: 'Reviewer', key: 'reviewer', width: 63 },
  ], 'No effectiveness review was recorded in this period.', 8);
  heading(doc, '7. Evidence gaps and limitations');
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
  const locked = data.reconstruction_record;
  // B8 correction: a genuinely unrecorded author/reference is now shown as "Not recorded", never
  // the vague "Recorded source" that implied something was sourced when nothing was.
  const storedTimeline = Array.isArray(locked?.timeline_events) ? locked.timeline_events.map((r: any) => ({
    date: r.date || r.created_at, type: r.type || r.event_type || 'Event',
    information: r.information || r.description || r.event || r.title,
    response: r.response || r.outcome || r.action || r.status,
    person: r.person || r.actor || r.source || 'Not recorded',
  })) : [];
  const timeline = (storedTimeline.length ? storedTimeline : [
    // Signal entries now carry the actual reporter and the precise recorded time, not a filler string.
    ...(e.signals || []).map((r: any) => ({ date: r.date, type: 'Signal', information: r.concern, response: r.review_status, person: r.reported_by ? `${r.reported_by} · ${dateTime(r.recorded_at || r.created_at)}` : 'Not recorded' })),
    ...(e.decisions || []).map((r: any) => ({ date: r.date, type: 'Decision', information: r.concern, response: `${clean(r.decision)}: ${clean(r.reason)}`, person: r.reviewer || 'Not recorded' })),
    ...(e.escalations || []).map((r: any) => ({ date: r.date, type: 'Escalation', information: r.reason, response: r.status, person: r.escalated_to || 'Not recorded' })),
    ...(e.actions || []).map((r: any) => ({ date: r.created_at, type: 'Action', information: r.action, response: `${clean(r.status)}; due ${date(r.due_date)}; ${clean(r.effectiveness)}`, person: r.owner || 'Not recorded' })),
    ...(e.dismissed_concerns || []).map((r: any) => ({ date: r.date, type: 'Concern dismissed', information: `${clean(r.domain)}${r.person ? ` · ${clean(r.person)}` : ''}`, response: `${clean(r.event_type)}: ${clean(r.reason)}`, person: r.actor || 'System' })),
    ...(e.effectiveness_reviews || []).map((r: any) => ({ date: r.date, type: r.is_early_review ? 'Effectiveness (early)' : 'Effectiveness review', information: clean(r.action), response: `${clean(r.outcome)}${r.early_review_reason ? ` — reviewed early: ${clean(r.early_review_reason)}` : ''}`, person: r.reviewer || 'Not recorded' })),
  ]).filter((r: any) => inPeriod(r.date, data))
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  heading(doc, '1. Scope and factual account');
  // 28 Oct developer instructions (Revision 3, P1 "Reconstruction routes"): without a completed,
  // Locked governance_reconstructions record connected, this is a system-generated evidence
  // timeline assembled from canonical facts — not the author's own reconstruction findings
  // (narrative, contributing factors, lessons learned). Say which one this is.
  paragraph(doc, locked
    ? `This reconstruction covers ${clean(data.scope_label)} and reproduces the authorised, locked reconstruction record alongside records retained in the frozen snapshot, limited to events within the selected period.`
    : `This is a generated evidence timeline covering ${clean(data.scope_label)}, assembled from records retained in the frozen snapshot and limited to events within the selected period. No completed, authorised reconstruction record was connected — this timeline does not contain an author's reconstruction findings (narrative, contributing factors or lessons learned).`);
  table(doc, '2. Governance timeline', timeline, [
    { label: 'Date / type', key: 'date', width: 90, map: (r) => `${date(r.date)} / ${r.type}` },
    { label: 'Information available', key: 'information', width: 185 },
    { label: 'Response recorded', key: 'response', width: 150 }, { label: 'Source (author · time)', key: 'person', width: 70 },
  ], 'No in-period governance event was recorded for this reconstruction.', 20);
  // B8 correction: "Resolve Jethro's Create Action decisions versus absent action rows: distinguish
  // missing, omitted or outside-window records and include carried-forward follow-through."
  // Previously only actions CREATED inside the exact period appeared here -- a Create Action
  // decision shown in the timeline above could have no corresponding row below simply because the
  // resulting action was created slightly outside the window, or because the action is older and
  // still being carried forward through this period. Show both: created in-period, OR still open
  // (carried forward) through the period, OR completed in-period.
  const relevantActions = (e.actions || []).filter((a: any) =>
    inPeriod(a.created_at, data) || isOpen(a.status) || inPeriod(a.completed_at, data));
  table(doc, '3. Actions and follow-through', relevantActions, [
    { label: 'Action', key: 'action', width: 170 },
    { label: 'Completed / status', key: 'status', width: 95, map: (r) => {
        const carried = !inPeriod(r.created_at, data);
        return `${clean(r.status)} (created ${date(r.created_at)}${carried ? ' — carried forward' : ''})`;
      } },
    { label: 'Evidence', key: 'completion_evidence', width: 105, map: (r) => `${clean(r.completion_evidence)}${r.effectiveness_evidence ? ` / Effectiveness: ${clean(r.effectiveness_evidence)}` : ''}` }, { label: 'Effectiveness', key: 'effectiveness', width: 80 },
  ], 'No action is recorded as created in this period, carried forward through it, or completed within it. A Create Action decision in the timeline above with no row here is a missing or outside-window record, not evidence that no action was ever created.', 10);
  heading(doc, '4. Learning and limitations');
  // Learning tied to the exact effectiveness review it came from — the source action, the review
  // outcome, the lesson, and any separate improvement action (titles only; no identifiers).
  const effLearning = (data.effectiveness_learning || [])
    .filter((l: any) => l.state !== 'NOT_YET_ASSESSED')
    .map((l: any) => l.state === 'NONE_IDENTIFIED'
      ? `${clean(l.source_action_title) || 'Reviewed action'}${l.source_review_outcome ? ` (rated ${clean(l.source_review_outcome)})` : ''}: no learning identified — ${clean(l.no_learning_reason)}`
      : `${clean(l.source_action_title) || 'Reviewed action'}${l.source_review_outcome ? ` (rated ${clean(l.source_review_outcome)})` : ''}: ${clean(l.what_learnt)}${l.improvement_action_title ? ` — improvement action: ${clean(l.improvement_action_title)}` : ''}`);
  bullets(doc, [locked?.lessons_learned, ...(e.weekly_reviews || []).map((r: any) => r.lessons_learnt), ...effLearning].filter(Boolean), 'No learning or missed opportunity was recorded. The report must not invent causation, blame or information that was unavailable at the time.', 4);
  if (locked?.contributing_factors) { heading(doc, '5. Contributing factors recorded'); paragraph(doc, locked.contributing_factors); }
  if (locked?.control_failure) { heading(doc, '6. Control issue recorded'); paragraph(doc, locked.control_failure); }
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
  const effectiveActions = (e.actions || []).filter((a: any) => isDemonstratedEffective(a));
  const weakEvidence = effectiveActions.filter((a: any) => hasWeakEvidence(a));
  const solidEffective = effectiveActions.filter((a: any) => !hasWeakEvidence(a));
  heading(doc, '3. Demonstrated effective controls');
  bullets(doc, solidEffective.map((a: any) => `${clean(a.action)} - evidence: ${clean(a.effectiveness_evidence)}`), 'No control is yet supported by a final Effective judgement and recorded evidence.', 5);
  if (weakEvidence.length) {
    heading(doc, '3a. Flagged — evidence may not support the rating');
    paragraph(doc, 'Rated Effective, but the recorded evidence reads as case closure, a future intention, or a completed review rather than a demonstrated outcome. Not automatically wrong, but requires management confirmation before being relied on as proof of effectiveness.', true);
    bullets(doc, weakEvidence.map((a: any) => `${clean(a.action)} - evidence: ${clean(a.effectiveness_evidence)}`), '', 5);
  }
  heading(doc, '4. Improvement evident but control incomplete');
  bullets(doc, (e.actions || []).filter((a: any) => clean(a.effectiveness) === 'Partially Effective').map((a: any) => `${clean(a.action)} — evidence: ${clean(a.effectiveness_evidence || a.completion_evidence)}`), 'No partially effective control was recorded.', 5);
  // B9 correction: "Separate failed, partial, interim and unreviewed controls" -- these three were
  // previously merged into one undifferentiated section.
  heading(doc, '5. Failed controls');
  bullets(doc, (e.actions || []).filter((a: any) => clean(a.effectiveness) === 'Not Effective').map((a: any) => `${clean(a.action)}${a.effectiveness_evidence ? ` — evidence: ${clean(a.effectiveness_evidence)}` : ''}`), 'No control was rated Not Effective.', 5);
  heading(doc, '5a. Interim — too early to assess');
  bullets(doc, (e.actions || []).filter((a: any) => clean(a.effectiveness) === 'Too Early To Assess').map((a: any) => `${clean(a.action)}${a.effectiveness_evidence ? ` — evidence: ${clean(a.effectiveness_evidence)}` : ''}`), 'No control is currently too early to assess.', 5);
  heading(doc, '5b. Unreviewed controls');
  bullets(doc, (e.actions || []).filter((a: any) => clean(a.effectiveness) === 'Not yet reviewed').map((a: any) => clean(a.action)), 'No completed control is awaiting its effectiveness review.', 5);
  heading(doc, '6. Assurance limitations');
  bullets(doc, [
    ...(data.material_exceptions || []).map((x: any) => {
      const label = x.status_label || (x.status === 'CRITICAL' ? 'Critical Governance Exception' : x.status);
      const support = Array.isArray(x.supporting_risks) && x.supporting_risks.length
        ? ` — supporting risk: ${x.supporting_risks.map((r: any) => clean(r.risk)).join('; ')}`
        : '';
      return `${clean(x.site_name)} - ${clean(label)} (governance confidence ${x.governance_confidence ?? '—'}%)${support}`;
    }),
    ...(Array.isArray(data.limitations) ? data.limitations : []),
  ], 'No material exception was recorded for this period.', 6);
  heading(doc, '7. Material theme evidence (data → decision → action → outcome → assurance)');
  bullets(doc, (e.theme_evidence || []).map((t: any) => {
    const risks = Array.isArray(t.risks) && t.risks.length ? t.risks.map((r: any) => `${clean(r.risk)} (${clean(r.direction)}, ${clean(r.status)})`).join('; ') : 'no registered risk linked';
    const ctl = t.controls || {};
    const gaps = Array.isArray(t.evidence_gaps) && t.evidence_gaps.length ? ` Evidence gaps: ${t.evidence_gaps.map(clean).join(' ')}` : '';
    return `${clean(t.theme)} — ${t.signals} signal(s) (${clean(t.period)}), ${clean(t.scope)}; ${t.signals_reviewed} reviewed. Risks: ${risks}. Controls: ${ctl.completed || 0} completed (${ctl.effective || 0} effective, ${ctl.not_effective || 0} not effective, ${ctl.unreviewed || 0} unreviewed). Open: ${t.open_items?.actions || 0} action(s), ${t.open_items?.escalations || 0} escalation(s). Outcome: ${clean(t.outcome)}.${gaps}`;
  }), 'No material theme was identified in this period.', 6);
  heading(doc, '8. Required response');
  bullets(doc, [...(e.actions || []).filter((a: any) => isOpen(a.status)).map((a: any) => `${clean(a.action)} - due ${date(a.due_date)}`), ...(e.escalations || []).filter((x: any) => isOpen(x.status)).map((x: any) => `Escalation: ${clean(x.reason)} - due ${date(x.due_by)}`)], 'No outstanding response was recorded.', 5);
  heading(doc, '9. Conclusion');
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

  // Each render starts with a clean appendix — module-level state must never leak between
  // concurrent or sequential PDF generations.
  resetReportAppendix();

  // Shared branded masthead and immutable report provenance.
  reportMasthead(doc, row, data, title);

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

  // The screen and PDF use the same stored snapshot and the exact same stored narrative.
  renderClosingSummary(doc, row, data);

  // Full-text appendix for any table cell the row-height cap would otherwise have truncated.
  renderAppendix(doc);

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
    doc.font('Helvetica').fontSize(7.8).fillColor(SOFT)
      .text(`Ordin Core Governance & Oversight   |   Page ${i - range.start + 1} of ${range.count}`, LEFT, doc.page.height - 30, { width: WIDTH, align: 'right', lineBreak: false });
    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
  return finished;
}
