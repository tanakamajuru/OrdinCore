import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import logger from '../utils/logger';

export function startNotificationWorker() {
  const worker = new Worker('notification_dispatch', async (job: Job) => {
    const { notification_id, user_id, type, title, body } = job.data as {
      notification_id: string; user_id: string; type: string; title: string; body: string;
    };

    logger.info(`Processing notification ${notification_id} for user ${user_id}`);

    // Get user preferences
    const prefsResult = await query(
      'SELECT * FROM notification_preferences WHERE user_id = $1', [user_id]
    );
    const prefs = prefsResult.rows[0];

    // Check if email dispatch is needed
    if (!prefs || prefs.email_enabled) {
      // In production: integrate with SendGrid/Mailgun/SES
      logger.info(`[Email] Would send "${title}" to user ${user_id}`);
    }

    // Check if SMS dispatch is needed
    if (prefs?.sms_enabled) {
      // In production: integrate with Twilio/SNS
      logger.info(`[SMS] Would send "${title}" to user ${user_id}`);
    }

    // Mark as dispatched
    await query(
      `UPDATE notifications SET data = data || $1 WHERE id = $2`,
      [JSON.stringify({ dispatched_at: new Date().toISOString(), channels: ['in_app'] }), notification_id]
    );

    logger.info(`Notification ${notification_id} dispatched`);
    return { success: true, notification_id, type };

  }, { connection: redisConnection, concurrency: 10 });

  worker.on('failed', (job: Job | undefined, err: Error) => logger.error(`Notification job ${job?.id} failed`, err));
  return worker;
}
