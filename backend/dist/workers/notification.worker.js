"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startNotificationWorker = startNotificationWorker;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
function startNotificationWorker() {
    const worker = new bullmq_1.Worker('notification_dispatch', async (job) => {
        const { notification_id, user_id, type, title, body } = job.data;
        logger_1.default.info(`Processing notification ${notification_id} for user ${user_id}`);
        // Get user preferences
        const prefsResult = await (0, database_1.query)('SELECT * FROM notification_preferences WHERE user_id = $1', [user_id]);
        const prefs = prefsResult.rows[0];
        // Check if email dispatch is needed
        if (!prefs || prefs.email_enabled) {
            // In production: integrate with SendGrid/Mailgun/SES
            logger_1.default.info(`[Email] Would send "${title}" to user ${user_id}`);
        }
        // Check if SMS dispatch is needed
        if (prefs?.sms_enabled) {
            // In production: integrate with Twilio/SNS
            logger_1.default.info(`[SMS] Would send "${title}" to user ${user_id}`);
        }
        // Mark as dispatched
        await (0, database_1.query)(`UPDATE notifications SET data = data || $1 WHERE id = $2`, [JSON.stringify({ dispatched_at: new Date().toISOString(), channels: ['in_app'] }), notification_id]);
        logger_1.default.info(`Notification ${notification_id} dispatched`);
        return { success: true, notification_id, type };
    }, { connection: redis_1.redisConnection, concurrency: 10 });
    worker.on('failed', (job, err) => logger_1.default.error(`Notification job ${job?.id} failed`, err));
    return worker;
}
//# sourceMappingURL=notification.worker.js.map