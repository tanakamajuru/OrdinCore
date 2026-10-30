import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

export const LOGO_PATH = path.join(__dirname, '../../../frontend/src/app/components/images/logo.png');

/**
 * Draws a professional report header with a larger logo, company name,
 * centred title, and a divider line, respecting A4 margins.
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

  // Logo dimensions (larger, professional size)
  // 30 Oct 2026 live bug report ("the text Ordincore is behind or in front of the logo"):
  // logo.png is a 500x500 SQUARE image, so rendering it at width:80 with no explicit height
  // makes PDFKit auto-scale it to 80pt TALL, not the 40pt this code assumed when positioning
  // the company-name text below it — the text was placed halfway up the logo's own height,
  // landing inside the shield instead of beneath it. Fixed to the image's true aspect ratio.
  const logoWidth = 80;      // more balanced
  const logoHeight = 80;     // logo.png is square (500x500) — width and height must match

  let startY = 30;           // top of the page (after default margin)

  // 1. Logo – top‑left corner
  if (fs.existsSync(LOGO_PATH)) {
    try {
      doc.image(LOGO_PATH, leftMargin, startY, { width: logoWidth, height: logoHeight });
    } catch (err) {
      console.error('Failed to render logo in PDF:', err);
    }
  }

  // 2. Company name – placed just below the logo
  const companyName = 'OrdinCore';
  const companyTextY = startY + logoHeight + 5; // 5pt spacing
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor('#444444')
     .text(companyName, leftMargin, companyTextY);

  // 3. Report title – centred horizontally, positioned below the company name
  const titleY = companyTextY + 20; // space between company name and title
  doc.fontSize(22)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(title.toUpperCase(), leftMargin, titleY, {
       width: contentWidth,
       align: 'center'
     });

  // 4. Divider line – spans the full content width
  const lineY = titleY + 35; // below the title
  doc.moveTo(leftMargin, lineY)
     .lineTo(pageWidth - rightMargin, lineY)
     .stroke('#cccccc');

  // 5. Return the Y position after the header (for subsequent content)
  return lineY + 15;
}
