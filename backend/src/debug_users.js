const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

async function debugUsers() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        await client.connect();
        
        console.log('--- USERS ---');
        const res = await client.query('SELECT id, email, first_name, last_name, role FROM users');
        console.table(res.rows);

        console.log('\n--- HOUSES ---');
        const housesRes = await client.query('SELECT id, name FROM houses');
        console.table(housesRes.rows);

        console.log('\n--- USER HOUSES (Associations) ---');
        const associationsRes = await client.query(`
            SELECT uh.user_id, u.email, h.name as house_name, u.role
            FROM user_houses uh
            JOIN users u ON u.id = uh.user_id
            JOIN houses h ON h.id = uh.house_id
        `);
        console.table(associationsRes.rows);

        console.log('\n--- PULSE COUNTS ---');
        const pulseCountsRes = await client.query(`
            SELECT h.name as house_name, COUNT(gp.id) as pulse_count
            FROM governance_pulses gp
            JOIN houses h ON h.id = gp.house_id
            GROUP BY h.name
        `);
        console.table(pulseCountsRes.rows);

        console.log('\n--- GOVERNANCE_PULSES COLUMNS ---');
        const columnsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'governance_pulses'
        `);
        console.table(columnsRes.rows);

        console.log('\n--- ACTION_EFFECTIVENESS COLUMNS ---');
        const actionColumnsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'action_effectiveness'
        `);
        console.table(actionColumnsRes.rows);

        console.log('\n--- DAILY_GOVERNANCE_LOG COLUMNS ---');
        const govLogColsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'daily_governance_log'
        `);
        console.table(govLogColsRes.rows);

        console.log('\n--- SAM RIVERS HOUSES ---');
        const samRes = await client.query("SELECT id FROM users WHERE email = 'sam.rivers@ordincore.com'");
        if (samRes.rows[0]) {
            const samId = samRes.rows[0].id;
            const housesRes = await client.query('SELECT house_id FROM user_houses WHERE user_id = $1', [samId]);
            console.table(housesRes.rows);
        }

        console.log('\n--- SIGNAL CLUSTERS ---');
        const clustersRes = await client.query('SELECT * FROM signal_clusters');
        console.table(clustersRes.rows);

        console.log('\n--- RISK CANDIDATES ---');
        const candidatesRes = await client.query('SELECT * FROM risk_candidates');
        console.table(candidatesRes.rows);

    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

debugUsers();
