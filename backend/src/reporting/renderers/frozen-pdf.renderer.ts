import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { findReport } from '../config/report-catalog';

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

  for (const row of shown) {
    const values = columns.map((c) => (c.map ? clean(c.map(row)) : clean(row[c.key])));
    const rowHeight = Math.min(86, Math.max(22, ...values.map((v, i) => doc.font('Helvetica').fontSize(8.5).heightOfString(v, { width: columns[i].width - 9, lineGap: 2 }) + 11)));
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
    paragraph(doc, 'This is the exact narrative stored with this snapshot. It explains the evidence but does not replace the underlying records or determine severity.', true);
  }
}

// ── evidence-led helpers ───────────────────────────────────────────────────────
const isOpen = (status: any) => !/complete|completed|cancel|closed|resolved/i.test(clean(status));
const isDemonstratedEffective = (a: any) => clean(a?.effectiveness) === 'Effective'
  && clean(a?.effectiveness_review_state) === 'FINAL'
  && !!a?.effectiveness_reviewed_at
  && !!String(a?.effectiveness_evidence || '').trim();
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
    { label: 'Service', key: 'site_name', width: 140 }, { label: 'Position', key: 'status', width: 80 },
    { label: 'Evidence cov.', key: 'evidence_coverage', width: 75, map: (r) => `${r.evidence_coverage ?? r.evidence_confidence ?? '—'}%` },
    { label: 'Control assur.', key: 'control_assurance', width: 80, map: (r) => r.control_assurance == null ? 'n/a' : `${r.control_assurance}%` },
    { label: 'Open risks', key: 'open_risks', width: 70, map: (r) => String(r.open_risks ?? 0) },
    { label: 'Overdue', key: 'overdue_actions', width: 70, map: (r) => String(r.overdue_actions ?? 0) },
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
  bullets(doc, (e.decisions || []).map((d: any) => `${clean(d.service)} · ${short(d.concern, 110)} — ${clean(d.decision)}. Rationale: ${clean(d.reason)}${d.reviewer ? ` · ${clean(d.reviewer)}` : ''}${d.due_at ? ` · review/due ${date(d.due_at)}` : ''}`), 'No management decision was recorded.', 5);
  heading(doc, '4. What requires continued attention');
  const continuedAttention = [
    ...(e.risks || []).filter((r: any) => isOpen(r.status)).map((r: any) => `Risk: ${clean(r.risk)} (${clean(r.service)}) · ${clean(r.severity)} · review ${date(r.review_due_date)}`),
    ...(e.escalations || []).filter((x: any) => isOpen(x.status)).map((x: any) => `Escalation: ${short(x.reason, 120)} · ${clean(x.status)} · due ${date(x.due_by)}`),
    ...(e.actions || []).filter((a: any) => isOpen(a.status)).map((a: any) => `Action: ${clean(a.action)} · ${clean(a.owner) === MISSING ? 'owner not recorded' : clean(a.owner)} · due ${date(a.due_date)}`),
    ...(e.actions || []).filter((a: any) => clean(a.effectiveness) === 'Not Effective').map((a: any) => `Control not effective: ${clean(a.action)} · evidence: ${clean(a.effectiveness_evidence)}`),
    ...(e.actions || []).filter((a: any) => clean(a.effectiveness) === 'Partially Effective').map((a: any) => `Control only partially effective: ${clean(a.action)} · evidence: ${clean(a.effectiveness_evidence)}`),
    ...(e.actions || []).filter((a: any) => clean(a.effectiveness) === 'Too Early To Assess').map((a: any) => `Effectiveness review pending: ${clean(a.action)} · too early to assess`),
  ];
  bullets(doc, continuedAttention, 'No open risk, escalation, action or unresolved effectiveness concern was identified in the frozen snapshot.', 4);
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
  const patternIds = new Set((e.patterns || []).filter((p: any) => p.scope === 'cross_service' && !/dismissed|closed/i.test(clean(p.status))).map((p: any) => p.id));
  table(doc, '3. Organisation-wide response', (e.actions || []).filter((a: any) => a.source_cluster_id && patternIds.has(a.source_cluster_id)), [
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
    { label: 'Date', key: 'date', width: 55, map: (r) => date(r.date) }, { label: 'Concern', key: 'concern', width: 155 },
    { label: 'Decision', key: 'decision', width: 75 }, { label: 'Rationale', key: 'reason', width: 145 },
    { label: 'Reviewer', key: 'reviewer', width: 65 },
  ], 'No decision was recorded in this period.', 8);
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
  const locked = data.reconstruction_record;
  const storedTimeline = Array.isArray(locked?.timeline_events) ? locked.timeline_events.map((r: any) => ({
    date: r.date || r.created_at, type: r.type || r.event_type || 'Event',
    information: r.information || r.description || r.event || r.title,
    response: r.response || r.outcome || r.action || r.status,
    person: r.person || r.actor || r.source || 'Recorded source',
  })) : [];
  const timeline = (storedTimeline.length ? storedTimeline : [
    ...(e.signals || []).map((r: any) => ({ date: r.date, type: 'Signal', information: r.concern, response: r.review_status, person: 'Recorded source' })),
    ...(e.decisions || []).map((r: any) => ({ date: r.date, type: 'Decision', information: r.concern, response: `${clean(r.decision)}: ${clean(r.reason)}`, person: r.reviewer })),
    ...(e.escalations || []).map((r: any) => ({ date: r.date, type: 'Escalation', information: r.reason, response: r.status, person: r.escalated_to })),
    ...(e.actions || []).map((r: any) => ({ date: r.created_at, type: 'Action', information: r.action, response: `${clean(r.status)}; due ${date(r.due_date)}; ${clean(r.effectiveness)}`, person: r.owner })),
  ]).filter((r: any) => inPeriod(r.date, data))
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
    { label: 'Evidence', key: 'completion_evidence', width: 115, map: (r) => `${clean(r.completion_evidence)}${r.effectiveness_evidence ? ` / Effectiveness: ${clean(r.effectiveness_evidence)}` : ''}` }, { label: 'Effectiveness', key: 'effectiveness', width: 90 },
  ], 'No action was created within this reconstruction period.', 10);
  heading(doc, '4. Learning and limitations');
  bullets(doc, [locked?.lessons_learned, ...(e.weekly_reviews || []).map((r: any) => r.lessons_learnt)].filter(Boolean), 'No learning or missed opportunity was recorded. The report must not invent causation, blame or information that was unavailable at the time.', 4);
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
  heading(doc, '3. Demonstrated effective controls');
  bullets(doc, (e.actions || []).filter((a: any) => isDemonstratedEffective(a)).map((a: any) => `${clean(a.action)} - evidence: ${clean(a.effectiveness_evidence)}`), 'No control is yet supported by a final Effective judgement and recorded evidence.', 5);
  heading(doc, '4. Improvement evident but control incomplete');
  bullets(doc, (e.actions || []).filter((a: any) => clean(a.effectiveness) === 'Partially Effective').map((a: any) => `${clean(a.action)} — evidence: ${clean(a.effectiveness_evidence || a.completion_evidence)}`), 'No partially effective control was recorded.', 5);
  heading(doc, '5. Control not demonstrated / awaiting review');
  bullets(doc, (e.actions || []).filter((a: any) => ['Not Effective','Too Early To Assess','Not yet reviewed'].includes(clean(a.effectiveness))).map((a: any) => `${clean(a.action)} — ${clean(a.effectiveness)}${a.effectiveness_evidence ? ` — evidence: ${clean(a.effectiveness_evidence)}` : ''}`), 'No failed, interim or unreviewed control was recorded.', 5);
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
