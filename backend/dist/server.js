"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const socket_server_1 = require("./websocket/socket.server");
const report_worker_1 = require("./workers/report.worker");
const analytics_worker_1 = require("./workers/analytics.worker");
const notification_worker_1 = require("./workers/notification.worker");
const eventBus_1 = require("./events/eventBus");
const logger_1 = __importDefault(require("./utils/logger"));
const PORT = parseInt(process.env.PORT || '3001', 10);
// ─── Create HTTP Server ───────────────────────────────────────────────────────
const httpServer = http_1.default.createServer(app_1.default);
// ─── Initialize Socket.IO ────────────────────────────────────────────────────
(0, socket_server_1.initSocketServer)(httpServer);
// ─── Start BullMQ Workers ────────────────────────────────────────────────────
const reportWorker = (0, report_worker_1.startReportWorker)();
const analyticsWorker = (0, analytics_worker_1.startAnalyticsWorker)();
const notificationWorker = (0, notification_worker_1.startNotificationWorker)();
// ─── Event Bus: Wire up global listeners ─────────────────────────────────────
eventBus_1.eventBus.on(eventBus_1.EVENTS.RISK_ESCALATED, (payload) => {
    logger_1.default.info('Risk escalated event received', payload);
    // Additional side effects can go here (e.g. push notification to escalated_to user)
});
eventBus_1.eventBus.on(eventBus_1.EVENTS.GOVERNANCE_OVERDUE, (payload) => {
    logger_1.default.warn('Governance pulse overdue', payload);
});
// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
    logger_1.default.info(`${signal} received. Starting graceful shutdown...`);
    httpServer.close(async () => {
        logger_1.default.info('HTTP server closed');
        try {
            await reportWorker.close();
            await analyticsWorker.close();
            await notificationWorker.close();
            await database_1.pool.end();
            await redis_1.redis.quit();
            logger_1.default.info('All connections closed. Exiting.');
            process.exit(0);
        }
        catch (err) {
            logger_1.default.error('Error during shutdown', err);
            process.exit(1);
        }
    });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    logger_1.default.error('Uncaught exception', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger_1.default.error('Unhandled rejection', reason);
    process.exit(1);
});
// ─── Start Server ─────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
    logger_1.default.info(`
  ╔═══════════════════════════════════════════════════════╗
  ║            🏥  CareSignal Backend v1.0.0              ║
  ╠═══════════════════════════════════════════════════════╣
  ║  Server:   http://localhost:${PORT}                      ║
  ║  API:      http://localhost:${PORT}/api/v1               ║
  ║  Swagger:  http://localhost:${PORT}/api-docs             ║
  ║  Health:   http://localhost:${PORT}/health               ║
  ║  Env:      ${process.env.NODE_ENV || 'development'}                          ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});
exports.default = httpServer;
//# sourceMappingURL=server.js.map