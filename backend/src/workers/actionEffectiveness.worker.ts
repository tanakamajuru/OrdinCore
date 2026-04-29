import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { risksService } from '../services/risks.service';
import logger from '../utils/logger';

export const startActionEffectivenessWorker = () => {
    const worker = new Worker('action-effectiveness', async (job: Job) => {
        logger.info(`Running Action Effectiveness Measurement Job`);

        // Find actions completed 48-72 hours ago that haven't been measured
        const actionsRes = await query(`
            SELECT ra.*, r.house_id, COALESCE(r.category_id::text, 'General') as domain
            FROM risk_actions ra
            JOIN risks r ON ra.risk_id = r.id
            WHERE ra.status = 'Completed' 
            AND ra.effectiveness_measured_at IS NULL
            AND ra.completed_at <= NOW() - INTERVAL '48 hours'
            AND ra.completed_at >= NOW() - INTERVAL '72 hours'
        `);

        for (const action of actionsRes.rows) {
            try {
                await measureEffectiveness(action);
            } catch (err) {
                logger.error(`Failed to measure effectiveness for action ${action.id}`, err);
            }
        }
    }, { connection: redisConnection });

    worker.on('completed', (job) => {
        logger.info(`Action effectiveness job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`Action effectiveness job ${job?.id} failed`, err);
    });

    return worker;
};

async function measureEffectiveness(action: any) {
    const { id: action_id, risk_id, company_id, house_id, domain, completed_at } = action;

    // 1. Query signals BEFORE completion (7 days prior)
    const beforeStart = new Date(new Date(completed_at).getTime() - 7 * 24 * 60 * 60 * 1000);
    const signalsBeforeRes = await query(`
        SELECT id, severity FROM governance_pulses
        WHERE house_id = $1 AND company_id = $2
        AND entry_date >= $3 AND entry_date <= $4
        AND $5 = ANY(risk_domain)
    `, [house_id, company_id, beforeStart, completed_at, domain]);

    // 2. Query signals AFTER completion (from completion to now)
    const signalsAfterRes = await query(`
        SELECT id, severity FROM governance_pulses
        WHERE house_id = $1 AND company_id = $2
        AND entry_date > $3
        AND $4 = ANY(risk_domain)
    `, [house_id, company_id, completed_at, domain]);

    const countBefore = signalsBeforeRes.rows.length;
    const countAfter = signalsAfterRes.rows.length;
    
    const severityMap: Record<string, number> = { 'Low': 1, 'Moderate': 2, 'High': 3, 'Critical': 4 };
    const maxSeverityBefore = signalsBeforeRes.rows.reduce((max, s) => Math.max(max, severityMap[s.severity] || 1), 1);
    const maxSeverityAfter = signalsAfterRes.rows.reduce((max, s) => Math.max(max, severityMap[s.severity] || 1), 1);

    const severityBeforeLabel = Object.keys(severityMap).find(k => severityMap[k] === maxSeverityBefore) || 'Low';
    const severityAfterLabel = Object.keys(severityMap).find(k => severityMap[k] === maxSeverityAfter) || 'Low';

    // 3. Determine Outcome
    let outcome: 'Effective' | 'Neutral' | 'Ineffective' = 'Neutral';

    if (countAfter <= countBefore * 0.5 || maxSeverityAfter < maxSeverityBefore) {
        outcome = 'Effective';
    } else if (countAfter > countBefore * 1.25 || maxSeverityAfter > maxSeverityBefore || signalsAfterRes.rows.some(s => s.severity === 'Critical')) {
        outcome = 'Ineffective';
    }

    // 4. Store Result
    await query(`
        INSERT INTO action_effectiveness (
            action_id, risk_id, company_id, house_id, risk_domain, 
            outcome, signals_before_count, signals_after_count, 
            severity_before_max, severity_after_max, measurement_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `, [action_id, risk_id, company_id, house_id, domain, outcome, countBefore, countAfter, severityBeforeLabel, severityAfterLabel]);

    // 5. Mark action as measured
    await query(`UPDATE risk_actions SET effectiveness_measured_at = NOW() WHERE id = $1`, [action_id]);

    // 6. If ineffective, update risk trajectory (handled in service or here)
    if (outcome === 'Ineffective') {
        await risksService.updateTrajectoryFromActions(risk_id, company_id);
    }

    logger.info(`Action ${action_id} measured as ${outcome}`);
}
