import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

// Wordmark lockup (shield + "Ordin Core" name baked in) — the same brand mark used on the frozen
// report PDFs, web login and mobile. Field report (12 Nov 2026): this live-export header used the
// bare icon-only shield plus a separate small "OrdinCore" text line underneath it, and was asked to
// "follow the same formatting" as the frozen reports, which already carry the name on the logo.
export const LOGO_PATH = path.join(__dirname, '../reporting/assets/ordin-core-logo-wordmark.png');

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
