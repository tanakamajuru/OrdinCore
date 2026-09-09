import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import { thresholdEventsRepo } from '../repositories/thresholdEvents.repo';
import logger from '../utils/logger';

export const startRecurrenceWatchWorker = () => {
    const worker = new Worker('recurrence-watch', async (job: Job) => {
        logger.info(`Running Recurrence Watch (Rule 5)`);
        
        // Finding B: watch each closed risk for the duration of its explicit recurrence
        // window (stamped at closure, default 60 days). Legacy closes without a window
        // fall back to the historical 14-day behaviour.
        const closedRisksRes = await query(`
            SELECT * FROM risks
            WHERE status = 'Closed'
              AND (
                (recurrence_window_until IS NOT NULL AND recurrence_window_until >= NOW())
                OR (recurrence_window_until IS NULL AND closed_at >= NOW() - INTERVAL '14 days')
              )
        `);

        for (const risk of closedRisksRes.rows) {
            // Check if any new pulse with same domain and house exists after closed_at
            const newSignalsRes = await query(`
                SELECT gp.id FROM governance_pulses gp
                WHERE gp.company_id = $1
                AND ($2::uuid IS NULL OR gp.house_id = $2)
                AND COALESCE(gp.created_at, gp.entry_date::timestamptz) > $3
                AND $4 = ANY(gp.risk_domain)
                LIMIT 1
            `, [risk.company_id, risk.house_id, risk.closed_at, risk.risk_domain]);

            if (newSignalsRes.rows.length > 0) {
                // Rule 5 triggered
                await thresholdEventsRepo.create({
                    company_id: risk.company_id,
                    house_id: risk.house_id,
                    pulse_id: newSignalsRes.rows[0].id,
                    rule_number: 5,
                    rule_name: 'Recurrence',
                    output_type: 'Control Failure',
                    description: 'Similar signals detected within 14 days of risk closure.'
                });

                // Do not rewrite the closed evidential chapter. The pattern/promotion flow creates
                // a new risk linked through previous_risk_id when the promotion floor is reached.

                // Notify RM and Director
                const usersRes = await query(`
                    SELECT u.id, u.role FROM users u
                    WHERE u.company_id = $1 AND u.status='active' AND (
                      u.role = 'DIRECTOR' OR (u.role = 'REGISTERED_MANAGER' AND EXISTS
                        (SELECT 1 FROM user_houses uh WHERE uh.user_id=u.id AND uh.house_id=$2)))
                `, [risk.company_id, risk.house_id]);

                for (const user of usersRes.rows) {
                    await notificationsService.create({
                        company_id: risk.company_id,
                        user_id: user.id,
                        type: 'CONTROL_FAILURE',
                        title: 'Control Failure: recurrence detected',
                        body: `New evidence matches the closed risk "${risk.title}". The closed chapter remains unchanged; review the emerging pattern for a linked new chapter.`
                    });
                }
            }
        }
    }, { connection: redisConnection });

    worker.on('completed', (job) => {
        logger.info(`Recurrence watch job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`Recurrence watch job ${job?.id} failed`, err);
    });

    return worker;
};
