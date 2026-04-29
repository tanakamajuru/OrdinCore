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
    // [ORDI CORE DOCTRINE] 21-day rolling window for signal memory and reactivation
    const history21dRes = await query(
        `SELECT gp.*, rsl.cluster_id 
         FROM governance_pulses gp
         LEFT JOIN risk_signal_links rsl ON gp.id = rsl.pulse_entry_id
         WHERE gp.company_id = $1 AND gp.house_id = $2 
         AND gp.entry_date >= CURRENT_DATE - INTERVAL '21 days'
         AND $3 = ANY(gp.risk_domain)
         ORDER BY gp.entry_date DESC, gp.entry_time DESC`,
        [company_id, house_id, domain]
    );
    const recentSignals = history21dRes.rows;
    if (recentSignals.length === 0) return;

    // Find active cluster or create one
    let clusterRes = await query(
        `SELECT * FROM signal_clusters 
         WHERE company_id = $1 AND house_id = $2 AND risk_domain = $3 
         AND cluster_status IN ('Emerging', 'Escalated', 'Confirmed')`,
        [company_id, house_id, domain]
    );

    let cluster_id;
    if (clusterRes.rows.length > 0) {
        cluster_id = clusterRes.rows[0].id;
    } else {
        const newClusterRes = await query(
            `INSERT INTO signal_clusters (company_id, house_id, risk_domain, cluster_label, cluster_status, signal_count, first_signal_date, last_signal_date, trajectory)
             VALUES ($1, $2, $3, $4, 'Emerging', 0, NOW(), NOW(), 'Stable') RETURNING id`,
            [company_id, house_id, domain, `${domain} Signal Cluster – ${house_id}`]
        );
        cluster_id = newClusterRes.rows[0].id;
    }

    // Link the current pulse to the cluster
    await query(
        `INSERT INTO risk_signal_links (cluster_id, pulse_entry_id, linked_by) 
         SELECT $1, $2, created_by FROM governance_pulses WHERE id = $2
         ON CONFLICT DO NOTHING`,
        [cluster_id, pulse_id]
    );

    // Refresh cluster count
    const linkRes = await query(`SELECT COUNT(*) FROM risk_signal_links WHERE cluster_id = $1`, [cluster_id]);
    const signal_count = parseInt(linkRes.rows[0].count);

    // Timing Filters
    const now = new Date();
    const signals7d = recentSignals.filter(s => new Date(s.entry_date) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const signals10d = recentSignals.filter(s => new Date(s.entry_date) >= new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000));
    const signals48h = recentSignals.filter(s => new Date(s.entry_date) >= new Date(now.getTime() - 48 * 60 * 60 * 1000));

    // Get RM user ID for notifications
    const rmRes = await query(`SELECT manager_id as id FROM houses WHERE id = $1 LIMIT 1`, [house_id]);
    const rm_id = rmRes.rows[0]?.id;

    let cluster_status = 'Emerging';
    let trajectory = 'Stable';

    // 1. Pattern Emerging: ≥3 same-domain signals within 7 days
    if (signals7d.length >= 3) {
        await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 1, rule_name: 'Pattern Emerging', output_type: 'Signal Flag', description: '≥3 same-domain signals in 7 days' });
        await query(
            `INSERT INTO risk_candidates (company_id, house_id, cluster_id, risk_domain, candidate_type, source_signals)
             VALUES ($1, $2, $3, $4, 'Pattern Emerging', $5) ON CONFLICT DO NOTHING`,
            [company_id, house_id, cluster_id, domain, 'Pattern Emerging', signals7d.map(s => s.id)]
        );
    }

    // 2. Risk Review Required: ≥5 signals in 10 days OR ≥2 Escalating flags
    const escalating = signals10d.filter(s => s.pattern_concern === 'Escalating');
    if (signals10d.length >= 5 || escalating.length >= 2) {
        cluster_status = 'Escalated';
        await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 2, rule_name: 'Risk Review Required', output_type: 'Risk Review Required', description: '≥5 in 10 days OR ≥2 escalating entries' });
        await query(
            `INSERT INTO risk_candidates (company_id, house_id, cluster_id, risk_domain, candidate_type, source_signals)
             VALUES ($1, $2, $3, $4, 'Risk Review Required', $5) ON CONFLICT DO NOTHING`,
            [company_id, house_id, cluster_id, domain, 'Risk Review Required', signals10d.map(s => s.id)]
        );
    }

    // 3. Immediate Risk Consideration: 1 Critical OR 2 High in 48h
    const criticals = signals48h.filter(s => s.severity === 'Critical');
    const highs = signals48h.filter(s => s.severity === 'High');
    if (criticals.length >= 1 || highs.length >= 2) {
        cluster_status = 'Escalated';
        await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 3, rule_name: 'Immediate Risk', output_type: 'Immediate Alert', description: 'Critical/High severity threshold met in 48h' });
        await query(
            `INSERT INTO risk_candidates (company_id, house_id, cluster_id, risk_domain, candidate_type, source_signals)
             VALUES ($1, $2, $3, $4, 'Immediate Risk', $5) ON CONFLICT DO NOTHING`,
            [company_id, house_id, cluster_id, domain, 'Immediate Risk', signals48h.map(s => s.id)]
        );
    }

    // 4. Deteriorating Trajectory: Severity progression Low→Moderate→High within 7 days
    const hasLow = signals7d.some(s => s.severity === 'Low');
    const hasMod = signals7d.some(s => s.severity === 'Moderate');
    const hasHigh = signals7d.some(s => s.severity === 'High');
    if (hasLow && hasMod && hasHigh) {
        trajectory = 'Deteriorating';
        await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 4, rule_name: 'Deteriorating Trajectory', output_type: 'Signal Flag', description: 'Severity progression Low→Moderate→High within 7 days' });
        await query(
            `INSERT INTO risk_candidates (company_id, house_id, cluster_id, risk_domain, candidate_type, source_signals)
             VALUES ($1, $2, $3, $4, 'Deteriorating Trajectory', $5) ON CONFLICT DO NOTHING`,
            [company_id, house_id, cluster_id, domain, 'Deteriorating Trajectory', signals7d.map(s => s.id)]
        );
    }

    // Reactivation Check (21-day rolling)
    if (recentSignals.length >= 3) {
        await query(
            `UPDATE signal_clusters SET cluster_status = 'Confirmed' WHERE id = $1 AND cluster_status = 'Emerging'`,
            [cluster_id]
        );
    }

    // Domain-Specific Thresholds
    if (domain === 'Behaviour') {
        const aggression = signals7d.filter(s => s.description.toLowerCase().includes('aggression') || s.description.toLowerCase().includes('agitation'));
        if (aggression.length >= 1 && (aggression[0].severity === 'High' || aggression[0].severity === 'Critical')) {
            await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 6.1, rule_name: 'Behaviour: Physical Aggression', output_type: 'Immediate Risk', description: 'Physical aggression signal detected' });
        }
    } else if (domain === 'Medication') {
        const errors = signals7d.filter(s => s.signal_type === 'Medication');
        if (errors.length >= 3) {
            cluster_status = 'Escalated';
            await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 7, rule_name: 'Medication: Risk Review', output_type: 'Risk Review Required', description: '≥3 medication signals in 7 days' });
        }
    }

    // 5. Control Failure (recurrence): Same domain reappears within 14 days of risk closure
    const recentClosedRisks = await query(
        `SELECT id, resolved_at FROM risks 
         WHERE house_id = $1 AND company_id = $2 AND status = 'Closed'
         AND category_id IN (SELECT id FROM risk_categories WHERE name = $3)
         AND resolved_at >= CURRENT_DATE - INTERVAL '14 days'
         LIMIT 1`,
        [house_id, company_id, domain]
    );

    if (recentClosedRisks.rows.length > 0) {
        await thresholdEventsRepo.create({ 
            company_id, house_id, pulse_id, cluster_id, 
            rule_number: 5, rule_name: 'Control Failure (Recurrence)', 
            output_type: 'Immediate Risk', 
            description: `Domain ${domain} reappeared within 14 days of risk closure (${recentClosedRisks.rows[0].id})` 
        });
        await query(
            `INSERT INTO risk_candidates (company_id, house_id, cluster_id, risk_domain, candidate_type, source_signals)
             VALUES ($1, $2, $3, $4, 'Control Failure (Recurrence)', $5) ON CONFLICT DO NOTHING`,
            [company_id, house_id, cluster_id, domain, 'Control Failure (Recurrence)', [pulse_id]]
        );
    }

    // Finalize Cluster Update
    await query(
        `UPDATE signal_clusters SET cluster_status = $1, trajectory = $2, signal_count = $3, last_signal_date = NOW()
         WHERE id = $4`,
        [cluster_status, trajectory, signal_count, cluster_id]
    );
}

function compareSeverity(a: string, b: string): number {
    const levels: Record<string, number> = { 'Low': 1, 'Moderate': 2, 'High': 3, 'Critical': 4 };
    return (levels[a] || 1) - (levels[b] || 1);
}
