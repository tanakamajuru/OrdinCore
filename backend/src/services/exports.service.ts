import { query } from '../config/database';
import { exportsRepo } from '../repositories/exports.repo';
import { riGovernanceService } from './riGovernance.service';
import PDFDocument from 'pdfkit';

export class ExportsService {
  async exportRisks(company_id: string, format: string) {
    const data = await exportsRepo.getRisks(company_id);
    return this.formatData(data, format, 'Risks_Export');
  }

  async exportIncidents(company_id: string, format: string) {
    const data = await exportsRepo.getIncidents(company_id);
    return this.formatData(data, format, 'Incidents_Export');
  }

  async exportGovernance(company_id: string, format: string) {
    const data = await exportsRepo.getGovernance(company_id);
    return this.formatData(data, format, 'Governance_Export');
  }

  async exportUsers(company_id: string, format: string) {
    const data = await exportsRepo.getUsers(company_id);
    return this.formatData(data, format, 'Users_Export');
  }

  async exportHouses(company_id: string, format: string) {
    const data = await exportsRepo.getHouses(company_id);
    return this.formatData(data, format, 'Houses_Export');
  }

  async exportEvidencePack(company_id: string, house_id: string) {
    const data = await riGovernanceService.getEvidencePack(company_id, house_id);
    const houseRes = await query('SELECT name FROM houses WHERE id = $1', [house_id]);
    const houseName = houseRes.rows[0]?.name || 'Unknown House';

    const doc = new PDFDocument();
    const buffers: any[] = [];
    doc.on('data', buffers.push.bind(buffers));
    
    // Header
    doc.fontSize(25).text(`FORENSIC EVIDENCE PACK: ${houseName.toUpperCase()}`, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();
    doc.rect(50, doc.y, 500, 2).fill('#000000');
    doc.moveDown();

    // 1. Signals
    doc.fontSize(18).text('1. GOVERNANCE SIGNAL TIMELINE', { underline: true });
    data.signals.forEach((s: any) => {
        doc.fontSize(10).text(`[${new Date(s.entry_date).toLocaleDateString()}] ${s.severity.toUpperCase()} | ${s.signal_type}`);
        doc.fontSize(8).text(s.description, { indent: 20 });
        doc.moveDown(0.5);
    });
    doc.moveDown();

    // 2. Risks
    doc.fontSize(18).text('2. ACTIVE RISK TRAJECTORY', { underline: true });
    data.risks.forEach((r: any) => {
        doc.fontSize(10).text(`${r.title} [Status: ${r.status}]`);
        doc.fontSize(8).text(`Impact: ${r.impact_level} | Probability: ${r.probability_level}`, { indent: 20 });
        doc.moveDown(0.5);
    });
    doc.moveDown();

    // 3. Weekly Reviews
    doc.fontSize(18).text('3. GOVERNANCE NARRATIVES (LAST 4 WEEKS)', { underline: true });
    data.reviews.forEach((rv: any) => {
        doc.fontSize(10).text(`WE: ${new Date(rv.week_ending).toLocaleDateString()} | Position: ${rv.overall_position}`);
        doc.fontSize(8).text(rv.governance_narrative, { indent: 20 });
        doc.moveDown(0.5);
    });
    doc.moveDown();

    // 4. Incidents
    doc.fontSize(18).text('4. INCIDENT AUDIT TRAIL', { underline: true });
    data.incidents.forEach((i: any) => {
        doc.fontSize(10).text(`${i.severity.toUpperCase()}: ${i.title}`);
        doc.fontSize(8).text(`Occurred: ${new Date(i.occurred_at).toLocaleString()} | Acknowledged: ${i.acknowledged_at ? new Date(i.acknowledged_at).toLocaleString() : 'PENDING'}`, { indent: 20 });
        doc.moveDown(0.5);
    });

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve({
                content: pdfData,
                filename: `EvidencePack_${houseName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
                contentType: 'application/pdf'
            });
        });
    });
  }

  private formatData(data: any[], format: string, filenamePrefix: string) {
    // Basic CSV generator for MVP. 
    // In a real system, you might use 'csv-stringify' or 'pdfkit' for PDF.
    if (format === 'csv') {
      if (data.length === 0) return { content: '', filename: `${filenamePrefix}.csv`, contentType: 'text/csv' };
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
      return { content: `${headers}\n${rows}`, filename: `${filenamePrefix}.csv`, contentType: 'text/csv' };
    } 
    
    // Default fallback to JSON if format not handled
    return { content: JSON.stringify(data, null, 2), filename: `${filenamePrefix}.json`, contentType: 'application/json' };
  }
}

export const exportsService = new ExportsService();
