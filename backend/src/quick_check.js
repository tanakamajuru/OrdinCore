const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

async function check() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    try {
        await client.connect();

        // 1. Sam's houses
        const samHouses = await client.query(`
            SELECT u.email, h.name, h.id as house_id 
            FROM user_houses uh 
            JOIN users u ON u.id = uh.user_id 
            JOIN houses h ON h.id = uh.house_id 
            WHERE u.email = 'sam.rivers@ordincore.com'
        `);
        console.log('\n--- SAM RIVERS HOUSES ---');
        console.table(samHouses.rows);

        // 2. All houses
        const allHouses = await client.query(`SELECT id, name, company_id FROM houses`);
        console.log('\n--- ALL HOUSES ---');
        console.table(allHouses.rows);

        // 3. Risk candidates with status 'New' for this company
        const candidates = await client.query(`SELECT id, house_id, risk_domain, candidate_type, status FROM risk_candidates WHERE status = 'New' LIMIT 10`);
        console.log('\n--- RISK CANDIDATES (New) ---');
        console.table(candidates.rows);

        // 4. Signal clusters
        const clusters = await client.query(`SELECT id, house_id, risk_domain, cluster_status, signal_count FROM signal_clusters LIMIT 10`);
        console.log('\n--- SIGNAL CLUSTERS ---');
        console.table(clusters.rows);

        // 5. Daily governance log columns
        const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_governance_log' ORDER BY ordinal_position`);
        console.log('\n--- DAILY_GOVERNANCE_LOG COLUMNS ---');
        console.log(cols.rows.map(r => r.column_name).join(', '));

        // 6. Test the open log flow
        const roseHouseId = samHouses.rows[0]?.house_id;
        if (roseHouseId) {
            const today = new Date().toISOString().split('T')[0];
            const existing = await client.query(
                'SELECT * FROM daily_governance_log WHERE house_id = $1 AND review_date = $2',
                [roseHouseId, today]
            );
            console.log('\n--- TODAY LOG FOR ROSE HOUSE ---');
            console.log('Exists:', existing.rows.length > 0);
            if (existing.rows[0]) console.log('Log:', existing.rows[0]);
        }

    } catch (err) {
        console.error('Error', err);
    } finally {
        await client.end();
    }
}
check();
