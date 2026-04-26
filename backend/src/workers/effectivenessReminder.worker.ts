import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import logger from '../utils/logger';

export const startEffectivenessReminderWorker = () => {
    const worker = new Worker('effectiveness-reminder', async (job: Job) => {
        logger.info(`Running Action Effectiveness Reminder check`);
        
        // Find risk_actions where status = 'Completed' and effectiveness IS NULL 
        // and completed_at <= NOW() - 48h AND completed_at >= NOW() - 72h
        const actionsRes = await query(`
            SELECT ra.id, ra.risk_id, ra.company_id, r.house_id
            FROM risk_actions ra
            JOIN risks r ON ra.risk_id = r.id
            WHERE ra.status = 'Completed' AND ra.effectiveness IS NULL
            AND ra.completed_at <= NOW() - INTERVAL '48 hours'
            AND ra.completed_at >= NOW() - INTERVAL '72 hours'
        `);

        for (const action of actionsRes.rows) {
            // Find RM for this house
            const rmRes = await query(`SELECT id FROM users WHERE assigned_house_id = $1 AND role = 'REGISTERED_MANAGER' LIMIT 1`, [action.house_id]);
            const rm_id = rmRes.rows[0]?.id;

            if (rm_id) {
                await notificationsService.create({
                    company_id: action.company_id,
                    user_id: rm_id,
                    type: 'ACTION_EFFECTIVENESS_DUE',
                    title: 'Action Effectiveness Rating Required',
                    body: `An action was completed 48 hours ago. Please rate its effectiveness to update the risk trajectory.`
                });

                await query(`
                    INSERT INTO system_prompts (company_id, user_id, title, message, prompt_type)
                    VALUES ($1, $2, $3, $4, $5)
                `, [action.company_id, rm_id, 'Action Effectiveness Required', 'Please review recently completed actions.', 'ACTION_EFFECTIVENESS']);
            }
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
