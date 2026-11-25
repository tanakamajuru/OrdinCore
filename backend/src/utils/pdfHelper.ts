import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

// Wordmark lockup (shield + "Ordin Core" name baked in) — the same brand mark used on the frozen
// report PDFs, web login and mobile. Field report (12 Nov 2026): this live-export header used the
// bare icon-only shield plus a separate small "OrdinCore" text line underneath it, and was asked to
// "follow the same formatting" as the frozen reports, which already carry the name on the logo.
//
// 21 Nov 2026 live bug report ("the reports are still not carrying the logo"): confirmed on
// production — `backend/package.json`'s build script is plain `tsc`, which never copies .png
// assets into dist/. A single __dirname-relative path (dist/utils -> dist/reporting/assets/...)
// pointed at a file that only ever exists under src/, so fs.existsSync() here was silently false
// in production and every caller's `if (fs.existsSync(LOGO_PATH))` guard skipped the logo
// entirely — this has been broken since before this session, not a regression from today's work.
// Resolved the same defensive way frozen-pdf.renderer.ts's resolveLogoPath() already does: try
// the dist-relative path first, then fall back to the source tree, which is still on disk in
// production (the repo isn't pruned post-build).
function resolvePdfHelperLogoPath(): string {
  const candidates = [
    path.join(__dirname, '../reporting/assets/ordin-core-logo-wordmark.png'),
    path.resolve(process.cwd(), 'src/reporting/assets/ordin-core-logo-wordmark.png'),
    path.resolve(process.cwd(), 'backend/src/reporting/assets/ordin-core-logo-wordmark.png'),
    path.resolve(__dirname, '../../src/reporting/assets/ordin-core-logo-wordmark.png'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}
export const LOGO_PATH = resolvePdfHelperLogoPath();

/**
 * Draws the report header — matches the frozen-report masthead: wordmark top-right, "Governance &
 * Oversight" top-left, divider line, then the report title.
 * @param doc - PDFKit document instance (assumed to be A4 size, margins: 50pt left/right)
 * @param title - The report title (e.g., "CQC EVIDENCE PACK")
 * @returns The Y-coordinate after the header (for continuation)
 */
export function drawReportHeader(doc: typeof PDFDocument, title: string): number {
  // Page dimensions (A4 = 595.28 x 841.89 points)
  const pageWidth = doc.page.width;
  const leftMargin = 50;    // Consistent with typical PDFKit margin setting
  const rightMargin = 50;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  const logoW = 130, logoH = 43.3; // 3:1 wordmark aspect ratio (865x288 source)
  const startY = 30;

  // Field report (12 Nov 2026): masthead subtitle requested as "Governance, Oversight and
  // Assurance" instead of "Governance & Oversight", to match the frozen-report masthead.
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor('#444444')
     .text('Governance, Oversight and Assurance', leftMargin, startY + 5);

  if (fs.existsSync(LOGO_PATH)) {
    try {
      doc.image(LOGO_PATH, pageWidth - rightMargin - logoW, startY - 6, { width: logoW, height: logoH });
    } catch (err) {
      console.error('Failed to render logo in PDF:', err);
    }
  }

  // Report title – centred horizontally, below the masthead row
  const titleY = startY + logoH + 16;
  doc.fontSize(22)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(title.toUpperCase(), leftMargin, titleY, {
       width: contentWidth,
       align: 'center'
     });

  // Divider line – spans the full content width
  const lineY = titleY + 35; // below the title
  doc.moveTo(leftMargin, lineY)
     .lineTo(pageWidth - rightMargin, lineY)
     .stroke('#cccccc');

  // Return the Y position after the header (for subsequent content)
  return lineY + 15;
}

// ---------------------------------------------------------------------------
// Governance Learning/Escalation record PDF layout spec
// ("Ordin_Core_Learning_and_Escalation_PDF_Dimensions_For_Tanaka", 17 Nov 2026 dev brief).
// Separate from drawReportHeader() above — that helper is shared by several other exports
// (weekly reports, forensic packs, summaries) that are out of scope for this spec and keep
// their existing look. These constants/helpers are used only by governancePdfService's
// learningRecord() and escalationRecord() (the single-record, not summary, exports).
// ---------------------------------------------------------------------------

const MM_TO_PT = 2.83465;

export const GOV_PAGE = {
  WIDTH: 595.28,
  HEIGHT: 841.89,
};

export const GOV_MARGIN = 48;
export const GOV_CONTENT_WIDTH = GOV_PAGE.WIDTH - GOV_MARGIN * 2; // 499.28

// Header band: 20pt-68pt from top. Body starts 85pt from top. Body bottom boundary is 65pt
// above the page bottom — passed to PDFKit as the page's own top/bottom margins so PDFKit's
// native text-wrapping/pagination respects these boundaries for us automatically.
export const GOV_BODY_TOP = 85;
export const GOV_BODY_BOTTOM_MARGIN = 65; // distance from page bottom
export const GOV_BODY_BOTTOM_Y = GOV_PAGE.HEIGHT - GOV_BODY_BOTTOM_MARGIN;

export const GOV_FOOTER_DIVIDER_Y = GOV_PAGE.HEIGHT - 47;
export const GOV_FOOTER_TEXT_BASELINE_Y = GOV_PAGE.HEIGHT - 33;

export const GOV_COLORS = {
  NAVY: '#18354D',
  TEAL: '#207D83',
  SUPPORT_TEXT: '#576571',
  TABLE_BG: '#F3F6F8',
  DIVIDER: '#D9E1E7',
  INK: '#1A1A1A',
  WARNING: '#92400e',
};

// This codebase has no embedded TTF font family in its PDFs — every existing exporter
// (drawReportHeader, frozen-pdf.renderer, this file) uses PDFKit's built-in Helvetica/
// Helvetica-Bold as its one sans-serif family. Matching that rather than introducing a new
// embedded font per the spec's "don't introduce a new font unless none exists" instruction.
export const GOV_FONT_REGULAR = 'Helvetica';
export const GOV_FONT_BOLD = 'Helvetica-Bold';

export const GOV_TYPE = {
  TITLE: { size: 21, lineHeight: 27 },
  HEADING: { size: 11, lineHeight: 15 },
  BODY: { size: 10, lineHeight: 15 },
  META_LABEL: { size: 8, lineHeight: 12 },
  SUPPORT: { size: 8, lineHeight: 12 },
  FOOTER: { size: 7, lineHeight: 10 },
};

export const GOV_SECTION_SPACING_BEFORE = 15;
export const GOV_HEADING_TO_TEXT_GAP = 6;
export const GOV_ATTRIBUTION_GAP = 5;
export const GOV_HEADING_BLOCK_GAP = 5; // title / snapshot line / record id
export const GOV_HEADING_BLOCK_TO_DETAILS_GAP = 16;

export const GOV_META_TABLE = {
  LABEL_WIDTH: 110,
  VALUE_WIDTH: 389.28,
  PAD_X: 12,
  PAD_Y: 5,
};

function govLineGap(type: { size: number; lineHeight: number }): number {
  return type.lineHeight - type.size;
}

// Bottom-left-origin y (as given in the spec, measured up from the page bottom) -> PDFKit's
// top-origin y (measured down from the page top).
function govFromBottom(yFromBottom: number): number {
  return GOV_PAGE.HEIGHT - yFromBottom;
}

/**
 * Draws the Learning/Escalation record masthead for the current page: the same merged wordmark
 * (shield + "Ordin Core" name baked in) used on the frozen reports, top-right, with the
 * "Governance, Oversight and Assurance" tagline top-left, per the 12 Nov field report's "follow
 * the same formatting as the frozen reports" instruction — supersedes the icon+separate-name
 * lockup in the original spec. Call once per page (wire via doc.on('pageAdded', ...)).
 */
export function drawGovernanceRecordHeader(doc: typeof PDFDocument): void {
  // 20 Nov 2026 developer brief ("Escalation and Learning PDFs — header and typography
  // recommendations"): logo moved from top-right to top-left, aligned with the body content
  // margin, 85-105pt wide (same 3:1 wordmark aspect ratio, just larger to sit within that range).
  const logoW = 97.5, logoH = 32.5;
  const logoTopY = govFromBottom(782 + 40); // align with the spec's original masthead band

  if (fs.existsSync(LOGO_PATH)) {
    try {
      doc.image(LOGO_PATH, GOV_MARGIN, logoTopY, { width: logoW, height: logoH });
    } catch (err) {
      console.error('Failed to render logo in governance record PDF:', err);
    }
  }

  const taglineBaselineTop = govFromBottom(787);
  doc.font(GOV_FONT_REGULAR).fontSize(7).fillColor(GOV_COLORS.SUPPORT_TEXT)
    .text('Governance, Oversight and Assurance', GOV_MARGIN + logoW + 10, taglineBaselineTop - 7 * 0.75, { lineBreak: false });

  const dividerY = govFromBottom(774);
  doc.moveTo(GOV_MARGIN, dividerY)
    .lineTo(GOV_PAGE.WIDTH - GOV_MARGIN, dividerY)
    .lineWidth(2)
    .strokeColor(GOV_COLORS.DIVIDER)
    .stroke();

  // The header text/divider draws above all move doc.x/doc.y to wherever they finished (even
  // with lineBreak:false) — reset both back to the body's top-left so body content never
  // inherits a header-area position and overlaps the masthead.
  doc.x = GOV_MARGIN;
  doc.y = GOV_BODY_TOP;
  doc.fillColor(GOV_COLORS.INK).font(GOV_FONT_REGULAR).fontSize(GOV_TYPE.BODY.size);
  doc.lineWidth(1);
}

/**
 * Draws the footer divider, brand/tagline attribution and page number for one page. Call after
 * all content is written, once per buffered page (see stampGovernanceRecordFooters).
 */
export function drawGovernanceRecordFooter(doc: typeof PDFDocument, pageNum: number, pageCount: number): void {
  doc.moveTo(GOV_MARGIN, GOV_FOOTER_DIVIDER_Y)
    .lineTo(GOV_PAGE.WIDTH - GOV_MARGIN, GOV_FOOTER_DIVIDER_Y)
    .lineWidth(1)
    .strokeColor(GOV_COLORS.DIVIDER)
    .stroke();

  const textTopY = GOV_FOOTER_TEXT_BASELINE_Y - GOV_TYPE.FOOTER.size * 0.75;
  doc.font(GOV_FONT_REGULAR).fontSize(GOV_TYPE.FOOTER.size).fillColor(GOV_COLORS.SUPPORT_TEXT)
    .text('Ordin Core — Governance, Oversight and Assurance', GOV_MARGIN, textTopY, {
      width: GOV_CONTENT_WIDTH / 2,
      lineBreak: false,
    });
  doc.font(GOV_FONT_REGULAR).fontSize(GOV_TYPE.FOOTER.size).fillColor(GOV_COLORS.SUPPORT_TEXT)
    .text(`Page ${pageNum} of ${pageCount}`, GOV_MARGIN + GOV_CONTENT_WIDTH / 2, textTopY, {
      width: GOV_CONTENT_WIDTH / 2,
      align: 'right',
      lineBreak: false,
    });

  doc.fillColor(GOV_COLORS.INK).font(GOV_FONT_REGULAR).fontSize(GOV_TYPE.BODY.size);
}

/** Stamps the footer (with correct "Page X of Y") on every buffered page. Call once, right
 * before doc.end(), on a PDFDocument created with {bufferPages: true}. */
export function stampGovernanceRecordFooters(doc: typeof PDFDocument): void {
  const range = (doc as any).bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    (doc as any).switchToPage(i);
    drawGovernanceRecordFooter(doc, i - range.start + 1, range.count);
  }
}

/** Creates a PDFDocument pre-configured for the Learning/Escalation record spec: A4, the
 * spec's margins (doubling as the body top/bottom boundaries so PDFKit's own pagination
 * respects them), buffered pages, and the masthead wired to redraw on every page. */
export function createGovernanceRecordDoc(): typeof PDFDocument {
  const doc = new (PDFDocument as any)({
    size: 'A4',
    margins: { top: GOV_BODY_TOP, bottom: GOV_BODY_BOTTOM_MARGIN, left: GOV_MARGIN, right: GOV_MARGIN },
    bufferPages: true,
    autoFirstPage: false,
  });
  doc.on('pageAdded', () => {
    drawGovernanceRecordHeader(doc);
  });
  doc.addPage();
  return doc;
}

/** Record title (21pt bold / 27 line-height), left-aligned at x=48. */
export function govTitle(doc: typeof PDFDocument, text: string): void {
  doc.font(GOV_FONT_BOLD).fontSize(GOV_TYPE.TITLE.size).fillColor(GOV_COLORS.NAVY)
    .text(text, GOV_MARGIN, doc.y, { width: GOV_CONTENT_WIDTH, lineGap: govLineGap(GOV_TYPE.TITLE) });
  doc.fillColor(GOV_COLORS.INK).font(GOV_FONT_REGULAR).fontSize(GOV_TYPE.BODY.size);
}

// 20 Nov 2026 developer brief: both exports led with the record subject as the 21pt title, which
// for a long subject wrapped over three lines and ended in an ellipsis, with no indication of
// what kind of document this even was. A fixed report-type title (16-17pt bold navy) now goes
// first, with the record subject demoted to normal body-weight text underneath it (11-12pt,
// allowed to wrap in full — never truncated).
export const GOV_REPORT_TITLE_SIZE = { size: 17, lineHeight: 22 };

/** Fixed report-type title ("Escalation Report" / "Learning Report") — 16-17pt bold navy, always
 * the first thing on the page. Also sets the PDF's own document-metadata title to match. */
export function govReportTitle(doc: typeof PDFDocument, text: string): void {
  (doc as any).info.Title = text;
  doc.font(GOV_FONT_BOLD).fontSize(GOV_REPORT_TITLE_SIZE.size).fillColor(GOV_COLORS.NAVY)
    .text(text, GOV_MARGIN, doc.y, { width: GOV_CONTENT_WIDTH, lineGap: govLineGap(GOV_REPORT_TITLE_SIZE) });
  doc.fillColor(GOV_COLORS.INK).font(GOV_FONT_REGULAR).fontSize(GOV_TYPE.BODY.size);
}

/** The record subject, demoted from the old 21pt title treatment to normal body weight (11-12pt
 * regular), placed under the fixed report-type title. Long subjects wrap in full — never
 * truncated or ellipsised. */
export function govRecordSubject(doc: typeof PDFDocument, text: string): void {
  doc.font(GOV_FONT_REGULAR).fontSize(12).fillColor(GOV_COLORS.INK)
    .text(text, GOV_MARGIN, doc.y, { width: GOV_CONTENT_WIDTH, lineGap: govLineGap({ size: 12, lineHeight: 16 }) });
  doc.fillColor(GOV_COLORS.INK).font(GOV_FONT_REGULAR).fontSize(GOV_TYPE.BODY.size);
}

/** Snapshot / supporting line under the title — 8pt regular, supporting-text colour,
 * right-aligned (as the live-snapshot notice always has been). Explicitly resets width/
 * alignment/font/colour afterwards so it never bleeds into later text. */
export function govSupportLine(doc: typeof PDFDocument, text: string, opts: { align?: 'left' | 'right' } = {}): void {
  doc.font(GOV_FONT_REGULAR).fontSize(GOV_TYPE.SUPPORT.size).fillColor(GOV_COLORS.SUPPORT_TEXT)
    .text(text, GOV_MARGIN, doc.y, {
      width: GOV_CONTENT_WIDTH,
      align: opts.align || 'right',
      lineGap: govLineGap(GOV_TYPE.SUPPORT),
    });
  doc.fillColor(GOV_COLORS.INK).font(GOV_FONT_REGULAR).fontSize(GOV_TYPE.BODY.size);
  doc.x = GOV_MARGIN;
}

function govBottomY(doc: typeof PDFDocument): number {
  return doc.page.height - (doc.page.margins as any).bottom;
}

/** Explicit page-break guard: if the given height would not fit above the footer boundary,
 * starts a new page first (which redraws the masthead and resets doc.y to the body top). */
export function govEnsureSpace(doc: typeof PDFDocument, neededHeight: number): void {
  if (doc.y + neededHeight > govBottomY(doc)) {
    (doc as any).addPage();
  }
}

/** One label/value metadata table row (label 110pt / value 389.28pt columns, 12pt horizontal /
 * 5pt vertical cell padding, top-aligned, table background fill). Computes its own height from
 * the actual text — never a fixed-height box — and never splits across a page break. */
export function govMetaRow(doc: typeof PDFDocument, label: string, value: string): void {
  const { LABEL_WIDTH, VALUE_WIDTH, PAD_X, PAD_Y } = GOV_META_TABLE;
  const labelFont = GOV_FONT_BOLD, labelSize = GOV_TYPE.META_LABEL.size;
  const valueFont = GOV_FONT_REGULAR, valueSize = GOV_TYPE.BODY.size;

  const labelH = doc.font(labelFont).fontSize(labelSize)
    .heightOfString(label, { width: LABEL_WIDTH - PAD_X * 2, lineGap: govLineGap(GOV_TYPE.META_LABEL) });
  const valueH = doc.font(valueFont).fontSize(valueSize)
    .heightOfString(value, { width: VALUE_WIDTH - PAD_X * 2, lineGap: govLineGap(GOV_TYPE.BODY) });
  const rowHeight = Math.max(labelH, valueH) + PAD_Y * 2;

  govEnsureSpace(doc, rowHeight); // never split a metadata row across pages

  const rowY = doc.y;
  doc.rect(GOV_MARGIN, rowY, LABEL_WIDTH + VALUE_WIDTH, rowHeight).fill(GOV_COLORS.TABLE_BG);

  doc.font(labelFont).fontSize(labelSize).fillColor(GOV_COLORS.NAVY)
    .text(label, GOV_MARGIN + PAD_X, rowY + PAD_Y, { width: LABEL_WIDTH - PAD_X * 2, lineGap: govLineGap(GOV_TYPE.META_LABEL) });
  doc.font(valueFont).fontSize(valueSize).fillColor(GOV_COLORS.INK)
    .text(value, GOV_MARGIN + LABEL_WIDTH + PAD_X, rowY + PAD_Y, { width: VALUE_WIDTH - PAD_X * 2, lineGap: govLineGap(GOV_TYPE.BODY) });

  doc.x = GOV_MARGIN;
  doc.y = rowY + rowHeight;
}

/** Section heading (11pt bold / 15 line-height, 15pt spacing before it, 6pt gap to the text
 * that follows). If bodyText is given, keeps the heading together with at least its first two
 * lines by forcing a page break before the heading (rather than after) when neither fits. */
export function govSectionHeading(doc: typeof PDFDocument, text: string, bodyText?: string): void {
  const atFreshPageTop = Math.abs(doc.y - (doc.page.margins as any).top) < 0.5;
  const spacingBefore = atFreshPageTop ? 0 : GOV_SECTION_SPACING_BEFORE;

  let keepWithHeight = GOV_TYPE.HEADING.lineHeight + GOV_HEADING_TO_TEXT_GAP;
  if (bodyText) {
    doc.font(GOV_FONT_REGULAR).fontSize(GOV_TYPE.BODY.size);
    const fullHeight = doc.heightOfString(bodyText, { width: GOV_CONTENT_WIDTH, lineGap: govLineGap(GOV_TYPE.BODY) });
    keepWithHeight += Math.min(fullHeight, GOV_TYPE.BODY.lineHeight * 2);
  }

  if (doc.y + spacingBefore + keepWithHeight > govBottomY(doc)) {
    (doc as any).addPage();
  } else {
    doc.y += spacingBefore;
  }

  doc.font(GOV_FONT_BOLD).fontSize(GOV_TYPE.HEADING.size).fillColor(GOV_COLORS.NAVY)
    .text(text, GOV_MARGIN, doc.y, { width: GOV_CONTENT_WIDTH, lineGap: govLineGap(GOV_TYPE.HEADING) });
  doc.y += GOV_HEADING_TO_TEXT_GAP;
  doc.fillColor(GOV_COLORS.INK).font(GOV_FONT_REGULAR).fontSize(GOV_TYPE.BODY.size);
  doc.x = GOV_MARGIN;
}

/** Body paragraph (10pt regular / 15 line-height), full width, no indent. Height is always
 * computed from the full text — paragraphs are never truncated or shrunk to fit a page. */
export function govParagraph(doc: typeof PDFDocument, text: string, opts: { color?: string; bold?: boolean; indent?: number } = {}): void {
  const indent = opts.indent || 0;
  doc.font(opts.bold ? GOV_FONT_BOLD : GOV_FONT_REGULAR).fontSize(GOV_TYPE.BODY.size).fillColor(opts.color || GOV_COLORS.INK)
    .text(text, GOV_MARGIN + indent, doc.y, { width: GOV_CONTENT_WIDTH - indent, lineGap: govLineGap(GOV_TYPE.BODY) });
  doc.fillColor(GOV_COLORS.INK).font(GOV_FONT_REGULAR).fontSize(GOV_TYPE.BODY.size);
  doc.x = GOV_MARGIN;
}

/** History/list-entry line (same body size/family/colour as govParagraph, left-aligned, at an
 * optional indent) used for dated history rows (escalation/decision/action entries). 25 Nov 2026
 * field report: this previously rendered at the smaller 8pt supporting-text size/colour while the
 * surrounding narrative paragraphs (govParagraph) used 10pt ink text, producing a page with two
 * different font sizes/colours and no consistent rhythm. Unified on govParagraph's BODY size/ink
 * colour — the larger of the two — so every line on the page reads at one consistent size. */
export function govSupportText(doc: typeof PDFDocument, text: string, opts: { indent?: number; bold?: boolean } = {}): void {
  const indent = opts.indent || 0;
  doc.font(opts.bold ? GOV_FONT_BOLD : GOV_FONT_REGULAR).fontSize(GOV_TYPE.BODY.size).fillColor(GOV_COLORS.INK)
    .text(text, GOV_MARGIN + indent, doc.y, { width: GOV_CONTENT_WIDTH - indent, lineGap: govLineGap(GOV_TYPE.BODY) });
  doc.fillColor(GOV_COLORS.INK).font(GOV_FONT_REGULAR).fontSize(GOV_TYPE.BODY.size);
  doc.x = GOV_MARGIN;
}

/** Vertical gap helper (points, not "lines") so spacing matches the spec's exact pt values
 * instead of PDFKit's font-relative moveDown(). */
export function govGap(doc: typeof PDFDocument, pt: number): void {
  doc.y += pt;
}

// Keep eslint/tsc happy about the mm constant actually being used if a caller ever needs it.
export const GOV_MM_TO_PT = MM_TO_PT;
