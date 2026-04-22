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
    const res = await client.query(`
      SELECT pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'incidents'::regclass AND conname = 'incidents_status_check'
    `);
    console.log('CONSTRAINT DEFINITION:');
    console.log(res.rows[0]?.pg_get_constraintdef);
  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

check();
