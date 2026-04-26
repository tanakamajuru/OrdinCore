import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import { thresholdEventsRepo } from '../repositories/thresholdEvents.repo';
import logger from '../utils/logger';

export const startRecurrenceWatchWorker = () => {
    const worker = new Worker('recurrence-watch', async (job: Job) => {
        logger.info(`Running Recurrence Watch (Rule 5)`);
        
        // Find risks closed within the last 14 days
        const closedRisksRes = await query(`
            SELECT * FROM risks 
            WHERE status = 'Closed' AND closed_at >= NOW() - INTERVAL '14 days'
        `);

        for (const risk of closedRisksRes.rows) {
            // Check if any new pulse with same domain and house exists after closed_at
            const newSignalsRes = await query(`
                SELECT id FROM governance_pulses 
                WHERE company_id = $1 AND house_id = $2 
                AND completed_at > $3
                AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(categories) c WHERE c = $4)
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

                // Escalate severity
                let newSeverity = 'Medium';
                if (risk.severity === 'Low') newSeverity = 'Medium';
                else if (risk.severity === 'Medium') newSeverity = 'High';
                else if (risk.severity === 'High') newSeverity = 'Critical';

                await query(`
                    UPDATE risks SET status = 'Open', severity = $1, reopened_at = NOW()
                    WHERE id = $2
                `, [newSeverity, risk.id]);

                // Notify RM and Director
                const usersRes = await query(`
                    SELECT id, role FROM users 
                    WHERE company_id = $1 AND (role = 'DIRECTOR' OR (role = 'REGISTERED_MANAGER' AND assigned_house_id = $2))
                `, [risk.company_id, risk.house_id]);

                for (const user of usersRes.rows) {
                    await notificationsService.create({
                        company_id: risk.company_id,
                        user_id: user.id,
                        type: 'CONTROL_FAILURE',
                        title: 'Control Failure: Risk Reopened',
                        body: `Risk "${risk.title}" was reopened due to recurring signals.`
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
