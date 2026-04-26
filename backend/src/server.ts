import './config/env';
import http from 'http';
import app from './app';
import { getPool } from './config/database';
import { redis } from './config/redis';
import { initSocketServer } from './websocket/socket.server';
import { startReportWorker } from './workers/report.worker';
import { startAnalyticsWorker } from './workers/analytics.worker';
import { startNotificationWorker } from './workers/notification.worker';
import { startPatternWorker } from './workers/pattern.worker';
import { startDailyGovernanceWorker, scheduleDailyGovernanceCheck } from './workers/dailyGovernanceCheck.worker';
import { startActionEffectivenessPromptWorker } from './workers/actionEffectivenessPrompt.worker';
import { startSafeguardingEscalationWorker } from './workers/safeguardingEscalation.worker';
import { startEffectivenessReminderWorker } from './workers/effectivenessReminder.worker';
import { startRecurrenceWatchWorker } from './workers/recurrenceWatch.worker';
import { startNoSignalPromptWorker } from './workers/noSignalPrompt.worker';
import { Queue } from 'bullmq';
import { redisConnection } from './config/redis';
import { eventBus, EVENTS } from './events/eventBus';
import logger from './utils/logger';

const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Create HTTP Server ───────────────────────────────────────────────────────
const httpServer = http.createServer(app);

// ─── Initialize Socket.IO ────────────────────────────────────────────────────
initSocketServer(httpServer);

// ─── Start BullMQ Workers ────────────────────────────────────────────────────
const reportWorker = startReportWorker();
const analyticsWorker = startAnalyticsWorker();
const notificationWorker = startNotificationWorker();
const patternWorker = startPatternWorker();
const dailyGovWorker = startDailyGovernanceWorker();
scheduleDailyGovernanceCheck();
const effortWorker = startActionEffectivenessPromptWorker();
const safeguardingWorker = startSafeguardingEscalationWorker();
const effectivenessReminderWorker = startEffectivenessReminderWorker();
const recurrenceWatchWorker = startRecurrenceWatchWorker();
const noSignalPromptWorker = startNoSignalPromptWorker();

// Simple schedule triggers for daily jobs
new Queue('effectiveness-reminder', { connection: redisConnection }).add('run', {}, { repeat: { pattern: '0 */6 * * *' } });
new Queue('recurrence-watch', { connection: redisConnection }).add('run', {}, { repeat: { pattern: '0 1 * * *' } });
new Queue('no-signal-prompt', { connection: redisConnection }).add('run', {}, { repeat: { pattern: '0 9 * * *' } });
// Simple schedule trigger for the prompt worker
new Queue('action-effectiveness-prompt', { connection: redisConnection }).add('action-effectiveness-prompt', {}, { repeat: { pattern: '0 * * * *' } });

// ─── Event Bus: Wire up global listeners ─────────────────────────────────────
eventBus.on(EVENTS.RISK_ESCALATED, (payload) => {
  logger.info('Risk escalated event received', payload);
  // Additional side effects can go here (e.g. push notification to escalated_to user)
});

eventBus.on(EVENTS.GOVERNANCE_OVERDUE, (payload) => {
  logger.warn('Governance pulse overdue', payload);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  httpServer.close(async () => {
    logger.info('HTTP server closed');
    try {
      await reportWorker.close();
      await analyticsWorker.close();
      await notificationWorker.close();
      await patternWorker.close();
      await dailyGovWorker.close();
      await effortWorker.stop();
      await safeguardingWorker.stop();
      await effectivenessReminderWorker.close();
      await recurrenceWatchWorker.close();
      await noSignalPromptWorker.close();
      await getPool().end();
      await redis.quit();
      logger.info('All connections closed. Exiting.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
  process.exit(1);
});

// ─── Start Server ─────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  logger.info(`
  ╔═══════════════════════════════════════════════════════╗
  ║            🏥  Ordin Core Backend v1.0.0              ║
  ╠═══════════════════════════════════════════════════════╣
  ║  Server:   http://localhost:${PORT}                      ║
  ║  API:      http://localhost:${PORT}/api/v1               ║
  ║  Swagger:  http://localhost:${PORT}/api-docs             ║
  ║  Health:   http://localhost:${PORT}/health               ║
  ║  Env:      ${process.env.NODE_ENV || 'development'}                          ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});

export default httpServer;
