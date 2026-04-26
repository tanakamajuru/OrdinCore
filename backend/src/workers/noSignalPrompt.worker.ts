import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import logger from '../utils/logger';

export const startNoSignalPromptWorker = () => {
    const worker = new Worker('no-signal-prompt', async (job: Job) => {
        logger.info(`Running No-Signal Prompt Check`);
        
        // Query active risks with no linked signals for 10 days
        const risksRes = await query(`
            SELECT * FROM risks 
            WHERE status IN ('Open', 'Escalated') 
            AND (last_linked_signal_date < NOW() - INTERVAL '10 days' OR last_linked_signal_date IS NULL)
            AND created_at < NOW() - INTERVAL '10 days'
        `);

        for (const risk of risksRes.rows) {
            const rmRes = await query(`SELECT id FROM users WHERE assigned_house_id = $1 AND role = 'REGISTERED_MANAGER' LIMIT 1`, [risk.house_id]);
            const rm_id = rmRes.rows[0]?.id;

            if (rm_id) {
                await query(`
                    INSERT INTO system_prompts (company_id, user_id, title, message, prompt_type)
                    VALUES ($1, $2, $3, $4, $5)
                `, [risk.company_id, rm_id, 'No Recent Signals for Active Risk', `Risk "${risk.title}" has had no new signals in 10 days. Consider resolving or closing it if controls are effective.`, 'NO_SIGNAL_PROMPT']);

                await notificationsService.create({
                    company_id: risk.company_id,
                    user_id: rm_id,
                    type: 'NO_SIGNAL_PROMPT',
                    title: 'Risk Review Suggestion',
                    body: `Risk "${risk.title}" has no recent signals. Is it ready for closure?`
                });
            }
        }
    }, { connection: redisConnection });

    worker.on('completed', (job) => {
        logger.info(`No signal prompt job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`No signal prompt job ${job?.id} failed`, err);
    });

    return worker;
};
