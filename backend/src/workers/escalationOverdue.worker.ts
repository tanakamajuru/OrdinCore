import { Worker, Queue, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import logger from '../utils/logger';

/**
 * Escalation overdue worker (spec module 4 / section 11).
 * Time-bound escalations that pass their due_by while still open are flagged
 * urgent and surfaced to the assignee so leadership accountability is visible.
 */
export const startEscalationOverdueWorker = () => {
  const queueName = 'escalation-overdue';
  const queue = new Queue(queueName, { connection: redisConnection });

  // Run hourly.
  queue.add(
    'sweep',
    {},
    { repeat: { every: 60 * 60 * 1000 }, removeOnComplete: true, removeOnFail: true }
  ).catch((err) => logger.error('Failed to schedule escalation-overdue sweep', err));

  const worker = new Worker(
    queueName,
    async (_job: Job) => {
      logger.info('Running escalation overdue sweep');

      // Newly-overdue escalations (open, past due, not yet escalated to urgent).
      const overdue = await query(
        `SELECT id, company_id, escalated_to, reason
           FROM escalations
          WHERE lifecycle_status NOT IN ('Closed')
            AND due_by IS NOT NULL
            AND due_by < NOW()
            AND COALESCE(priority, '') NOT IN ('Urgent', 'Critical')`
      );

      // Bump priority so overdue items rise to the top of dashboards.
      await query(
        `UPDATE escalations
            SET priority = CASE WHEN priority = 'Critical' THEN priority ELSE 'Urgent' END,
                updated_at = NOW()
          WHERE lifecycle_status NOT IN ('Closed')
            AND due_by IS NOT NULL
            AND due_by < NOW()`
      );

      for (const esc of overdue.rows) {
        if (!esc.escalated_to) continue;
        try {
          await notificationsService.create({
            company_id: esc.company_id,
            user_id: esc.escalated_to,
            type: 'ESCALATION_OVERDUE',
            title: 'Escalation overdue',
            body: `An escalation has passed its agreed response time and requires review: ${esc.reason || ''}`.trim(),
          });
        } catch (err) {
          logger.warn(`Failed to notify overdue escalation ${esc.id}`, err);
        }
      }

      return { flagged: overdue.rows.length };
    },
    { connection: redisConnection }
  );

  worker.on('failed', (job, err) => logger.error(`Escalation overdue job ${job?.id} failed`, err));
  return worker;
};
