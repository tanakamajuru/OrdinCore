const { query } = require('../src/config/database');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runRule11() {
    console.log('Running Rule 11...');
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

async function flagEffectiveness(risk_id, company_id, house_id, flag_type, action_id) {
    const existing = await query(
        `SELECT id FROM action_effectiveness_flags 
         WHERE risk_id = $1 AND flag_type = $2 AND detected_at > NOW() - INTERVAL '7 days'`,
        [risk_id, flag_type]
    );

    if (existing.rows.length === 0) {
        console.log(`Flagging risk ${risk_id} with ${flag_type}`);
        await query(
            `INSERT INTO action_effectiveness_flags (action_id, risk_id, service_id, flag_type)
             VALUES ($1, $2, $3, $4)`,
            [action_id || null, risk_id, house_id, flag_type]
        );

        try {
            await query(
                `INSERT INTO control_failure_flags (company_id, house_id, risk_id, flag_type, description)
                 VALUES ($1, $2, $3, $4, $5)`,
                [company_id, house_id, risk_id, 'Action Effectiveness Issue', `Pattern detected: ${flag_type}`]
            );
        } catch (e) {
            console.log('control_failure_flags insert failed (expected if table not ready)', e.message);
        }
    } else {
        console.log(`Risk ${risk_id} already flagged with ${flag_type}`);
    }
}

async function main() {
    try {
        await runRule11();
        console.log('Done.');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

main();
