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
        const r = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'director_interventions'");
        console.table(r.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
