import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import logger from '../utils/logger';
import { notificationsService } from '../services/notifications.service';

export const startRiAssuranceWorker = () => {
    const worker = new Worker('ri-assurance', async (job: Job) => {
        logger.info(`Running RI Assurance Jobs: ${job.name}`);

        try {
            if (job.name === 'osp-delta') {
                await calculateOspDelta();
            } else if (job.name === 'deputy-cover') {
                await updateDeputyCoverMetrics();
            } else if (job.name === 'unacknowledged-reminders') {
                await checkUnacknowledgedIncidents();
            } else if (job.name === 'heatmap-refresh') {
                await refreshHeatmap();
            }
        } catch (err) {
            logger.error(`RI Assurance job ${job.name} failed`, err);
            throw err;
        }
    }, { connection: redisConnection });

    worker.on('completed', (job) => {
        logger.info(`RI Assurance job ${job.name} completed`);
    });

    return worker;
};

async function calculateOspDelta() {
    // This logic is mostly consumed via the OSP ladder query in the service,
    // but we can pre-calculate or cache deltas here if needed.
    logger.info('OSP Delta check complete');
}

async function updateDeputyCoverMetrics() {
    // Check houses where substantive RM hasn't signed off in >24h
    const housesRes = await query(`SELECT id, name FROM houses WHERE is_active = true`);
    
    for (const house of housesRes.rows) {
        const lastPrimaryReview = await query(`
            SELECT review_date FROM daily_governance_log 
            WHERE house_id = $1 AND completed = true AND is_deputy_review = false
            ORDER BY review_date DESC LIMIT 1
        `, [house.id]);

        if (lastPrimaryReview.rows[0]) {
            const lastDate = new Date(lastPrimaryReview.rows[0].review_date);
            const diffHours = (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60);
            
            if (diffHours > 24) {
                // Currently in deputy cover (Primary RM absent)
                await query(`
                    UPDATE houses 
                    SET deputy_cover_total_seconds = deputy_cover_total_seconds + (6 * 3600),
                        deputy_cover_started_at = COALESCE(deputy_cover_started_at, NOW())
                    WHERE id = $1
                `, [house.id]);
            } else {
                // Substantive RM is active
                await query(`
                    UPDATE houses 
                    SET deputy_cover_started_at = NULL, 
                        deputy_cover_ended_at = NOW() 
                    WHERE id = $1
                `, [house.id]);
            }
        }
    }
    logger.info('Deputy cover metrics updated');
}

async function checkUnacknowledgedIncidents() {
    // Serious/Critical incidents > 48h without RI sign-off
    const overdue = await query(`
        SELECT i.*, h.name as house_name FROM incidents i
        JOIN houses h ON h.id = i.house_id
        LEFT JOIN ri_acknowledgements ra ON ra.incident_id = i.id
        WHERE i.severity IN ('serious', 'critical')
        AND i.created_at < NOW() - INTERVAL '48 hours'
        AND ra.id IS NULL
    `);

    for (const incident of overdue.rows) {
        // [INTEGRATION] Trigger high-severity notification/escalation to Director
        logger.warn(`STATUTORY ALERT: Incident ${incident.id} in ${incident.house_name} remains unacknowledged by RI for >48h.`);
        
        const directors = await query("SELECT id FROM users WHERE company_id = $1 AND role = 'DIRECTOR'", [incident.company_id]);
        for (const dir of directors.rows) {
            await notificationsService.create({
                company_id: incident.company_id,
                user_id: dir.id,
                type: 'statutory_alert',
                title: 'CRITICAL: Unacknowledged Incident Escalation',
                body: `Statutory incident "${incident.title}" at ${incident.house_name} has remained unacknowledged by the Responsible Individual for over 48 hours. Immediate Director intervention required.`,
                link: `/incidents/${incident.id}`
            });
            await notificationsService.sendSMS('DIRECTOR_PHONE', `CRITICAL GOVERNANCE ALERT: Incident at ${incident.house_name} overdue for RI sign-off > 48h.`);
        }
    }
}

async function refreshHeatmap() {
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY service_governance_compliance_mv');
    logger.info('Governance Heatmap refreshed');
}
