"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsService = exports.NotificationsService = void 0;
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const socket_server_1 = require("../websocket/socket.server");
const notificationQueue = new bullmq_1.Queue('notification_dispatch', { connection: redis_1.redisConnection });
class NotificationsService {
    async create(data) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO notifications (id, company_id, user_id, type, title, body, link, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [id, data.company_id, data.user_id, data.type, data.title, data.body, data.link || null, JSON.stringify(data.metadata || {})]);
        const notification = result.rows[0];
        // Push real-time update via socket.io
        try {
            const io = (0, socket_server_1.getIO)();
            io.to(`user:${data.user_id}`).emit('notification', notification);
        }
        catch {
            // Socket.io might not be initialized in test context
        }
        // Queue for external dispatch (email/sms)
        await notificationQueue.add('dispatch', { notification_id: id, ...data });
        return notification;
    }
    async findAll(user_id, company_id, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [notifications, countResult, unread] = await Promise.all([
            (0, database_1.query)(`SELECT * FROM notifications WHERE user_id = $1 AND company_id = $2
         ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, [user_id, company_id]),
            (0, database_1.query)('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND company_id = $2', [user_id, company_id]),
            (0, database_1.query)('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND company_id = $2 AND read = false', [user_id, company_id]),
        ]);
        return {
            notifications: notifications.rows,
            total: parseInt(countResult.rows[0].count),
            unread_count: parseInt(unread.rows[0].count),
            page, limit,
        };
    }
    async markRead(id, user_id) {
        await (0, database_1.query)(`UPDATE notifications SET read = true, read_at = NOW() WHERE id = $1 AND user_id = $2`, [id, user_id]);
    }
    async markAllRead(user_id, company_id) {
        const result = await (0, database_1.query)(`UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND company_id = $2 AND read = false`, [user_id, company_id]);
        return { updated: result.rowCount };
    }
    async getPreferences(user_id) {
        const result = await (0, database_1.query)('SELECT * FROM notification_preferences WHERE user_id = $1', [user_id]);
        return result.rows[0] || null;
    }
    async updatePreferences(user_id, company_id, prefs) {
        await (0, database_1.query)(`INSERT INTO notification_preferences (user_id, company_id, email_enabled, in_app_enabled, sms_enabled, risk_alerts, incident_alerts, governance_reminders, escalation_alerts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (user_id) DO UPDATE SET
         email_enabled = EXCLUDED.email_enabled,
         in_app_enabled = EXCLUDED.in_app_enabled,
         sms_enabled = EXCLUDED.sms_enabled,
         risk_alerts = EXCLUDED.risk_alerts,
         incident_alerts = EXCLUDED.incident_alerts,
         governance_reminders = EXCLUDED.governance_reminders,
         escalation_alerts = EXCLUDED.escalation_alerts,
         updated_at = NOW()`, [user_id, company_id, ...Object.values(prefs)]);
    }
}
exports.NotificationsService = NotificationsService;
exports.notificationsService = new NotificationsService();
//# sourceMappingURL=notifications.service.js.map