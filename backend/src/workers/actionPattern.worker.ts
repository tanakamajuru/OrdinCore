import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import logger from '../utils/logger';

export const startActionPatternWorker = () => {
    const worker = new Worker('action-effectiveness-pattern', async (job: Job) => {
        logger.info(`Running Action Effectiveness Pattern Detection Job`);

        try {
            await runRule11();
            await runRule12();
            await runRule13();
        } catch (err) {
            logger.error(`Failed to run action pattern detection`, err);
        }
    }, { connection: redisConnection });

    return worker;
};

// Rule 11 – Repeated ineffective actions
async function runRule11() {
    const res = await query(`
        WITH ineffective_actions AS (
            SELECT risk_id, company_id, house_id, COUNT(*) as cnt
            FROM (
                SELECT r.id as risk_id, r.company_id, r.house_id, ra.id as action_id
                FROM risk_actions ra
                JOIN risks r ON ra.risk_id = r.id
                WHERE ra.rm_decision = 'Negative impact'
                  AND ra.rm_decision_at > NOW() - INTERVAL '30 days'
            ) sub
            GROUP BY risk_id, company_id, house_id
        )
        SELECT * FROM ineffective_actions WHERE cnt >= 2;
    `);

    for (const row of res.rows) {
        await flagEffectiveness(row.risk_id, row.company_id, row.house_id, 'repeated_ineffective');
    }
}

// Rule 12 – Superficial closure
async function runRule12() {
    const res = await query(`
        SELECT ra.id as action_id, ra.risk_id, r.company_id, r.house_id
        FROM risk_actions ra
        JOIN risks r ON ra.risk_id = r.id
        WHERE ra.completion_outcome = 'No change'
          AND r.trajectory = 'Deteriorating'
          AND ra.completed_at < NOW() - INTERVAL '7 days'
          AND NOT EXISTS (
            SELECT 1 FROM risk_actions ra2 WHERE ra2.risk_id = ra.risk_id AND ra2.created_at > ra.completed_at
          )
    `);

    for (const row of res.rows) {
        await flagEffectiveness(row.risk_id, row.company_id, row.house_id, 'superficial_closure', row.action_id);
    }
}

// Rule 13 – Mismatched completion (premature closure)
async function runRule13() {
    const res = await query(`
        SELECT ra.id as action_id, ra.risk_id, r.company_id, r.house_id, r.category_id
        FROM risk_actions ra
        JOIN risks r ON ra.risk_id = r.id
        WHERE ra.completion_outcome = 'Risk reduced'
          AND EXISTS (
            SELECT 1 FROM governance_pulses p
            WHERE $1 = ANY(p.risk_domain)
              AND p.house_id = r.house_id
              AND p.entry_date > ra.completed_at
              AND p.entry_date <= ra.completed_at + INTERVAL '14 days'
              AND p.severity IN ('High', 'Critical')
          )
    `, ['Behaviour']); // This needs to be dynamic based on risk domain/category. For now using a placeholder or joining categories.
    // Optimization: Join with risk_categories to get the domain name
    
    const resDynamic = await query(`
        SELECT ra.id as action_id, ra.risk_id, r.company_id, r.house_id, rc.name as domain_name
        FROM risk_actions ra
        JOIN risks r ON ra.risk_id = r.id
        JOIN risk_categories rc ON r.category_id = rc.id
        WHERE ra.completion_outcome = 'Risk reduced'
          AND EXISTS (
            SELECT 1 FROM governance_pulses p
            WHERE rc.name = ANY(p.risk_domain)
              AND p.house_id = r.house_id
              AND p.entry_date > ra.completed_at
              AND p.entry_date <= ra.completed_at + INTERVAL '14 days'
              AND p.severity IN ('High', 'Critical')
          )
    `);

    for (const row of resDynamic.rows) {
        await flagEffectiveness(row.risk_id, row.company_id, row.house_id, 'mismatched_completion', row.action_id);
    }
}

async function flagEffectiveness(risk_id: string, company_id: string, house_id: string, flag_type: string, action_id?: string) {
    // Check if already flagged recently
    const existing = await query(
        `SELECT id FROM action_effectiveness_flags 
         WHERE risk_id = $1 AND flag_type = $2 AND detected_at > NOW() - INTERVAL '7 days'`,
        [risk_id, flag_type]
    );

    if (existing.rows.length === 0) {
        await query(
            `INSERT INTO action_effectiveness_flags (action_id, risk_id, service_id, flag_type)
             VALUES ($1, $2, $3, $4)`,
            [action_id || null, risk_id, house_id, flag_type]
        );

        // Also create a entry in control_failure_flags if it exists (for Director dashboard)
        try {
            await query(
                `INSERT INTO control_failure_flags (company_id, house_id, risk_id, flag_type, description)
                 VALUES ($1, $2, $3, $4, $5)`,
                [company_id, house_id, risk_id, 'Action Effectiveness Issue', `Pattern detected: ${flag_type}`]
            );
        } catch (e) {
            // Might not exist or have different schema
        }
    }
}
