import { exportsRepo } from '../repositories/exports.repo';

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
