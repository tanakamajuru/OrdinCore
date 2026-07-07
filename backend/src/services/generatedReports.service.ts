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

type PdfOpts = {
  title: string; periodLabel?: string; serviceName?: string; narrative?: string; rows: any[];
  providerName?: string;
  kloe?: Array<{ code: string; label?: string }>;
  signatory?: { name?: string; role?: string; date?: string };
  acknowledgement?: string;
};

// Finding H: every report flows through one defensible template — provider header,
// visible CQC KLOE mapping, governance narrative, evidence table, acknowledgement, and a
// "prepared and signed" block with a provenance line.
function buildPdfDoc(opts: PdfOpts): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  if (opts.providerName) doc.font('Helvetica-Bold').fontSize(9).fillColor('#0e7490').text(opts.providerName.toUpperCase());
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text(opts.title);
  doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor('#555');
  if (opts.serviceName) doc.text(`Scope: ${opts.serviceName}`);
  if (opts.periodLabel) doc.text(`Period: ${opts.periodLabel}`);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`);
  if (opts.kloe && opts.kloe.length) {
    const mapping = opts.kloe.map((k) => (k.label ? `${k.code} · ${k.label}` : k.code)).join('    ');
    doc.moveDown(0.4).font('Helvetica-Bold').fontSize(9).fillColor('#0e7490')
      .text('CQC key lines of enquiry: ', { continued: true })
      .font('Helvetica').fillColor('#333').text(mapping);
  }
  doc.fillColor('#000').moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
  doc.moveDown(1);

  if (opts.narrative && opts.narrative.trim()) {
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Governance narrative');
    doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor('#000').text(opts.narrative.trim(), { align: 'left' });
    doc.moveDown(1);
  }

  if (opts.rows.length) {
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Evidence');
    doc.moveDown(0.4).fillColor('#000');
    const headers = Object.keys(opts.rows[0]).slice(0, 6);
    drawTable(doc, headers, opts.rows.slice(0, 300));
  } else {
    doc.font('Helvetica-Oblique').fontSize(10).text('No tabular data for this report in the selected period.');
  }

  if (opts.acknowledgement && opts.acknowledgement.trim()) {
    doc.moveDown(1).font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('Acknowledgement');
    doc.moveDown(0.2).font('Helvetica-Oblique').fontSize(9).fillColor('#333').text(opts.acknowledgement.trim());
  }

  doc.moveDown(1.5).fillColor('#000');
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
  doc.moveDown(0.5).font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('Prepared and signed');
  const sig = opts.signatory || {};
  doc.font('Helvetica').fontSize(9).fillColor('#333')
    .text(`${sig.name || '—'}${sig.role ? ` · ${String(sig.role).replace(/_/g, ' ')}` : ''}${sig.date ? ` · ${sig.date}` : ''}`);
  doc.fillColor('#777').fontSize(8).text('Traceable to source signal, decision and reason.');
  return doc;
}

// Map the KLOE codes a report already carries into {code,label} for the template.
function kloeFromData(data: any): Array<{ code: string; label?: string }> {
  const codes: string[] = Array.isArray(data?.kloe) ? data.kloe : [];
  const labels: Record<string, string> = data?.kloe_labels || {};
  return codes.map((c) => ({ code: c, label: labels[c] }));
}

function renderPdf(filePath: string, opts: PdfOpts): Promise<number> {
  return new Promise((resolve, reject) => {
    const doc = buildPdfDoc(opts);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.end();
    stream.on('finish', () => resolve(fs.statSync(filePath).size));
    stream.on('error', reject);
  });
}

function renderPdfBuffer(opts: PdfOpts): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = buildPdfDoc(opts);
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
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
      const provider = (await query(`SELECT name FROM companies WHERE id = $1`, [company_id])).rows[0];
      const me = (await query(`SELECT first_name || ' ' || last_name AS name, role FROM users WHERE id = $1`, [user_id])).rows[0];
      size = await renderPdf(filePath, {
        title: opts.title, periodLabel: opts.periodLabel, serviceName: opts.serviceName,
        narrative: opts.narrative, rows,
        providerName: provider?.name,
        kloe: kloeFromData(opts.data),
        signatory: { name: me?.name, role: me?.role, date: new Date().toLocaleDateString('en-GB') },
        acknowledgement: opts.data?.acknowledgement_statement,
      });
    }

    const res = await query(
      `INSERT INTO generated_reports
         (id, company_id, report_key, title, format, period_label, service_name, file_path, size_bytes, created_by, data, narrative)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, report_key, title, format, period_label, service_name, size_bytes, created_at`,
      [id, company_id, opts.reportKey, opts.title, opts.format, opts.periodLabel || null, opts.serviceName || null, fileName, size, user_id,
       JSON.stringify(opts.data ?? null), opts.narrative || null]
    );
    return res.rows[0];
  },

  // Regenerate the document fresh from the stored report data at download time, so a
  // download never depends on a local file a restart may have wiped. Falls back to the
  // on-disk file for older rows saved before the data was retained.
  async renderForDownload(id: string, company_id: string): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const r = await query(
      `SELECT title, format, period_label, service_name, data, narrative, file_path, created_by, created_at
         FROM generated_reports WHERE id = $1 AND company_id = $2`,
      [id, company_id]
    );
    const row = r.rows[0];
    if (!row) throw new Error('Report not found');
    const provider = (await query(`SELECT name FROM companies WHERE id = $1`, [company_id])).rows[0];
    const me = row.created_by ? (await query(`SELECT first_name || ' ' || last_name AS name, role FROM users WHERE id = $1`, [row.created_by])).rows[0] : null;

    const safe = String(row.title || 'report').replace(/[^a-z0-9-_ ]/gi, '').trim().slice(0, 60) || 'report';
    const filename = `${safe}.${row.format}`;

    if (row.data !== null && row.data !== undefined) {
      const rows = extractRows(row.data);
      if (row.format === 'csv') {
        return { buffer: Buffer.from(toCsv(rows), 'utf8'), filename, contentType: 'text/csv' };
      }
      const buffer = await renderPdfBuffer({
        title: row.title, periodLabel: row.period_label, serviceName: row.service_name, narrative: row.narrative, rows,
        providerName: provider?.name,
        kloe: kloeFromData(row.data),
        signatory: { name: me?.name, role: me?.role, date: row.created_at ? new Date(row.created_at).toLocaleDateString('en-GB') : undefined },
        acknowledgement: row.data?.acknowledgement_statement,
      });
      return { buffer, filename, contentType: 'application/pdf' };
    }

    // Legacy fallback: stream the stored file if present.
    const abs = path.join(REPORTS_DIR, path.basename(row.file_path));
    if (!fs.existsSync(abs)) throw new Error('Report data is no longer available');
    return { buffer: fs.readFileSync(abs), filename, contentType: row.format === 'csv' ? 'text/csv' : 'application/pdf' };
  },

  async list(company_id: string) {
    const r = await query(
      `SELECT id, report_key, title, format, period_label, service_name, size_bytes, created_at,
              (data IS NOT NULL) AS regenerable
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
