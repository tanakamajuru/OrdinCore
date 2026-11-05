import { Worker, Queue, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import logger from '../utils/logger';

/**
 * Advance-reminder sweep for assigned actions (Nov 2026 brief: "Task visibility, advance
 * reminders and monitoring", §4). On-allocation notification already exists (assignment paths
 * notify the assignee directly); actionOverdue.worker.ts already handles post-deadline prompts.
 * This fills the gap in between: a 7-day-before and a 2-day-before prompt, so a long-lead action
 * gets a nudge well ahead of its deadline, not just at allocation and then silence until overdue.
 *
 * Dedup is a timestamp column per milestone (reminder_7d_sent_at / reminder_2d_sent_at, migration
 * 208) rather than a separate reminders table — one row to check, no risk of a worker retry firing
 * the same milestone twice. Reassignment resets both columns (risks.service.ts reassignAction) so
 * a new assignee gets their own 7-day/2-day prompts rather than inheriting a suppressed clock from
 * whoever held the action before them.
 *
 * Known limitation (documented, not silently assumed fixed): due_date is set once at creation and
 * has no edit pathway in this codebase, so "regenerate reminders on an authorised deadline change"
 * is not applicable today — there is no deadline-change path to react to.
 */
export const startActionAdvanceReminderWorker = () => {
  const queueName = 'action-advance-reminder';
  const queue = new Queue(queueName, { connection: redisConnection });

  // Once a day is enough cadence for a day-granularity milestone schedule.
  queue.upsertJobScheduler(
    'sweep',
    { pattern: '0 8 * * *' },
    { name: 'sweep', data: {}, opts: { removeOnComplete: true, removeOnFail: true } }
  ).catch((err) => logger.error('Failed to schedule action-advance-reminder sweep', err));

  const worker = new Worker(
    queueName,
    async (_job: Job) => {
      // UK calendar-day semantics (Nov 2026 brief: date-only deadlines compare by UK day, not
      // instant) — same approach as actionOverdue.worker.ts's own day-boundary fix.
      const due = await query(
        `SELECT a.id, a.company_id, a.title, a.assigned_to,
                (a.due_date AT TIME ZONE 'Europe/London')::date - (NOW() AT TIME ZONE 'Europe/London')::date AS days_until_due
           FROM risk_actions a
          WHERE a.status NOT IN ('Complete','Completed','Cancelled')
            AND a.due_date IS NOT NULL AND a.assigned_to IS NOT NULL
            AND (a.reminder_7d_sent_at IS NULL OR a.reminder_2d_sent_at IS NULL)`
      );

      let sent = 0;
      for (const a of due.rows) {
        const daysUntil = Number(a.days_until_due);
        try {
          if (daysUntil === 7) {
            await notificationsService.create({
              company_id: a.company_id, user_id: a.assigned_to, type: 'ACTION_ADVANCE_REMINDER',
              title: 'Is this on track?', body: `"${a.title}" is due in 7 days. Record progress or flag a barrier.`,
              link: '/my-actions',
            });
            await query(`UPDATE risk_actions SET reminder_7d_sent_at = NOW() WHERE id = $1`, [a.id]);
            sent++;
          } else if (daysUntil === 2) {
            await notificationsService.create({
              company_id: a.company_id, user_id: a.assigned_to, type: 'ACTION_ADVANCE_REMINDER',
              title: 'Due in two days', body: `"${a.title}" is due in 2 days — check the remaining work and evidence required.`,
              link: '/my-actions',
            });
            await query(`UPDATE risk_actions SET reminder_2d_sent_at = NOW() WHERE id = $1`, [a.id]);
            sent++;
          }
        } catch (err) {
          logger.warn(`Failed to send advance reminder for action ${a.id}`, err);
        }
      }
      logger.info(`Action advance-reminder sweep: ${due.rows.length} candidate(s), ${sent} reminder(s) sent`);
      return { candidates: due.rows.length, sent };
    },
    { connection: redisConnection }
  );

  worker.on('failed', (job, err) => logger.error(`Action advance-reminder job ${job?.id} failed`, err));
  return worker;
};
