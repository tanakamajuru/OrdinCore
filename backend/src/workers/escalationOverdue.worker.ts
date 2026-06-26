import { Worker, Queue, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import { escalationDueBy } from '../services/escalations.service';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// The accountability ladder: when an escalation breaches its SLA it climbs to the
// next role. RESPONSIBLE_INDIVIDUAL is the top — it stays there and keeps chasing.
const NEXT_ROLE: Record<string, string> = {
  REGISTERED_MANAGER: 'DIRECTOR',
  RM: 'DIRECTOR',
  DIRECTOR: 'RESPONSIBLE_INDIVIDUAL',
};

async function findUserForRole(company_id: string, role: string): Promise<string | null> {
  const roles = role === 'RESPONSIBLE_INDIVIDUAL' ? ['RESPONSIBLE_INDIVIDUAL', 'RI'] : [role];
  const r = await query(
    `SELECT id FROM users WHERE company_id = $1 AND role = ANY($2::text[]) AND status = 'active' LIMIT 1`,
    [company_id, roles]
  );
  return r.rows[0]?.id || null;
}

/**
 * Escalation overdue worker — the RESPONSE side of the accountability ladder.
 * Detection (immediateDetection / risk escalate) raises an escalation with a
 * due_by; this worker enforces the response. When an escalation breaches its SLA
 * it is reassigned UP the role chain (RM → Director → RI) with a fresh clock and
 * an audit row, so "when you knew, what you did, how fast" is always answerable.
 * Resetting due_by on each step also rate-limits the sweep (no hourly spam).
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

      const overdue = await query(
        `SELECT e.id, e.company_id, e.escalated_to, e.reason, e.trigger_type, e.priority,
                u.role AS current_role
           FROM escalations e
           LEFT JOIN users u ON u.id = e.escalated_to
          WHERE e.lifecycle_status NOT IN ('Closed')
            AND e.due_by IS NOT NULL
            AND e.due_by < NOW()`
      );

      let reassigned = 0;
      for (const esc of overdue.rows) {
        const freshDue = escalationDueBy(esc.trigger_type);
        const nextRole = NEXT_ROLE[String(esc.current_role || '').toUpperCase()];
        const nextUser = nextRole ? await findUserForRole(esc.company_id, nextRole) : null;

        try {
          if (nextUser && nextUser !== esc.escalated_to) {
            // Climb the ladder: reassign, reset the clock, audit, notify.
            await query(
              `UPDATE escalations
                  SET escalated_to = $1, due_by = $2,
                      priority = CASE WHEN priority = 'Critical' THEN priority ELSE 'Urgent' END,
                      updated_at = NOW()
                WHERE id = $3`,
              [nextUser, freshDue, esc.id]
            );
            await query(
              `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
               VALUES ($1,$2,$3,'escalation_ladder',$4,$5)`,
              [uuidv4(), esc.id, esc.company_id,
               `SLA breached — escalated up to ${nextRole.replace(/_/g, ' ').toLowerCase()}`, nextUser]
            );
            await notificationsService.create({
              company_id: esc.company_id, user_id: nextUser, type: 'ESCALATION_LADDER',
              title: 'Escalation reassigned to you (overdue)',
              body: `An overdue escalation has been escalated up to you: ${esc.reason || ''}`.trim(),
              link: '/escalation-log',
            });
            reassigned++;
          } else {
            // Top of the ladder (or no next role): bump priority, push the clock
            // forward so we don't re-notify every hour, and keep chasing.
            await query(
              `UPDATE escalations
                  SET due_by = $1,
                      priority = CASE WHEN priority = 'Critical' THEN priority ELSE 'Urgent' END,
                      updated_at = NOW()
                WHERE id = $2`,
              [freshDue, esc.id]
            );
            if (esc.escalated_to) {
              await notificationsService.create({
                company_id: esc.company_id, user_id: esc.escalated_to, type: 'ESCALATION_OVERDUE',
                title: 'Escalation still overdue',
                body: `An escalation remains overdue at the top of the accountability ladder: ${esc.reason || ''}`.trim(),
                link: '/escalation-log',
              });
            }
          }
        } catch (err) {
          logger.warn(`Failed to process overdue escalation ${esc.id}`, err);
        }
      }

      return { overdue: overdue.rows.length, reassigned };
    },
    { connection: redisConnection }
  );

  worker.on('failed', (job, err) => logger.error(`Escalation overdue job ${job?.id} failed`, err));
  return worker;
};
