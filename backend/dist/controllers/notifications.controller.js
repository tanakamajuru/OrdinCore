"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsController = exports.NotificationsController = void 0;
const notifications_service_1 = require("../services/notifications.service");
class NotificationsController {
    async findAll(req, res) {
        try {
            const company_id = req.user.company_id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await notifications_service_1.notificationsService.findAll(req.user.user_id, company_id, page, limit);
            return res.json({ success: true, data: result.notifications, meta: { total: result.total, unread_count: result.unread_count, page, limit } });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to fetch notifications', errors: [] });
        }
    }
    async markRead(req, res) {
        try {
            await notifications_service_1.notificationsService.markRead(req.params.id, req.user.user_id);
            return res.json({ success: true, data: { message: 'Marked as read' }, meta: {} });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to mark notification', errors: [] });
        }
    }
    async markAllRead(req, res) {
        try {
            const company_id = req.user.company_id;
            const result = await notifications_service_1.notificationsService.markAllRead(req.user.user_id, company_id);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to mark all', errors: [] });
        }
    }
    async getPreferences(req, res) {
        try {
            const prefs = await notifications_service_1.notificationsService.getPreferences(req.user.user_id);
            return res.json({ success: true, data: prefs, meta: {} });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to get preferences', errors: [] });
        }
    }
    async updatePreferences(req, res) {
        try {
            const company_id = req.user.company_id;
            await notifications_service_1.notificationsService.updatePreferences(req.user.user_id, company_id, req.body);
            return res.json({ success: true, data: { message: 'Preferences updated' }, meta: {} });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Failed to update preferences', errors: [] });
        }
    }
}
exports.NotificationsController = NotificationsController;
exports.notificationsController = new NotificationsController();
//# sourceMappingURL=notifications.controller.js.map