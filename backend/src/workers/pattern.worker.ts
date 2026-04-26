import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import { thresholdEventsRepo } from '../repositories/thresholdEvents.repo';
import logger from '../utils/logger';

export const startPatternWorker = () => {
    const worker = new Worker('pattern-detection', async (job: Job) => {
        const { pulse_id, company_id, house_id, risk_domain } = job.data;
        logger.info(`Processing pattern detection for pulse ${pulse_id}`);

        // Handle multiple domains if risk_domain is an array
        const domains = Array.isArray(risk_domain) ? risk_domain : [risk_domain];
        for (const domain of domains) {
            await evaluateRules(company_id, house_id, domain, pulse_id);
        }
    }, { connection: redisConnection });

    worker.on('completed', (job) => {
        logger.info(`Pattern detection job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`Pattern detection job ${job?.id} failed`, err);
    });

    return worker;
};

async function evaluateRules(company_id: string, house_id: string, domain: string, pulse_id: string) {
    // 1. Fetch 14-day history for this domain + house
    const signals14dRes = await query(
        `SELECT gp.*, rsl.cluster_id 
         FROM governance_pulses gp
         LEFT JOIN risk_signal_links rsl ON gp.id = rsl.pulse_entry_id
         WHERE gp.company_id = $1 AND gp.house_id = $2 
         AND gp.created_at >= NOW() - INTERVAL '14 days'
         AND $3 = ANY(gp.risk_domain)
         ORDER BY gp.created_at DESC`,
        [company_id, house_id, domain]
    );
    const recentSignals = signals14dRes.rows;
    if (recentSignals.length === 0) return;

    // We need the current pulse object
    const currentPulse = recentSignals.find(s => s.id === pulse_id) || recentSignals[0];

    // Find active cluster or create one
    let clusterRes = await query(
        `SELECT * FROM signal_clusters 
         WHERE company_id = $1 AND house_id = $2 AND risk_domain = $3 
         AND cluster_status IN ('Emerging', 'Escalated')`,
        [company_id, house_id, domain]
    );

    let cluster_id;
    if (clusterRes.rows.length > 0) {
        cluster_id = clusterRes.rows[0].id;
    } else {
        const newClusterRes = await query(
            `INSERT INTO signal_clusters (company_id, house_id, risk_domain, cluster_label, cluster_status, signal_count, first_signal_date, last_signal_date, trajectory)
             VALUES ($1, $2, $3, $4, 'Emerging', 0, NOW(), NOW(), 'Stable') RETURNING id`,
            [company_id, house_id, domain, `${domain} Signals – ${house_id} (New)`]
        );
        cluster_id = newClusterRes.rows[0].id;
    }

    // Link the current pulse to the cluster if not already linked
    await query(
        `INSERT INTO risk_signal_links (cluster_id, pulse_entry_id, linked_by) 
         VALUES ($1, $2, (SELECT created_by FROM governance_pulses WHERE id = $2)) 
         ON CONFLICT DO NOTHING`,
        [cluster_id, pulse_id]
    );

    // Refresh cluster count
    const linkRes = await query(`SELECT COUNT(*) FROM risk_signal_links WHERE cluster_id = $1`, [cluster_id]);
    const signal_count = parseInt(linkRes.rows[0].count);

    // Base filters
    const signals7d = recentSignals.filter(s => new Date(s.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const signals10d = recentSignals.filter(s => new Date(s.created_at) >= new Date(Date.now() - 10 * 24 * 60 * 60 * 1000));
    const signals48h = recentSignals.filter(s => new Date(s.created_at) >= new Date(Date.now() - 48 * 60 * 60 * 1000));

    // Get RM user ID for notifications
    const rmRes = await query(`SELECT user_id as id FROM user_houses WHERE house_id = $1 AND role_in_house = 'REGISTERED_MANAGER' LIMIT 1`, [house_id]);
    const rm_id = rmRes.rows[0]?.id;

    // ==========================================
    // RULE EVALUATIONS
    // ==========================================

    let cluster_status = 'Emerging';
    let trajectory = 'Stable';

    // Rule 1: Repetition (>=3 in 7 days)
    if (signals7d.length >= 3) {
        await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 1, rule_name: 'Repetition', output_type: 'Signal Flag', description: '≥3 same-domain signals in 7 days' });
    }

    // Rule 2: Escalation (>=5 in 10 days OR >=2 escalating entries)
    const escalating = signals10d.filter(s => s.pattern_concern === 'Escalating');
    if (signals10d.length >= 5 || escalating.length >= 2) {
        cluster_status = 'Escalated';
        await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 2, rule_name: 'Escalation', output_type: 'Risk Review Required', description: '≥5 in 10 days OR ≥2 escalating entries' });
        if (rm_id) await notificationsService.create({ company_id, user_id: rm_id, type: 'PATTERN_ESCALATION', title: 'Pattern Escalated', body: `${domain} pattern requires review.` });
    }

    // Rule 3: Immediate (1 Critical OR 2 High in 48h)
    const criticals = signals48h.filter(s => s.severity === 'Critical');
    const highs = signals48h.filter(s => s.severity === 'High');
    if (criticals.length >= 1 || highs.length >= 2) {
        cluster_status = 'Escalated';
        await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 3, rule_name: 'Immediate Risk', output_type: 'Mandatory Review', description: 'Critical/High severity threshold met in 48h' });
        if (rm_id) await notificationsService.create({ company_id, user_id: rm_id, type: 'IMMEDIATE_RISK', title: 'Immediate Risk Detected', body: `Urgent review required for ${domain} pattern.` });
    }

    // Rule 4: Trajectory
    const hasLowerBefore = signals7d.some(s => s.id !== pulse_id && compareSeverity(s.severity, currentPulse.severity) < 0);
    if (hasLowerBefore && currentPulse.severity !== 'Low') {
        trajectory = 'Deteriorating';
        await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 4, rule_name: 'Trajectory Deterioration', output_type: 'Signal Flag', description: 'Severity progression within 7 days' });
        if (rm_id) await notificationsService.create({ company_id, user_id: rm_id, type: 'TRAJECTORY_WARNING', title: 'Trajectory Deteriorating', body: `${domain} severity is escalating.` });
    }

    // Rule 6: Behaviour (>=3 agitation signals in 7 days)
    if (domain === 'Behaviour') {
        if (signals7d.length >= 3) {
            await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 6, rule_name: 'Behaviour', output_type: 'Pattern flag', description: '≥3 behaviour signals in 7 days' });
        }
    }

    // Rule 7: Medication (>=2 medication errors in 7 days)
    if (domain === 'Medication') {
        if (signals7d.length >= 2) {
            await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 7, rule_name: 'Medication', output_type: 'Pattern flag', description: '≥2 medication errors in 7 days' });
        }
    }

    // Rule 8: Staffing (>=3 understaffed shifts in 7 days)
    if (domain === 'Staffing') {
        if (signals7d.length >= 3) {
            await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 8, rule_name: 'Staffing', output_type: 'Pattern flag', description: '≥3 staffing signals in 7 days' });
        }
    }

    // Rule 9: Environment (>=3 hazards in 7 days)
    if (domain === 'Environment') {
        if (signals7d.length >= 3) {
            await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 9, rule_name: 'Environment', output_type: 'Pattern flag', description: '≥3 environmental hazards in 7 days' });
        }
    }

    // Rule 10: Governance (>=2 missed reviews/audits)
    if (domain === 'Governance') {
        if (signals7d.length >= 2) {
            await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 10, rule_name: 'Governance', output_type: 'Pattern flag', description: '≥2 governance failure signals in 7 days' });
        }
    }

    // Cross-Service Rule: Same issue appears in >=2 services within 7 days
    const crossRes = await query(
        `SELECT COUNT(DISTINCT house_id) as count FROM signal_clusters 
         WHERE company_id = $1 AND risk_domain = $2 AND last_signal_date >= NOW() - INTERVAL '7 days'`,
        [company_id, domain]
    );
    if (parseInt(crossRes.rows[0].count) >= 2) {
        await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 0, rule_name: 'System-Level Risk', output_type: 'System-Level Risk flag', description: 'Pattern detected across multiple services' });
        const dirRes = await query(`SELECT id FROM users WHERE company_id = $1 AND role = 'DIRECTOR'`, [company_id]);
        for (const dir of dirRes.rows) {
            await notificationsService.create({ company_id, user_id: dir.id, type: 'SYSTEM_RISK', title: 'System-Level Risk', body: `${domain} issue appearing across multiple services.` });
        }
    }

    // Finalize Cluster Update
    await query(
        `UPDATE signal_clusters SET cluster_status = $1, trajectory = $2, signal_count = $3, last_signal_date = NOW(), cluster_label = $4
         WHERE id = $5`,
        [cluster_status, trajectory, signal_count, `${domain} Signals – ${signal_count} recent`, cluster_id]
    );
}

function compareSeverity(a: string, b: string): number {
    const levels: Record<string, number> = { 'Low': 1, 'Moderate': 2, 'High': 3, 'Critical': 4 };
    return (levels[a] || 1) - (levels[b] || 1);
}
