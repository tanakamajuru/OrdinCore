/**
 * generatedReports.service.ts — server-side report generation + retention.
 * Renders the structured data the frontend already fetched into a PDF (pdfkit) or
 * CSV, stores it under public/reports, and records it in generated_reports so it
 * stays re-openable from OrdinCore (the "Saved Reports" list).
 */
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

const REPORTS_DIR = path.join(__dirname, '../../public/reports');

function ensureDir() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Pull the most relevant array of rows out of the various report shapes.
function extractRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  return (
    data?.risks || data?.escalations || data?.timeline || data?.themes ||
    data?.flags || data?.evidence || data?.rows || []
  );
}

function toCsv(rows: any[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: any[]) {
  const startX = 50;
  const colWidth = 500 / headers.length;
  let y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9);
  headers.forEach((h, i) => doc.text(h.replace(/_/g, ' '), startX + i * colWidth, y, { width: colWidth - 6 }));
  y += 16;
  doc.moveTo(startX, y).lineTo(startX + 500, y).stroke();
  y += 6;
  doc.font('Helvetica').fontSize(8);
  for (const row of rows) {
    let rowH = 14;
    headers.forEach((h, i) => {
      const cell = String(row[h] ?? '');
      const hgt = doc.heightOfString(cell, { width: colWidth - 6 });
      if (hgt > rowH) rowH = hgt;
      doc.text(cell, startX + i * colWidth, y, { width: colWidth - 6 });
    });
    y += rowH + 8;
    if (y > 760) { doc.addPage(); y = 50; }
    doc.y = y;
  }
}

function renderPdf(
  filePath: string,
  opts: { title: string; periodLabel?: string; serviceName?: string; narrative?: string; rows: any[] }
): Promise<number> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text(opts.title);
    doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor('#555');
    if (opts.serviceName) doc.text(`Service: ${opts.serviceName}`);
    if (opts.periodLabel) doc.text(`Period: ${opts.periodLabel}`);
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`);
    doc.fillColor('#000').moveDown(1);

    if (opts.narrative && opts.narrative.trim()) {
      doc.font('Helvetica-Bold').fontSize(12).text('Narrative');
      doc.moveDown(0.2).font('Helvetica').fontSize(10).text(opts.narrative.trim(), { align: 'left' });
      doc.moveDown(1);
    }

    if (opts.rows.length) {
      doc.font('Helvetica-Bold').fontSize(12).text('Data');
      doc.moveDown(0.4);
      const headers = Object.keys(opts.rows[0]).slice(0, 6);
      drawTable(doc, headers, opts.rows.slice(0, 300));
    } else {
      doc.font('Helvetica-Oblique').fontSize(10).text('No tabular data for this report in the selected period.');
    }

    doc.end();
    stream.on('finish', () => resolve(fs.statSync(filePath).size));
    stream.on('error', reject);
  });
}

export const generatedReportsService = {
  async generate(
    company_id: string,
    user_id: string,
    opts: { reportKey: string; title: string; format: 'pdf' | 'csv'; periodLabel?: string; serviceName?: string; data: any; narrative?: string }
  ) {
    ensureDir();
    const id = uuidv4();
    const fileName = `gen-${id}.${opts.format}`;
    const filePath = path.join(REPORTS_DIR, fileName);
    const rows = extractRows(opts.data);

    let size = 0;
    if (opts.format === 'csv') {
      const csv = toCsv(rows);
      fs.writeFileSync(filePath, csv, 'utf8');
      size = Buffer.byteLength(csv);
    } else {
      size = await renderPdf(filePath, {
        title: opts.title, periodLabel: opts.periodLabel, serviceName: opts.serviceName,
        narrative: opts.narrative, rows,
      });
    }

    const res = await query(
      `INSERT INTO generated_reports
         (id, company_id, report_key, title, format, period_label, service_name, file_path, size_bytes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, report_key, title, format, period_label, service_name, size_bytes, created_at`,
      [id, company_id, opts.reportKey, opts.title, opts.format, opts.periodLabel || null, opts.serviceName || null, fileName, size, user_id]
    );
    return res.rows[0];
  },

  async list(company_id: string) {
    const r = await query(
      `SELECT id, report_key, title, format, period_label, service_name, size_bytes, created_at
         FROM generated_reports WHERE company_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [company_id]
    );
    return r.rows;
  },

  async getFile(id: string, company_id: string): Promise<{ abs: string; title: string; format: string }> {
    const r = await query(`SELECT title, format, file_path FROM generated_reports WHERE id = $1 AND company_id = $2`, [id, company_id]);
    if (!r.rows[0]) throw new Error('Report not found');
    const abs = path.join(REPORTS_DIR, path.basename(r.rows[0].file_path));
    if (!fs.existsSync(abs)) throw new Error('Report file is no longer available');
    return { abs, title: r.rows[0].title, format: r.rows[0].format };
  },

  async remove(id: string, company_id: string) {
    const r = await query(`SELECT file_path FROM generated_reports WHERE id = $1 AND company_id = $2`, [id, company_id]);
    if (r.rows[0]) {
      const abs = path.join(REPORTS_DIR, path.basename(r.rows[0].file_path));
      try { fs.unlinkSync(abs); } catch { /* file may already be gone */ }
      await query(`DELETE FROM generated_reports WHERE id = $1 AND company_id = $2`, [id, company_id]);
    }
    return { deleted: true };
  },
};
