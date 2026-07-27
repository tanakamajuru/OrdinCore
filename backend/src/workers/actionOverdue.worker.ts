import { Worker, Queue, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import logger from '../utils/logger';

/**
 * Overdue-action aging ladder (design pack §"Automatic Escalation of Overdue Actions" — "we have
 * this but need to show aging"). An action that is not completed by its due date must not sit
 * silently. As it ages it climbs the accountability ladder, notifying each level exactly once:
 *
 *   ≥ 1 day   → stage 1: remind the owner
 *   ≥ 2 days  → stage 2: notify the Team Leader(s) of the action's house
 *   ≥ 3 days  → stage 3: notify the Registered Manager
 *   ≥ 7 days  → stage 4: notify the Director
 *   ≥ 14 days → stage 5: it appears in the governance report automatically (compliance surfaces it)
 *
 * escalation_stage records the last rung fired so the hourly sweep never re-notifies the same
 * level. No one escalates this by hand — the system does.
 */

const LADDER: { stage: number; minDays: number; roles: string[] | null; label: string }[] = [
  { stage: 1, minDays: 1, roles: null, label: 'owner reminded' },                       // owner
  { stage: 2, minDays: 2, roles: ['TEAM_LEADER'], label: 'Team Leader notified' },
  { stage: 3, minDays: 3, roles: ['REGISTERED_MANAGER'], label: 'Registered Manager notified' },
  { stage: 4, minDays: 7, roles: ['DIRECTOR'], label: 'Director notified' },
  { stage: 5, minDays: 14, roles: null, label: 'surfaced in governance report' },        // report-only
];

async function usersForRoles(company_id: string, roles: string[], house_id: string | null): Promise<string[]> {
  // Prefer people mapped to the action's house; fall back to any active holder of the role in the
  // company so a chase is never dropped just because house mapping is sparse.
  if (house_id) {
    const scoped = await query(
      `SELECT DISTINCT u.id FROM users u
         JOIN user_houses uh ON uh.user_id = u.id
        WHERE u.company_id = $1 AND u.status = 'active'
          AND u.role = ANY($2::text[]) AND uh.house_id = $3`,
      [company_id, roles, house_id]
    );
    if (scoped.rows.length) return scoped.rows.map((r: any) => r.id);
  }
  const any = await query(
    `SELECT id FROM users WHERE company_id = $1 AND status = 'active' AND role = ANY($2::text[])`,
    [company_id, roles]
  );
  return any.rows.map((r: any) => r.id);
}

export const startActionOverdueWorker = () => {
  const queueName = 'action-overdue';
  const queue = new Queue(queueName, { connection: redisConnection });

  queue.add('sweep', {}, { repeat: { every: 60 * 60 * 1000 }, removeOnComplete: true, removeOnFail: true })
    .catch((err) => logger.error('Failed to schedule action-overdue sweep', err));

  const worker = new Worker(
    queueName,
    async (_job: Job) => {
      const overdue = await query(
        `SELECT a.id, a.company_id, a.title, a.assigned_to, a.escalation_stage, r.house_id,
                FLOOR(EXTRACT(EPOCH FROM (NOW() - a.due_date)) / 86400)::int AS days_overdue
           FROM risk_actions a
           LEFT JOIN risks r ON r.id = a.risk_id
          WHERE a.status NOT IN ('Complete','Completed','Cancelled')
            AND a.due_date IS NOT NULL AND a.due_date < NOW()`
      );

      let fired = 0;
      for (const a of overdue.rows) {
        const days = Number(a.days_overdue) || 0;
        const current = Number(a.escalation_stage) || 0;
        // The highest rung this action has aged into.
        const target = LADDER.filter((l) => days >= l.minDays).pop();
        if (!target || target.stage <= current) continue;

        try {
          if (target.roles) {
            const recipients = await usersForRoles(a.company_id, target.roles, a.house_id || null);
            for (const uid of recipients) {
              await notificationsService.create({
                company_id: a.company_id, user_id: uid, type: 'ACTION_OVERDUE',
                title: `Overdue action — ${target.label}`,
                body: `"${a.title}" is ${days} day(s) overdue and needs completing.`,
                link: '/my-actions',
              });
            }
          } else if (target.stage === 1 && a.assigned_to) {
            await notificationsService.create({
              company_id: a.company_id, user_id: a.assigned_to, type: 'ACTION_OVERDUE',
              title: 'Your action is overdue',
              body: `"${a.title}" is ${days} day(s) overdue. Please complete or update it.`,
              link: '/my-actions',
            });
          }
          // Stamp the rung so this level is never re-notified. Stage 5 (report) has no notice —
          // the governance report reads escalation_stage >= 5 / days_overdue directly.
          await query(
            `UPDATE risk_actions SET escalation_stage = $1, escalation_stage_at = NOW() WHERE id = $2`,
            [target.stage, a.id]
          );
          fired++;
        } catch (err) {
          logger.warn(`Failed to age overdue action ${a.id}`, err);
        }
      }
      logger.info(`Action overdue sweep: ${overdue.rows.length} overdue, ${fired} rung(s) fired`);
      return { overdue: overdue.rows.length, fired };
    },
    { connection: redisConnection }
  );

  worker.on('failed', (job, err) => logger.error(`Action overdue job ${job?.id} failed`, err));
  return worker;
};
