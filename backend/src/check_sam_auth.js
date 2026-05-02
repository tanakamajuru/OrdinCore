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
        const samId = '11111111-1111-1111-1111-111111111102';
        const r = await client.query(`
            SELECT u.id, u.email, u.role, 
                   ARRAY_AGG(DISTINCT COALESCE(uh.house_id, h_direct.id)) FILTER (WHERE COALESCE(uh.house_id, h_direct.id) IS NOT NULL) AS house_ids 
            FROM users u 
            LEFT JOIN user_houses uh ON uh.user_id = u.id 
            LEFT JOIN houses h_direct ON h_direct.manager_id = u.id 
            WHERE u.id = $1 
            GROUP BY u.id
        `, [samId]);
        console.log('Result for Sam:');
        console.log(JSON.stringify(r.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
