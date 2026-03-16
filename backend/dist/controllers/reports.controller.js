"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsController = exports.ReportsController = void 0;
const reports_service_1 = require("../services/reports.service");
class ReportsController {
    async request(req, res) {
        try {
            const company_id = req.user.company_id;
            const report = await reports_service_1.reportsService.requestReport(company_id, req.user.user_id, req.body);
            return res.status(202).json({ success: true, data: report, meta: {} });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to request report', errors: [] });
        }
    }
    async findAll(req, res) {
        try {
            const company_id = req.user.company_id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await reports_service_1.reportsService.findAll(company_id, page, limit);
            return res.json({ success: true, data: result.reports, meta: { total: result.total, page, limit } });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch reports', errors: [] });
        }
    }
    async findById(req, res) {
        try {
            const company_id = req.user.company_id;
            const report = await reports_service_1.reportsService.findById(req.params.id, company_id);
            return res.json({ success: true, data: report, meta: {} });
        }
        catch (err) {
            return res.status(404).json({ success: false, message: err instanceof Error ? err.message : 'Report not found', errors: [] });
        }
    }
    async download(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await reports_service_1.reportsService.getDownloadUrl(req.params.id, company_id);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Download unavailable', errors: [] });
        }
    }
}
exports.ReportsController = ReportsController;
exports.reportsController = new ReportsController();
//# sourceMappingURL=reports.controller.js.map