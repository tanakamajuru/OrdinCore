"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemController = exports.SystemController = void 0;
const system_service_1 = require("../services/system.service");
class SystemController {
    async getSettings(req, res) {
        try {
            const group = req.query.group;
            const settings = await system_service_1.systemService.getSettings(group);
            return res.json({ success: true, data: settings, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch settings';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async updateSettings(req, res) {
        try {
            const updates = req.body.settings; // Expected array of {key, value}
            if (!Array.isArray(updates))
                throw new Error('Invalid settings format');
            const updated = await system_service_1.systemService.updateSettings(updates, req.user.user_id);
            return res.json({ success: true, data: updated, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update settings';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async getAuditLogs(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const filters = {
                event_type: req.query.event_type,
                date_from: req.query.date_from,
                date_to: req.query.date_to
            };
            const logs = await system_service_1.systemService.getAuditLogs(page, limit, filters);
            return res.json({ success: true, data: logs.logs, meta: { total: logs.total, page: logs.page, limit: logs.limit, pages: logs.pages } });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch audit logs';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
    async getJobLogs(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const logs = await system_service_1.systemService.getJobLogs(page, limit);
            return res.json({ success: true, data: logs.logs, meta: { total: logs.total, page: logs.page, limit: logs.limit, pages: logs.pages } });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch job logs';
            return res.status(500).json({ success: false, message, errors: [] });
        }
    }
}
exports.SystemController = SystemController;
exports.systemController = new SystemController();
//# sourceMappingURL=system.controller.js.map