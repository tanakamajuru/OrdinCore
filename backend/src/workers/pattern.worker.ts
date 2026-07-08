import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import { thresholdEventsRepo } from '../repositories/thresholdEvents.repo';
import { runImmediateDetection } from './immediateDetection';
import { trajectoryForCluster, trajectoryForRisk } from '../services/trajectory.service';
import logger from '../utils/logger';

// Cross-service detection uses this rule slot (rules 8–10 are descoped for the pilot).
const CROSS_SERVICE_RULE_NUMBER = 11;

export const startPatternWorker = () => {
    const worker = new Worker('pattern-detection', async (job: Job) => {
        const { pulse_id, company_id, house_id, risk_domain } = job.data;
        logger.info(`Processing pattern detection for pulse ${pulse_id}`);

        // Handle multiple domains if risk_domain is an array
        const domains = Array.isArray(risk_domain) ? risk_domain : [risk_domain];
        for (const domain of domains) {
            await evaluateRules(company_id, house_id, domain, pulse_id, job.data.related_person);
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

async function evaluateRules(company_id: string, house_id: string, domain: string, pulse_id: string, related_person: string | null = null) {
    // [FAST PATH] Evaluate this pulse for immediate escalation (safeguarding 1/1,
    // single High/Critical — all config-driven) BEFORE any clustering. Harm-now
    // signals must never be diluted by the slow cumulative-pattern machinery.
    await runImmediateDetection(company_id, house_id, domain, pulse_id, related_person);

    // [ORDI CORE DOCTRINE] The primary "Pattern Emerging" threshold is data-driven:
    // it reads threshold_rules for THIS service's sector + domain, so admins can tune
    // it per sector without code changes. Falls back to the historical ≥3-in-7-days.
    const sectorRes = await query(`SELECT sector FROM houses WHERE id = $1 LIMIT 1`, [house_id]);
    const sector = sectorRes.rows[0]?.sector || 'SUPPORTED_LIVING';
    const thrRes = await query(
        `SELECT trigger_signal_count, window_days FROM threshold_rules
         WHERE sector = $1 AND domain_name = $2 AND is_active = true LIMIT 1`,
        [sector, domain]
    );
    const triggerCount: number = thrRes.rows[0]?.trigger_signal_count ?? 3;
    const windowDays: number = thrRes.rows[0]?.window_days ?? 7;
    // Memory window: at least 21 days (doctrine), widened if a rule's window is longer.
    const memoryDays = Math.max(21, windowDays);

    // Filter by domain and related_person to ensure targeted clustering
    const history21dRes = await query(
        `SELECT gp.*, rsl.cluster_id
         FROM governance_pulses gp
         LEFT JOIN risk_signal_links rsl ON gp.id = rsl.pulse_entry_id
         WHERE gp.company_id = $1 AND gp.house_id = $2
         AND gp.entry_date >= CURRENT_DATE - (INTERVAL '1 day' * $5)
         AND $3 = ANY(gp.risk_domain)
         AND (gp.related_person = $4 OR (gp.related_person IS NULL AND $4 IS NULL))
         AND (gp.review_status != 'Closed' OR gp.review_status IS NULL)
         ORDER BY gp.entry_date DESC, gp.entry_time DESC`,
        [company_id, house_id, domain, related_person, memoryDays]
    );
    const recentSignals = history21dRes.rows;
    if (recentSignals.length === 0) return;

    // Find active cluster or create one for this specific person (or general if null)
    let clusterRes = await query(
        `SELECT * FROM signal_clusters 
         WHERE company_id = $1 AND house_id = $2 AND risk_domain = $3 
         AND (linked_person = $4 OR (linked_person IS NULL AND $4 IS NULL))
         AND cluster_status IN ('Emerging', 'Escalated', 'Confirmed')`,
        [company_id, house_id, domain, related_person]
    );

    let cluster_id;
    if (clusterRes.rows.length > 0) {
        cluster_id = clusterRes.rows[0].id;
    } else {
        const houseNameRes = await query(`SELECT name FROM houses WHERE id = $1 LIMIT 1`, [house_id]);
        const houseName = houseNameRes.rows[0]?.name || house_id;
        const clusterLabel = related_person
            ? `${domain} Pattern for ${related_person} – ${houseName}`
            : `${domain} Signal Cluster – ${houseName}`;

        const newClusterRes = await query(
            `INSERT INTO signal_clusters (company_id, house_id, risk_domain, linked_person, cluster_label, cluster_status, signal_count, first_signal_date, last_signal_date, trajectory)
             VALUES ($1, $2, $3, $4, $5, 'Emerging', 0, NOW(), NOW(), 'Stable') RETURNING id`,
            [company_id, house_id, domain, related_person, clusterLabel]
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
    // Configurable window for the primary cluster threshold (from threshold_rules).
    const signalsWindow = recentSignals.filter(s => new Date(s.entry_date) >= new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000));
    const signals7d = recentSignals.filter(s => new Date(s.entry_date) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const signals10d = recentSignals.filter(s => new Date(s.entry_date) >= new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000));
    const signals48h = recentSignals.filter(s => new Date(s.entry_date) >= new Date(now.getTime() - 48 * 60 * 60 * 1000));

    // Get RM user ID for notifications
    const rmRes = await query(`SELECT COALESCE(primary_rm_id, manager_id) as id FROM houses WHERE id = $1 LIMIT 1`, [house_id]);
    const rm_id = rmRes.rows[0]?.id;

    let cluster_status = 'Emerging';
    let trajectory = 'Stable';

    // 1. Pattern Emerging: ≥{triggerCount} same-domain signals within {windowDays} days
    //    (both values come from threshold_rules for this service's sector + domain).
    if (signalsWindow.length >= triggerCount) {
        await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 1, rule_name: 'Pattern Emerging', output_type: 'Signal Flag', description: `≥${triggerCount} same-domain signals in ${windowDays} days` });
        await query(
            `INSERT INTO risk_candidates (company_id, house_id, cluster_id, risk_domain, candidate_type, source_signals, linked_person)
             VALUES ($1, $2, $3, $4, 'Pattern Emerging', $5, $6)
             ON CONFLICT (cluster_id) DO UPDATE SET status = 'New', updated_at = NOW(), candidate_type = EXCLUDED.candidate_type, source_signals = EXCLUDED.source_signals, linked_person = EXCLUDED.linked_person`,
            [company_id, house_id, cluster_id, domain, signalsWindow.map(s => s.id), related_person]
        );
    }

    // 1b. Person-Level Pattern Emerging: same Related Person + same domain reaching the
    //     configured threshold within the configured window (higher priority).
    if (related_person && signalsWindow.length >= triggerCount) {
        // Bump cluster priority above a plain system-level emerging pattern
        if (cluster_status === 'Emerging') cluster_status = 'Escalated';
        await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 6, rule_name: 'Person-Level Pattern Emerging', output_type: 'Risk Review Required', description: `≥${triggerCount} ${domain} signals for ${related_person} within ${windowDays} days` });
        await query(
            `INSERT INTO risk_candidates (company_id, house_id, cluster_id, risk_domain, candidate_type, source_signals, linked_person)
             VALUES ($1, $2, $3, $4, 'Person-Level Pattern Emerging', $5, $6)
             ON CONFLICT (cluster_id) DO UPDATE SET status = 'New', updated_at = NOW(), candidate_type = EXCLUDED.candidate_type, source_signals = EXCLUDED.source_signals, linked_person = EXCLUDED.linked_person`,
            [company_id, house_id, cluster_id, domain, signalsWindow.map(s => s.id), related_person]
        );
    }

    // 2. Risk Review Required: ≥5 signals in 10 days OR ≥2 Escalating flags
    const escalating = signals10d.filter(s => s.pattern_concern === 'Escalating');
    if (signals10d.length >= 5 || escalating.length >= 2) {
        cluster_status = 'Escalated';
        await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 2, rule_name: 'Risk Review Required', output_type: 'Risk Review Required', description: '≥5 in 10 days OR ≥2 escalating entries' });
        await query(
            `INSERT INTO risk_candidates (company_id, house_id, cluster_id, risk_domain, candidate_type, source_signals, linked_person)
             VALUES ($1, $2, $3, $4, 'Risk Review Required', $5, $6) 
             ON CONFLICT (cluster_id) DO UPDATE SET status = 'New', updated_at = NOW(), candidate_type = EXCLUDED.candidate_type, source_signals = EXCLUDED.source_signals, linked_person = EXCLUDED.linked_person`,
            [company_id, house_id, cluster_id, domain, signals10d.map(s => s.id), related_person]
        );
    }

    // 3. Immediate Risk Consideration: 1 Critical OR 2 High in 48h
    const criticals = signals48h.filter(s => s.severity === 'Critical');
    const highs = signals48h.filter(s => s.severity === 'High');
    if (criticals.length >= 1 || highs.length >= 2) {
        cluster_status = 'Escalated';
        await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 3, rule_name: 'Immediate Risk', output_type: 'Mandatory Review', description: 'Critical/High severity threshold met in 48h' });
        await query(
            `INSERT INTO risk_candidates (company_id, house_id, cluster_id, risk_domain, candidate_type, source_signals, linked_person)
             VALUES ($1, $2, $3, $4, 'Immediate Risk', $5, $6) 
             ON CONFLICT (cluster_id) DO UPDATE SET status = 'New', updated_at = NOW(), candidate_type = EXCLUDED.candidate_type, source_signals = EXCLUDED.source_signals, linked_person = EXCLUDED.linked_person`,
            [company_id, house_id, cluster_id, domain, signals48h.map(s => s.id), related_person]
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
            `INSERT INTO risk_candidates (company_id, house_id, cluster_id, risk_domain, candidate_type, source_signals, linked_person)
             VALUES ($1, $2, $3, $4, 'Deteriorating Trajectory', $5, $6) 
             ON CONFLICT (cluster_id) DO UPDATE SET status = 'New', updated_at = NOW(), candidate_type = EXCLUDED.candidate_type, source_signals = EXCLUDED.source_signals, linked_person = EXCLUDED.linked_person`,
            [company_id, house_id, cluster_id, domain, signals7d.map(s => s.id), related_person]
        );
    }

    // [SAFETY] Severity must drive trajectory (Bug B4 / root cause C3). A single
    // High/Critical signal — or ANY Safeguarding signal — can never read as "Stable"
    // on the Oversight/Patterns boards; that would lull a manager into thinking a live
    // concern is calm. This is independent of the Low→Moderate→High progression rule.
    const hasHighCritical = signalsWindow.some(s => s.severity === 'High' || s.severity === 'Critical')
        || criticals.length > 0 || highs.length > 0;
    if (domain === 'Safeguarding' || hasHighCritical) {
        trajectory = 'Deteriorating';
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
            await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 6.1, rule_name: 'Behaviour: Physical Aggression', output_type: 'Mandatory Review', description: 'Physical aggression signal detected' });
        }
    } else if (domain === 'Medication') {
        const errors = signals7d.filter(s => s.signal_type === 'Medication');
        if (errors.length >= 3) {
            cluster_status = 'Escalated';
            await thresholdEventsRepo.create({ company_id, house_id, pulse_id, cluster_id, rule_number: 7, rule_name: 'Medication: Risk Review', output_type: 'Risk Review Required', description: '≥3 medication signals in 7 days' });
        }
    }

    // 5. Control Failure (recurrence): Same domain reappears within 14 days of risk closure for the SAME PERSON
    const recentClosedRisks = await query(
        `SELECT id, resolved_at FROM risks
         WHERE house_id = $1 AND company_id = $2 AND LOWER(status) IN ('closed', 'resolved')
         AND (risk_domain = $3 OR category_id IN (SELECT id FROM risk_categories WHERE name = $3))
         AND resolved_at >= CURRENT_DATE - INTERVAL '14 days'
         AND (linked_person = $4 OR (linked_person IS NULL AND $4 IS NULL))
         LIMIT 1`,
        [house_id, company_id, domain, related_person]
    );

    if (recentClosedRisks.rows.length > 0) {
        await thresholdEventsRepo.create({ 
            company_id, house_id, pulse_id, cluster_id, 
            rule_number: 5, rule_name: 'Control Failure (Recurrence)',
            output_type: 'Control Failure',
            description: `Domain ${domain} reappeared within 14 days of risk closure (${recentClosedRisks.rows[0].id})${related_person ? ' for ' + related_person : ''}` 
        });
        await query(
            `INSERT INTO risk_candidates (company_id, house_id, cluster_id, risk_domain, candidate_type, source_signals, linked_person)
             VALUES ($1, $2, $3, $4, 'Control Failure (Recurrence)', $5, $6) 
             ON CONFLICT (cluster_id) DO UPDATE SET status = 'New', updated_at = NOW(), candidate_type = EXCLUDED.candidate_type, source_signals = EXCLUDED.source_signals, linked_person = EXCLUDED.linked_person`,
            [company_id, house_id, cluster_id, domain, [pulse_id], related_person]
        );
    }

    // SSOT (Finding K): store the ONE computed engine trajectory, not the local heuristic, so
    // every stored-column reader (Patterns list, risk candidates, oversight) matches the engine.
    // Keep the safety floor — a Safeguarding theme, or an in-window Critical, can never read
    // calmer than Deteriorating on the boards.
    let storedTrajectory = trajectory;
    try {
        const trc = await trajectoryForCluster(cluster_id);
        storedTrajectory = (domain === 'Safeguarding' || hasHighCritical) ? 'Deteriorating' : trc.direction;
    } catch (e) { logger.error('Cluster trajectory compute failed', e); }

    // Finalize Cluster Update
    await query(
        `UPDATE signal_clusters SET cluster_status = $1, trajectory = $2, signal_count = $3, last_signal_date = NOW()
         WHERE id = $4`,
        [cluster_status, storedTrajectory, signal_count, cluster_id]
    );

    // SSOT: if this cluster is already promoted to a risk, refresh that risk's cached
    // trajectory from the engine too — new signals change the series, and the register /
    // reports read the cache, so it must follow without waiting for the next effectiveness rating.
    try {
        const lr = await query(`SELECT linked_risk_id FROM signal_clusters WHERE id = $1`, [cluster_id]);
        const riskId = lr.rows[0]?.linked_risk_id;
        if (riskId) {
            const trr = await trajectoryForRisk(riskId, cluster_id);
            await query(`UPDATE risks SET trajectory = $1, updated_at = NOW() WHERE id = $2`, [trr.direction, riskId]);
        }
    } catch (e) { logger.error('Linked-risk trajectory refresh failed', e); }

    // FR3.5 / FR8.2 — Cross-service (System-Level) Risk, evaluated live in the sweep.
    await evaluateCrossServiceRisk(company_id, house_id, domain, pulse_id, cluster_id);
}

/**
 * Cross-service / System-Level Risk (FR3.5, FR8.2):
 * if the SAME domain (issue) appears in >=2 houses within 7 days, raise a
 * System-Level Risk Flag and notify Directors/RI in (near) real time — the sweep
 * runs every 15 minutes, well inside the "within 1 hour of detection" requirement.
 * De-duplicated: at most one flag per company+domain per rolling 7-day window.
 */
async function evaluateCrossServiceRisk(
    company_id: string,
    house_id: string,
    domain: string,
    pulse_id: string,
    cluster_id: string,
) {
    const affectedRes = await query(
        `SELECT COUNT(DISTINCT gp.house_id)::int AS house_count,
                ARRAY_AGG(DISTINCT h.name) AS house_names,
                ARRAY_AGG(DISTINCT gp.house_id) AS house_ids,
                COUNT(*)::int AS total_signals
           FROM governance_pulses gp
           JOIN houses h ON h.id = gp.house_id
          WHERE gp.company_id = $1
            AND $2 = ANY(gp.risk_domain)
            AND gp.entry_date >= CURRENT_DATE - INTERVAL '7 days'
            AND (gp.review_status != 'Closed' OR gp.review_status IS NULL)`,
        [company_id, domain]
    );
    const houseCount: number = affectedRes.rows[0]?.house_count ?? 0;

    // Finding D: maintain ONE persistent cross-service cluster per company+domain so the
    // systemic pattern is queryable on Patterns (the Director/RI lens), not just a flag.
    // Retire it if the domain no longer spans >=2 services.
    try {
        const houseIds: string[] = (affectedRes.rows[0]?.house_ids || []).filter(Boolean);
        const totalSignals: number = affectedRes.rows[0]?.total_signals ?? houseCount;
        const csLabel = `${domain} — systemic (${houseCount} services)`;
        const existingCs = await query(
            `SELECT id FROM signal_clusters WHERE company_id = $1 AND risk_domain = $2 AND scope = 'cross_service' LIMIT 1`,
            [company_id, domain]
        );
        if (houseCount >= 2) {
            if (existingCs.rows[0]) {
                await query(
                    `UPDATE signal_clusters SET affected_house_ids = $1, signal_count = $2, cluster_label = $3,
                            cluster_status = 'Emerging', last_signal_date = CURRENT_DATE WHERE id = $4`,
                    [houseIds, totalSignals, csLabel, existingCs.rows[0].id]
                );
            } else {
                await query(
                    `INSERT INTO signal_clusters (company_id, house_id, scope, risk_domain, linked_person, cluster_label, cluster_status, signal_count, affected_house_ids, first_signal_date, last_signal_date)
                     VALUES ($1, NULL, 'cross_service', $2, NULL, $3, 'Emerging', $4, $5, CURRENT_DATE, CURRENT_DATE)`,
                    [company_id, domain, csLabel, totalSignals, houseIds]
                );
            }
        } else if (existingCs.rows[0]) {
            await query(`UPDATE signal_clusters SET cluster_status = 'Dismissed' WHERE id = $1`, [existingCs.rows[0].id]);
        }
    } catch (e) { logger.error('Cross-service cluster upsert failed', e); }

    if (houseCount < 2) return;

    const houseNames: string[] = (affectedRes.rows[0]?.house_names || []).filter(Boolean);

    // De-dupe: skip if we already flagged this company+domain in the last 7 days.
    const existing = await query(
        `SELECT 1 FROM threshold_events
          WHERE company_id = $1
            AND rule_number = $2
            AND description ILIKE $3
            AND fired_at >= NOW() - INTERVAL '7 days'
          LIMIT 1`,
        [company_id, CROSS_SERVICE_RULE_NUMBER, `%[${domain}]%`]
    );
    if (existing.rows.length > 0) return;

    const description = `[${domain}] System-Level Risk: "${domain}" issues across ${houseCount} services in 7 days (${houseNames.join(', ')}).`;
    await thresholdEventsRepo.create({
        company_id,
        house_id,
        pulse_id,
        cluster_id,
        rule_number: CROSS_SERVICE_RULE_NUMBER,
        rule_name: 'System-Level Risk (Cross-Service)',
        output_type: 'System-Level Risk Flag',
        description,
    });

    // Notify Directors / Responsible Individuals so it surfaces within the SLA window.
    try {
        const directors = await query(
            `SELECT id FROM users
              WHERE company_id = $1 AND role IN ('DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'RI')`,
            [company_id]
        );
        for (const d of directors.rows) {
            await notificationsService.create({
                company_id,
                user_id: d.id,
                type: 'system_level_risk',
                title: 'System-Level Risk detected',
                body: description,
                link: '/patterns',
            });
        }
    } catch (err) {
        logger.error('Cross-service notification failed', err);
    }
}

if (process.env.RUN_ONCE === 'true') {
    logger.info('Starting pattern worker in RUN_ONCE mode (this will listen to jobs until manually stopped)...');
    startPatternWorker();
    setTimeout(() => {
        logger.info('Exiting pattern worker after 3 seconds for RUN_ONCE...');
        process.exit(0);
    }, 3000);
}
