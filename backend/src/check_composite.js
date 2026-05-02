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
        const r = await client.query(`
            SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS type
            FROM pg_type t
            JOIN pg_attribute a ON a.attrelid = t.typrelid
            WHERE t.typname = 'action_effectiveness'
            ORDER BY a.attnum
        `);
        console.table(r.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
