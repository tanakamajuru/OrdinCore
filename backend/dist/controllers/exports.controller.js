"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportsController = exports.ExportsController = void 0;
const exports_service_1 = require("../services/exports.service");
class ExportsController {
    async handleExportRequest(req, res, exportFunction) {
        try {
            const company_id = req.user.company_id;
            const format = req.query.format || 'csv';
            const result = await exportFunction(company_id, format);
            res.setHeader('Content-disposition', `attachment; filename=${result.filename}`);
            res.setHeader('Content-type', result.contentType);
            return res.send(result.content);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to generate export';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async exportRisks(req, res) {
        return this.handleExportRequest(req, res, exports_service_1.exportsService.exportRisks.bind(exports_service_1.exportsService));
    }
    async exportIncidents(req, res) {
        return this.handleExportRequest(req, res, exports_service_1.exportsService.exportIncidents.bind(exports_service_1.exportsService));
    }
    async exportGovernance(req, res) {
        return this.handleExportRequest(req, res, exports_service_1.exportsService.exportGovernance.bind(exports_service_1.exportsService));
    }
    async exportUsers(req, res) {
        return this.handleExportRequest(req, res, exports_service_1.exportsService.exportUsers.bind(exports_service_1.exportsService));
    }
    async exportHouses(req, res) {
        return this.handleExportRequest(req, res, exports_service_1.exportsService.exportHouses.bind(exports_service_1.exportsService));
    }
}
exports.ExportsController = ExportsController;
exports.exportsController = new ExportsController();
//# sourceMappingURL=exports.controller.js.map