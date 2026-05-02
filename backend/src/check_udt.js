const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

async function check() {
    const client = new Client({
        host: process.env.DB_HOST, port: process.env.DB_PORT,
        database: process.env.DB_NAME, user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    try {
        await client.connect();
        const r = await client.query("SELECT udt_name FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'calculated_outcome'");
        console.log(r.rows[0].udt_name);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
