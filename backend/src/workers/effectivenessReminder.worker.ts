import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import logger from '../utils/logger';

export const startEffectivenessReminderWorker = () => {
    const worker = new Worker('effectiveness-reminder', async (job: Job) => {
        logger.info(`Running Action Effectiveness Reminder check`);

        // Any Completed action not yet rated on EITHER field, completed >= 48h ago.
        // No upper bound: previously the 48–72h band meant anything that slipped through
        // (worker down, no RM resolved) was never re-prompted — so the effectiveness loop
        // silently stalled and "controls effective" evidence never accumulated. This now
        // catches up, and the per-action 24h dedup below stops it re-notifying every run.
        const actionsRes = await query(`
            SELECT ra.id, ra.risk_id, ra.company_id, ra.title AS action_title, r.house_id
            FROM risk_actions ra
            JOIN risks r ON ra.risk_id = r.id
            WHERE ra.status = 'Completed'
              AND ra.effectiveness_outcome IS NULL
              AND ra.effectiveness IS NULL
              AND ra.completed_at <= NOW() - INTERVAL '48 hours'
        `);

        for (const action of actionsRes.rows) {
            // Resolve the house's Registered Manager via the canonical model: the house's
            // designated manager_id, or a user_houses association. (assigned_house_id is the
            // legacy column and is typically NULL under the multi-role model — using it here
            // was the blockage: no RM resolved => no reminder, no prompt, ever.)
            const rmRes = await query(
                `SELECT u.id
                   FROM users u
                  WHERE u.company_id = $1
                    AND u.role = 'REGISTERED_MANAGER'
                    AND u.status = 'active'
                    AND (
                      EXISTS (SELECT 1 FROM houses h WHERE h.id = $2 AND h.manager_id = u.id)
                      OR EXISTS (SELECT 1 FROM user_houses uh WHERE uh.user_id = u.id AND uh.house_id = $2)
                    )
                  ORDER BY (EXISTS (SELECT 1 FROM houses h WHERE h.id = $2 AND h.manager_id = u.id)) DESC
                  LIMIT 1`,
                [action.company_id, action.house_id]
            );
            const rm_id = rmRes.rows[0]?.id;
            if (!rm_id) {
                logger.warn(`Effectiveness reminder: no Registered Manager resolved for house ${action.house_id} (action ${action.id})`);
                continue;
            }

            // Dedup: at most one reminder per action per 24h (keyed on notification metadata).
            const already = await query(
                `SELECT 1 FROM notifications
                  WHERE user_id = $1 AND type = 'ACTION_EFFECTIVENESS_DUE'
                    AND data->>'action_id' = $2
                    AND created_at >= NOW() - INTERVAL '24 hours'
                  LIMIT 1`,
                [rm_id, action.id]
            );
            if (already.rows[0]) continue;

            await notificationsService.create({
                company_id: action.company_id,
                user_id: rm_id,
                type: 'ACTION_EFFECTIVENESS_DUE',
                title: 'Action Effectiveness Rating Required',
                body: `"${action.action_title}" was completed over 48 hours ago. Rate its effectiveness to update the risk trajectory.`,
                link: `/risk-register/${action.risk_id}?section=effectiveness`,
                metadata: { action_id: action.id, risk_id: action.risk_id },
            });

            await query(`
                INSERT INTO system_prompts (company_id, user_id, title, message, prompt_type)
                VALUES ($1, $2, $3, $4, $5)
            `, [action.company_id, rm_id, 'Action Effectiveness Required', `Rate the effectiveness of "${action.action_title}".`, 'ACTION_EFFECTIVENESS']);
        }
    }, { connection: redisConnection });

    worker.on('completed', (job) => {
        logger.info(`Effectiveness reminder job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`Effectiveness reminder job ${job?.id} failed`, err);
    });

    return worker;
};
