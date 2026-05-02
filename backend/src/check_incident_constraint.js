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
        const r = await client.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'incidents_status_check'");
        console.log(r.rows[0].pg_get_constraintdef);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
