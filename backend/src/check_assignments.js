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
        const res = await client.query(`
            SELECT u.email, u.role, h.name as house_name, h.id as house_id
            FROM user_houses uh 
            JOIN users u ON u.id = uh.user_id 
            JOIN houses h ON h.id = uh.house_id
            ORDER BY u.email
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
