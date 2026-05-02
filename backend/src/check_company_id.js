const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

async function check(table) {
    const client = new Client({
        host: process.env.DB_HOST, port: process.env.DB_PORT,
        database: process.env.DB_NAME, user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    try {
        await client.connect();
        const r = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = 'company_id'`);
        console.log(`${table}: ${r.rows.length > 0 ? 'HAS' : 'MISSING'} company_id`);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
const tables = ['governance_pulses', 'signal_clusters', 'risk_candidates', 'risks', 'incidents', 'escalations', 'director_interventions'];
(async () => {
    for (const t of tables) await check(t);
})();
