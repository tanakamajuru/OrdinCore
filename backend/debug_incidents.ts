import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false,
});

async function check() {
  const client = await pool.connect();
  try {
    console.log('--- TABLE CONSTRAINTS ---');
    const constRes = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'incidents'::regclass
    `);
    console.log(JSON.stringify(constRes.rows, null, 2));

    console.log('--- RECENT INCIDENTS ---');
    const rowsRes = await client.query('SELECT id, title, status FROM incidents ORDER BY created_at DESC LIMIT 5');
    console.log(JSON.stringify(rowsRes.rows, null, 2));

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

check();
