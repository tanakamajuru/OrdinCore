const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });
async function check() {
    const client = new Client({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
    try {
        await client.connect();
        const res = await client.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'governance_pulses' AND column_name IN ('risk_domain', 'signal_type', 'severity', 'has_happened_before', 'pattern_concern', 'escalation_required', 'review_status')");
        console.table(res.rows);
    } catch (err) { console.error(err); }
    finally { await client.end(); }
}
check();
