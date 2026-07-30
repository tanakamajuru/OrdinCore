import PDFDocument from 'pdfkit';
import { findReport } from '../config/report-catalog';

// Renders a PDF from the STORED snapshot only — never from live data — so figures, scope,
// narrative, confidence, hash and approval are exactly what was generated and approved.

const STATUS_COLOR: Record<string, string> = { STABLE: '#2e7d32', ATTENTION: '#ed6c02', CRITICAL: '#d32f2f' };
const d = (x?: any) => (x ? new Date(x).toLocaleDateString('en-GB') : '—');

export function renderSnapshotPdf(row: any): Promise<Buffer> {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
  const title = findReport(row.report_key)?.title || row.report_key;
  const org = data.organisation || {};

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const finished = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  // Header
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text(title);
  doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor('#475569')
    .text(`${data.scope_label || row.scope_type} · ${d(row.period_start)} to ${d(row.period_end)}`);
  doc.moveDown(0.6);

  // Organisation / overall position with the exception override made explicit.
  const st = org.status || 'STABLE';
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Overall position');
  doc.moveDown(0.2).font('Helvetica-Bold').fontSize(13).fillColor(STATUS_COLOR[st] || '#0f172a').text(st);
  doc.font('Helvetica').fontSize(10).fillColor('#000')
    .text(`Governance confidence: ${org.governance_confidence ?? '—'}%   ·   Evidence confidence: ${org.evidence_confidence ?? '—'}%`);
  if (st === 'CRITICAL') {
    doc.moveDown(0.2).fillColor('#d32f2f').fontSize(9)
      .text('At least one site is CRITICAL — the organisation position reflects that exception and is not an average.');
    doc.fillColor('#000');
  }
  doc.moveDown(0.6);

  // Site-by-site comparison
  const sites: any[] = data.per_site || [];
  if (sites.length) {
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Site-by-site comparison');
    doc.moveDown(0.3);
    const x0 = 50; let y = doc.y;
    const cols = [ ['Site', 200], ['Status', 90], ['Gov %', 60], ['Signals', 60], ['Open risks', 70], ['Overdue', 60] ];
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#334155');
    let x = x0; cols.forEach(([h, w]) => { doc.text(String(h), x, y, { width: w as number }); x += w as number; });
    y += 16; doc.moveTo(x0, y - 3).lineTo(545, y - 3).strokeColor('#e2e8f0').stroke();
    doc.font('Helvetica').fillColor('#0f172a');
    for (const s of sites) {
      x = x0;
      const cells = [ s.site_name, s.status, `${s.governance_confidence}%`, String(s.signals ?? 0), String(s.open_risks ?? 0), String(s.overdue_actions ?? 0) ];
      cells.forEach((c, i) => {
        const w = cols[i][1] as number;
        if (i === 1) doc.fillColor(STATUS_COLOR[s.status] || '#0f172a'); else doc.fillColor('#0f172a');
        doc.text(String(c), x, y, { width: w }); x += w;
      });
      y += 15;
      if (y > 740) { doc.addPage(); y = 60; }
    }
    doc.y = y + 6; doc.fillColor('#000');
  }

  // Material exceptions
  const ex: any[] = data.material_exceptions || [];
  if (ex.length) {
    doc.moveDown(0.4).font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Material exceptions');
    doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor('#000');
    ex.forEach((e) => doc.fillColor(STATUS_COLOR[e.status] || '#000').text(`• ${e.site_name} — ${e.status} (${e.governance_confidence}%)`));
    doc.fillColor('#000');
  }

  // Cross-site themes
  const themes: any[] = data.cross_site_themes || [];
  if (themes.length) {
    doc.moveDown(0.4).font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Cross-site themes');
    doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor('#000');
    themes.forEach((t) => doc.text(`• ${t.theme}: ${t.n} signal(s)`));
  }

  // Narrative
  if (row.narrative && String(row.narrative).trim()) {
    doc.moveDown(0.6).font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Governance narrative');
    doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor('#000').text(String(row.narrative).trim(), { align: 'left' });
  }

  // Footer — integrity & approval
  doc.moveDown(1).strokeColor('#e2e8f0').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3).font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text(`Status: ${row.status}${row.approved_at ? ` · Approved ${d(row.approved_at)}` : ''}`);
  doc.text(`Generated: ${d(row.created_at)} · Evidence hash: ${String(row.evidence_hash || '').slice(0, 32)}…`);
  doc.text('This report is rendered from an immutable snapshot; figures are frozen at generation.');

  doc.end();
  return finished;
}
