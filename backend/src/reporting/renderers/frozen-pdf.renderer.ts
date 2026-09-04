import PDFDocument from 'pdfkit';
import { findReport } from '../config/report-catalog';

// Renders a PDF from the STORED snapshot only — never from live data — so every figure, name,
// date, narrative and evidence row is exactly what was generated, hashed and approved. The
// templates are plain-language and evidence-led: where the snapshot holds no evidence for a
// section we print "Not recorded" / "None recorded in this period" rather than inferring
// anything. Nothing here re-queries the database.

const NAVY = '#12233f';
const BLUE = '#17689b';
const INK = '#1e2936';
const MUTED = '#607080';
const LINE = '#d6e0e7';
const PALE = '#eaf3f7';
const STATUS_COLOR: Record<string, string> = { STABLE: '#2e7d32', ATTENTION: '#ed6c02', CRITICAL: '#d32f2f' };

const LEFT = 50;
const WIDTH = 495;
const PAGE_BOTTOM = 742;

// ── small text helpers ───────────────────────────────────────────────────────
const clean = (v: any): string => {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s;
};
const short = (v: any, n = 160): string => {
  const s = clean(v);
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
const date = (x?: any): string => {
  if (!x) return 'Not recorded';
  const dt = new Date(x);
  return isNaN(dt.getTime()) ? 'Not recorded' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const orNot = (v: any, fallback = 'Not recorded'): string => {
  const s = clean(v);
  return s || fallback;
};

// Ensure there is room for `need` px on the page; add a page (and reset the cursor) if not.
function ensure(doc: PDFKit.PDFDocument, need: number) {
  if (doc.y + need > PAGE_BOTTOM) {
    doc.addPage();
    doc.x = LEFT;
    doc.y = 60;
  }
}

function heading(doc: PDFKit.PDFDocument, text: string) {
  ensure(doc, 40);
  doc.moveDown(0.6);
  doc.x = LEFT;
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(NAVY).text(text, LEFT, doc.y, { width: WIDTH });
  const y = doc.y + 3;
  doc.moveTo(LEFT, y).lineTo(LEFT + WIDTH, y).strokeColor(LINE).lineWidth(1).stroke();
  doc.moveDown(0.5);
  doc.x = LEFT;
}

function paragraph(doc: PDFKit.PDFDocument, text: string, opts: { color?: string; size?: number; bold?: boolean } = {}) {
  const s = clean(text);
  if (!s) return;
  ensure(doc, 24);
  doc.x = LEFT;
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size ?? 10).fillColor(opts.color ?? INK)
    .text(s, LEFT, doc.y, { width: WIDTH, align: 'left', lineGap: 1.5 });
  doc.moveDown(0.3);
}

function bullets(doc: PDFKit.PDFDocument, items: string[], empty = 'None recorded in this period.') {
  const list = items.map(clean).filter(Boolean);
  if (!list.length) {
    paragraph(doc, empty, { color: MUTED });
    return;
  }
  doc.font('Helvetica').fontSize(10).fillColor(INK);
  for (const it of list) {
    const h = doc.heightOfString(it, { width: WIDTH - 14 });
    ensure(doc, h + 4);
    const y = doc.y;
    doc.fillColor(BLUE).text('•', LEFT, y, { width: 10 });
    doc.fillColor(INK).text(it, LEFT + 14, y, { width: WIDTH - 14, lineGap: 1.5 });
    doc.moveDown(0.15);
  }
  doc.x = LEFT;
}

type Col = { label: string; width: number; get: (row: any) => string };

// Generic, page-aware table. Cells wrap; cursor is always reset to the left margin afterwards
// (a hard-won lesson — drawing cells with an explicit x otherwise parks the cursor mid-row).
function table(doc: PDFKit.PDFDocument, cols: Col[], rows: any[], empty = 'None recorded in this period.') {
  if (!rows.length) {
    paragraph(doc, empty, { color: MUTED });
    return;
  }
  const drawHeader = () => {
    ensure(doc, 24);
    const y = doc.y;
    doc.rect(LEFT, y - 2, WIDTH, 18).fill(PALE);
    let x = LEFT + 4;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY);
    for (const c of cols) { doc.text(c.label, x, y + 3, { width: c.width - 6 }); x += c.width; }
    doc.y = y + 18;
    doc.x = LEFT;
  };
  drawHeader();
  doc.font('Helvetica').fontSize(8.5);
  for (const row of rows) {
    const cells = cols.map((c) => clean(c.get(row)) || '—');
    const heights = cells.map((val, i) => doc.heightOfString(val, { width: cols[i].width - 6 }));
    const rowH = Math.max(14, ...heights) + 6;
    if (doc.y + rowH > PAGE_BOTTOM) { doc.addPage(); doc.x = LEFT; doc.y = 60; drawHeader(); doc.font('Helvetica').fontSize(8.5); }
    const y = doc.y;
    let x = LEFT + 4;
    cells.forEach((val, i) => {
      doc.fillColor(i === 0 ? INK : '#2a3746').text(val, x, y + 2, { width: cols[i].width - 6, lineGap: 1 });
      x += cols[i].width;
    });
    const ny = y + rowH;
    doc.moveTo(LEFT, ny - 2).lineTo(LEFT + WIDTH, ny - 2).strokeColor('#eef3f6').lineWidth(0.5).stroke();
    doc.x = LEFT;
    doc.y = ny;
  }
  doc.x = LEFT;
  doc.moveDown(0.2);
}

// Overall-position banner shared by the position-led reports.
function position(doc: PDFKit.PDFDocument, org: any) {
  const st = clean(org?.status) || 'STABLE';
  ensure(doc, 46);
  const y = doc.y;
  doc.roundedRect(LEFT, y, WIDTH, 40, 4).fill(PALE);
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8).text('OVERALL POSITION', LEFT + 12, y + 7);
  doc.fillColor(STATUS_COLOR[st] || NAVY).font('Helvetica-Bold').fontSize(15).text(st, LEFT + 12, y + 17);
  doc.fillColor(INK).font('Helvetica').fontSize(9).text(
    `Governance confidence ${org?.governance_confidence ?? '—'}%   ·   Evidence confidence ${org?.evidence_confidence ?? '—'}%`,
    LEFT + 150, y + 22, { width: WIDTH - 160, align: 'right' });
  doc.x = LEFT;
  doc.y = y + 48;
  if (st === 'CRITICAL') {
    paragraph(doc, 'At least one service is rated CRITICAL. This overall position reflects that exception — it is not an average across services.', { color: STATUS_COLOR.CRITICAL, size: 9 });
  }
}

// ── report templates ─────────────────────────────────────────────────────────
// Each takes the parsed snapshot `data` (including data.evidence) and the stored `row`.

function renderWeekly(doc: PDFKit.PDFDocument, data: any, row: any) {
  const ev = data.evidence || {};
  position(doc, data.organisation || {});

  heading(doc, 'What this review covers');
  paragraph(doc, `This is the governance review for ${orNot(data.scope_label, row.scope_type)}, covering the period ${date(row.period_start)} to ${date(row.period_end)}. It summarises the concerns raised, the risks being managed, the actions taken and the decisions recorded during the week.`);

  heading(doc, 'Concerns raised this week');
  paragraph(doc, `${(ev.signals || []).length} concern(s) were logged in this period.`, { color: MUTED, size: 9 });
  table(doc, [
    { label: 'Date', width: 62, get: (r) => date(r.date) },
    { label: 'Service', width: 90, get: (r) => orNot(r.service, '—') },
    { label: 'Concern', width: 213, get: (r) => short(r.concern, 180) },
    { label: 'Severity', width: 60, get: (r) => orNot(r.severity, '—') },
    { label: 'Status', width: 70, get: (r) => orNot(r.review_status, '—') },
  ], ev.signals || []);

  heading(doc, 'Actions taken and being tracked');
  table(doc, [
    { label: 'Action', width: 200, get: (r) => short(r.action, 160) },
    { label: 'Owner', width: 95, get: (r) => orNot(r.owner, 'Not assigned') },
    { label: 'Due', width: 62, get: (r) => date(r.due_date) },
    { label: 'Status', width: 70, get: (r) => orNot(r.status, '—') },
    { label: 'Effectiveness', width: 68, get: (r) => orNot(r.effectiveness, 'Not yet reviewed') },
  ], ev.actions || []);

  heading(doc, 'Decisions recorded');
  table(doc, [
    { label: 'Date', width: 62, get: (r) => date(r.date) },
    { label: 'Decision', width: 210, get: (r) => short(r.decision, 170) },
    { label: 'Reason / evidence', width: 143, get: (r) => short(r.reason, 120) },
    { label: 'Reviewer', width: 80, get: (r) => orNot(r.reviewer, 'Not recorded') },
  ], ev.decisions || []);

  weeklyNarrativeBlock(doc, ev);
  narrativeBlock(doc, row);
}

function weeklyNarrativeBlock(doc: PDFKit.PDFDocument, ev: any) {
  const wr: any[] = ev.weekly_reviews || [];
  if (!wr.length) return;
  heading(doc, 'Manager reflections (from weekly reviews)');
  for (const w of wr) {
    ensure(doc, 30);
    paragraph(doc, `${orNot(w.service, 'Service')} — week ending ${date(w.week_ending)}`, { bold: true, size: 10 });
    if (clean(w.lessons_learnt)) paragraph(doc, `Lessons learnt: ${clean(w.lessons_learnt)}`);
    if (clean(w.anticipated_risks)) paragraph(doc, `Anticipated risks: ${clean(w.anticipated_risks)}`);
    if (!clean(w.lessons_learnt) && !clean(w.anticipated_risks) && clean(w.content)) paragraph(doc, short(w.content, 400));
  }
}

function renderOverview(doc: PDFKit.PDFDocument, data: any, row: any) {
  position(doc, data.organisation || {});

  heading(doc, 'Service-by-service position');
  const sites: any[] = data.per_site || [];
  table(doc, [
    { label: 'Service', width: 150, get: (r) => orNot(r.site_name, '—') },
    { label: 'Position', width: 80, get: (r) => orNot(r.status, '—') },
    { label: 'Gov %', width: 55, get: (r) => `${r.governance_confidence ?? '—'}%` },
    { label: 'Concerns', width: 70, get: (r) => String(r.signals ?? 0) },
    { label: 'Open risks', width: 75, get: (r) => String(r.open_risks ?? 0) },
    { label: 'Overdue', width: 65, get: (r) => String(r.overdue_actions ?? 0) },
  ], sites, 'No services in scope for this report.');

  const ex: any[] = data.material_exceptions || [];
  heading(doc, 'Where attention is needed');
  if (ex.length) {
    bullets(doc, ex.map((e) => `${orNot(e.site_name)} — ${orNot(e.status)} (governance confidence ${e.governance_confidence ?? '—'}%)`));
  } else {
    paragraph(doc, 'No service is currently rated ATTENTION or CRITICAL in this period.', { color: MUTED });
  }

  const themes: any[] = data.cross_site_themes || [];
  heading(doc, 'Themes appearing across services');
  bullets(doc, themes.map((t) => `${orNot(t.theme)} — ${t.n ?? 0} concern(s)`), 'No themes recurred across more than one service in this period.');

  narrativeBlock(doc, row);
}

function renderRisks(doc: PDFKit.PDFDocument, data: any, row: any) {
  const ev = data.evidence || {};
  const risks: any[] = ev.risks || [];
  paragraph(doc, `This report lists the key risks in scope for ${orNot(data.scope_label, row.scope_type)} during ${date(row.period_start)} to ${date(row.period_end)}, and the management response to each. ${risks.length} risk(s) recorded.`);

  heading(doc, 'Key risks and how they are being managed');
  table(doc, [
    { label: 'Risk', width: 165, get: (r) => short(r.risk, 130) },
    { label: 'Service', width: 90, get: (r) => orNot(r.service, 'Organisation-wide') },
    { label: 'Severity', width: 58, get: (r) => orNot(r.severity, '—') },
    { label: 'Direction', width: 72, get: (r) => orNot(r.direction, 'Insufficient evidence') },
    { label: 'Status', width: 60, get: (r) => orNot(r.status, '—') },
    { label: 'Review due', width: 50, get: (r) => date(r.review_due_date) },
  ], risks, 'No risks were recorded in scope for this period.');

  // For each closed risk, the closure reason is the defensible evidence — surface it plainly.
  const closed = risks.filter((r) => /closed|resolved/i.test(clean(r.status)));
  if (closed.length) {
    heading(doc, 'Closed risks — reason for closure');
    for (const r of closed) {
      paragraph(doc, `${short(r.risk, 120)}`, { bold: true, size: 10 });
      paragraph(doc, orNot(r.resolution_reason, 'Closure reason not recorded.'), { color: clean(r.resolution_reason) ? INK : MUTED });
    }
  }
  narrativeBlock(doc, row);
}

function renderEscalations(doc: PDFKit.PDFDocument, data: any, row: any) {
  const ev = data.evidence || {};
  const esc: any[] = ev.escalations || [];
  paragraph(doc, `This report covers matters escalated for management attention in ${orNot(data.scope_label, row.scope_type)} during ${date(row.period_start)} to ${date(row.period_end)}, and the response to each. ${esc.length} escalation(s) recorded.`);

  heading(doc, 'Escalations and management response');
  table(doc, [
    { label: 'Raised', width: 60, get: (r) => date(r.date) },
    { label: 'Service', width: 82, get: (r) => orNot(r.service, 'Organisation-wide') },
    { label: 'Reason', width: 150, get: (r) => short(r.reason, 130) },
    { label: 'Priority', width: 52, get: (r) => orNot(r.priority, '—') },
    { label: 'Status', width: 66, get: (r) => orNot(r.status, '—') },
    { label: 'Due by', width: 60, get: (r) => date(r.due_by) },
  ], esc, 'No escalations were recorded in this period.');

  const closed = esc.filter((r) => clean(r.outcome));
  if (closed.length) {
    heading(doc, 'Outcomes recorded');
    for (const r of closed) {
      paragraph(doc, `${date(r.date)} · ${orNot(r.service, 'Organisation-wide')} — escalated to ${orNot(r.escalated_to, 'not recorded')}`, { bold: true, size: 9.5 });
      paragraph(doc, clean(r.outcome));
    }
  }
  narrativeBlock(doc, row);
}

function renderManager(doc: PDFKit.PDFDocument, data: any, row: any) {
  const ev = data.evidence || {};
  position(doc, data.organisation || {});

  heading(doc, "Manager's summary");
  if (clean(row.narrative)) {
    paragraph(doc, clean(row.narrative));
  } else {
    paragraph(doc, 'No written manager summary was recorded for this period. The evidence below is drawn from the governance record.', { color: MUTED });
  }

  heading(doc, 'What happened this period — in numbers');
  const t = data.totals || {};
  bullets(doc, [
    `${(ev.signals || []).length} concern(s) logged`,
    `${(ev.risks || []).length} risk(s) in scope`,
    `${(ev.actions || []).length} action(s) tracked`,
    `${(ev.escalations || []).length} escalation(s) raised`,
    `${(ev.decisions || []).length} governance decision(s) recorded`,
    t.overdue_actions != null ? `${t.overdue_actions} action(s) overdue at period end` : '',
  ].filter(Boolean));

  heading(doc, 'Reflections from weekly reviews');
  weeklyNarrativeBlockBody(doc, ev);
}

function weeklyNarrativeBlockBody(doc: PDFKit.PDFDocument, ev: any) {
  const wr: any[] = ev.weekly_reviews || [];
  if (!wr.length) { paragraph(doc, 'No weekly reviews were published in this period.', { color: MUTED }); return; }
  for (const w of wr) {
    ensure(doc, 28);
    paragraph(doc, `${orNot(w.service, 'Service')} — week ending ${date(w.week_ending)}`, { bold: true, size: 10 });
    if (clean(w.lessons_learnt)) paragraph(doc, `Lessons learnt: ${clean(w.lessons_learnt)}`);
    if (clean(w.anticipated_risks)) paragraph(doc, `Anticipated risks: ${clean(w.anticipated_risks)}`);
  }
}

function renderPatterns(doc: PDFKit.PDFDocument, data: any, row: any) {
  const ev = data.evidence || {};
  paragraph(doc, `This report identifies concerns that are repeating across more than one service in ${orNot(data.scope_label, row.scope_type)} during ${date(row.period_start)} to ${date(row.period_end)}. Recurring concerns can point to a systemic issue rather than an isolated event.`);

  heading(doc, 'Patterns identified across services');
  table(doc, [
    { label: 'Pattern', width: 150, get: (r) => short(r.pattern, 120) },
    { label: 'Domain', width: 90, get: (r) => orNot(r.domain, '—') },
    { label: 'Services affected', width: 130, get: (r) => orNot(r.affected_scope, '—') },
    { label: 'Signals', width: 50, get: (r) => String(r.signal_count ?? 0) },
    { label: 'Status', width: 75, get: (r) => orNot(r.status, '—') },
  ], ev.patterns || [], 'No cross-service patterns were identified in this period.');

  heading(doc, 'Themes by concern count');
  const themes: any[] = data.cross_site_themes || [];
  bullets(doc, themes.map((t) => `${orNot(t.theme)} — ${t.n ?? 0} concern(s)`), 'No themes recurred across services in this period.');

  const reviewed = (ev.patterns || []).filter((p: any) => clean(p.review_outcome));
  if (reviewed.length) {
    heading(doc, 'Review outcomes');
    for (const p of reviewed) {
      paragraph(doc, `${short(p.pattern, 120)}`, { bold: true, size: 9.5 });
      paragraph(doc, clean(p.review_outcome));
    }
  }
  narrativeBlock(doc, row);
}

function renderEvidence(doc: PDFKit.PDFDocument, data: any, row: any) {
  const ev = data.evidence || {};
  position(doc, data.organisation || {});
  paragraph(doc, `This is a governance evidence summary for ${orNot(data.scope_label, row.scope_type)}, ${date(row.period_start)} to ${date(row.period_end)}. It gathers the concerns, risks, actions, escalations and decisions on record so the governance activity for the period can be reviewed in one place.`);

  heading(doc, 'Concerns on record');
  table(doc, [
    { label: 'Date', width: 62, get: (r) => date(r.date) },
    { label: 'Service', width: 90, get: (r) => orNot(r.service, '—') },
    { label: 'Concern', width: 215, get: (r) => short(r.concern, 180) },
    { label: 'Domain', width: 128, get: (r) => orNot(r.domain, '—') },
  ], ev.signals || []);

  heading(doc, 'Risks on record');
  table(doc, [
    { label: 'Risk', width: 200, get: (r) => short(r.risk, 160) },
    { label: 'Service', width: 100, get: (r) => orNot(r.service, 'Organisation-wide') },
    { label: 'Severity', width: 90, get: (r) => orNot(r.severity, '—') },
    { label: 'Status', width: 105, get: (r) => orNot(r.status, '—') },
  ], ev.risks || []);

  heading(doc, 'Actions on record');
  table(doc, [
    { label: 'Action', width: 230, get: (r) => short(r.action, 190) },
    { label: 'Owner', width: 110, get: (r) => orNot(r.owner, 'Not assigned') },
    { label: 'Status', width: 75, get: (r) => orNot(r.status, '—') },
    { label: 'Due', width: 80, get: (r) => date(r.due_date) },
  ], ev.actions || []);

  heading(doc, 'Decisions on record');
  table(doc, [
    { label: 'Date', width: 62, get: (r) => date(r.date) },
    { label: 'Decision', width: 215, get: (r) => short(r.decision, 170) },
    { label: 'Reason / evidence', width: 138, get: (r) => short(r.reason, 110) },
    { label: 'Reviewer', width: 80, get: (r) => orNot(r.reviewer, '—') },
  ], ev.decisions || []);

  narrativeBlock(doc, row);
}

function renderReconstruction(doc: PDFKit.PDFDocument, data: any, row: any) {
  const ev = data.evidence || {};
  paragraph(doc, `This report reconstructs the governance timeline for ${orNot(data.scope_label, row.scope_type)} between ${date(row.period_start)} and ${date(row.period_end)}, drawing every dated event from the record into a single chronological account. Use it to understand what was known, when, and what was done in response.`);

  // Build one chronological timeline from every dated evidence stream.
  type Ev = { when: any; kind: string; text: string };
  const events: Ev[] = [];
  for (const s of ev.signals || []) events.push({ when: s.date, kind: 'Concern raised', text: `${orNot(s.service, '')} — ${short(s.concern, 150)}` });
  for (const e of ev.escalations || []) events.push({ when: e.date, kind: 'Escalation', text: `${orNot(e.service, '')} — ${short(e.reason, 150)}` });
  for (const a of ev.actions || []) events.push({ when: a.due_date, kind: 'Action', text: `${short(a.action, 140)} (owner ${orNot(a.owner, 'not assigned')}, ${orNot(a.status, 'status not recorded')})` });
  for (const d of ev.decisions || []) events.push({ when: d.date, kind: 'Decision', text: `${short(d.decision, 150)}` });
  for (const w of ev.weekly_reviews || []) events.push({ when: w.week_ending, kind: 'Weekly review', text: `${orNot(w.service, '')} — review published` });
  events.sort((a, b) => new Date(a.when || 0).getTime() - new Date(b.when || 0).getTime());

  heading(doc, 'Governance timeline');
  table(doc, [
    { label: 'Date', width: 70, get: (r) => date(r.when) },
    { label: 'Event', width: 95, get: (r) => r.kind },
    { label: 'Detail', width: 330, get: (r) => r.text },
  ], events, 'No dated governance events were recorded in this period.');

  narrativeBlock(doc, row);
}

function renderAssurance(doc: PDFKit.PDFDocument, data: any, row: any) {
  const ev = data.evidence || {};
  position(doc, data.organisation || {});
  paragraph(doc, `This is a provider assurance summary for ${orNot(data.scope_label, row.scope_type)}, ${date(row.period_start)} to ${date(row.period_end)}. It is written for leadership and board oversight and sets out the overall position, the material exceptions, and the assurance the governance record provides.`);

  heading(doc, 'Position across services');
  table(doc, [
    { label: 'Service', width: 175, get: (r) => orNot(r.site_name, '—') },
    { label: 'Position', width: 95, get: (r) => orNot(r.status, '—') },
    { label: 'Gov %', width: 70, get: (r) => `${r.governance_confidence ?? '—'}%` },
    { label: 'Open risks', width: 75, get: (r) => String(r.open_risks ?? 0) },
    { label: 'Overdue', width: 70, get: (r) => String(r.overdue_actions ?? 0) },
  ], data.per_site || [], 'No services in scope for this report.');

  heading(doc, 'Material exceptions for the board');
  const ex: any[] = data.material_exceptions || [];
  bullets(doc, ex.map((e) => `${orNot(e.site_name)} — ${orNot(e.status)} (governance confidence ${e.governance_confidence ?? '—'}%)`), 'No material exceptions were recorded in this period.');

  heading(doc, 'Highest-severity risks');
  const topRisks = (ev.risks || []).filter((r: any) => /high|critical/i.test(clean(r.severity)));
  table(doc, [
    { label: 'Risk', width: 200, get: (r) => short(r.risk, 160) },
    { label: 'Service', width: 110, get: (r) => orNot(r.service, 'Organisation-wide') },
    { label: 'Severity', width: 90, get: (r) => orNot(r.severity, '—') },
    { label: 'Direction', width: 95, get: (r) => orNot(r.direction, 'Insufficient evidence') },
  ], topRisks, 'No high or critical risks were recorded in this period.');

  narrativeBlock(doc, row);
}

function renderDecisions(doc: PDFKit.PDFDocument, data: any, row: any) {
  const ev = data.evidence || {};
  paragraph(doc, `This is the governance decision record for ${orNot(data.scope_label, row.scope_type)}, ${date(row.period_start)} to ${date(row.period_end)}. It sets out the decisions taken, the reason and evidence recorded for each, who recorded them, and the supporting audit trail — the defensible account of governance activity for the period.`);

  heading(doc, 'Decisions taken');
  table(doc, [
    { label: 'Date', width: 62, get: (r) => date(r.date) },
    { label: 'Service', width: 82, get: (r) => orNot(r.service, 'Organisation-wide') },
    { label: 'Decision', width: 165, get: (r) => short(r.decision, 140) },
    { label: 'Reason / evidence', width: 106, get: (r) => short(r.reason, 90) },
    { label: 'Recorded by', width: 80, get: (r) => orNot(r.reviewer, 'Not recorded') },
  ], ev.decisions || [], 'No governance decisions were recorded in this period.');

  heading(doc, 'Supporting audit trail');
  paragraph(doc, 'These entries are drawn from the tamper-evident audit log and relate to the records covered by this report.', { color: MUTED, size: 9 });
  table(doc, [
    { label: 'When', width: 90, get: (r) => date(r.date) },
    { label: 'Actor', width: 105, get: (r) => orNot(r.actor, 'System') },
    { label: 'Action', width: 120, get: (r) => orNot(r.action, '—') },
    { label: 'Reason', width: 180, get: (r) => short(r.reason, 150) },
  ], ev.audit || [], 'No audit entries are on record for the items in this report.');

  narrativeBlock(doc, row);
}

// Shared free-text narrative block (only where a narrative was actually recorded).
function narrativeBlock(doc: PDFKit.PDFDocument, row: any) {
  if (!clean(row.narrative)) return;
  heading(doc, 'Governance narrative');
  paragraph(doc, clean(row.narrative));
}

const RENDERERS: Record<string, (doc: PDFKit.PDFDocument, data: any, row: any) => void> = {
  'weekly-governance-review': renderWeekly,
  'executive-governance-dashboard': renderOverview,
  'strategic-risk-register': renderRisks,
  'escalation-intervention': renderEscalations,
  'weekly-leadership-narrative': renderManager,
  'cross-service-governance': renderPatterns,
  'inspection-evidence-pack': renderEvidence,
  'governance-reconstruction': renderReconstruction,
  'board-ri-assurance': renderAssurance,
  'governance-audit-log': renderDecisions,
};

export function renderSnapshotPdf(row: any): Promise<Buffer> {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
  const title = findReport(row.report_key)?.title || row.report_key;

  const doc = new PDFDocument({ margin: LEFT, size: 'A4', bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const finished = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  // Cover / masthead
  doc.rect(0, 0, doc.page.width, 96).fill(NAVY);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(19).text(title, LEFT, 28, { width: WIDTH });
  doc.font('Helvetica').fontSize(10).fillColor('#c7d6e4')
    .text(`${orNot(data.scope_label, row.scope_type)}   ·   ${date(row.period_start)} to ${date(row.period_end)}`, LEFT, 60, { width: WIDTH });
  doc.x = LEFT;
  doc.y = 118;
  doc.fillColor(INK);

  // Body — route to the plain-language template for this report key.
  const render = RENDERERS[row.report_key];
  if (render) {
    render(doc, data, row);
  } else {
    paragraph(doc, 'This report type does not have a template configured.', { color: MUTED });
  }

  // Any limitations recorded by the data builder (e.g. a stream that could not be evidenced).
  const limitations: string[] = Array.isArray(data.limitations) ? data.limitations : [];
  if (limitations.length) {
    heading(doc, 'Limitations of this report');
    bullets(doc, limitations);
  }

  // Integrity footer + page numbers, written across every buffered page.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const y = PAGE_BOTTOM + 6;
    doc.moveTo(LEFT, y).lineTo(LEFT + WIDTH, y).strokeColor(LINE).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED);
    doc.text(
      `Rendered from an immutable snapshot — figures are frozen at generation.  Status: ${orNot(row.status, '—')}${row.approved_at ? ` · Approved ${date(row.approved_at)}` : ''}  ·  Evidence hash ${String(row.evidence_hash || '').slice(0, 24)}…`,
      LEFT, y + 4, { width: WIDTH - 60 });
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, LEFT + WIDTH - 60, y + 4, { width: 60, align: 'right' });
  }

  doc.end();
  return finished;
}
