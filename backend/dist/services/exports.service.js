"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportsService = exports.ExportsService = void 0;
const exports_repo_1 = require("../repositories/exports.repo");
class ExportsService {
    async exportRisks(company_id, format) {
        const data = await exports_repo_1.exportsRepo.getRisks(company_id);
        return this.formatData(data, format, 'Risks_Export');
    }
    async exportIncidents(company_id, format) {
        const data = await exports_repo_1.exportsRepo.getIncidents(company_id);
        return this.formatData(data, format, 'Incidents_Export');
    }
    async exportGovernance(company_id, format) {
        const data = await exports_repo_1.exportsRepo.getGovernance(company_id);
        return this.formatData(data, format, 'Governance_Export');
    }
    async exportUsers(company_id, format) {
        const data = await exports_repo_1.exportsRepo.getUsers(company_id);
        return this.formatData(data, format, 'Users_Export');
    }
    async exportHouses(company_id, format) {
        const data = await exports_repo_1.exportsRepo.getHouses(company_id);
        return this.formatData(data, format, 'Houses_Export');
    }
    formatData(data, format, filenamePrefix) {
        // Basic CSV generator for MVP. 
        // In a real system, you might use 'csv-stringify' or 'pdfkit' for PDF.
        if (format === 'csv') {
            if (data.length === 0)
                return { content: '', filename: `${filenamePrefix}.csv`, contentType: 'text/csv' };
            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
            return { content: `${headers}\n${rows}`, filename: `${filenamePrefix}.csv`, contentType: 'text/csv' };
        }
        // Default fallback to JSON if format not handled
        return { content: JSON.stringify(data, null, 2), filename: `${filenamePrefix}.json`, contentType: 'application/json' };
    }
}
exports.ExportsService = ExportsService;
exports.exportsService = new ExportsService();
//# sourceMappingURL=exports.service.js.map