import { query } from './src/config/database';
import fs from 'fs';
import path from 'path';

async function migrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'migrations/015_per_user_pulse_days.sql'), 'utf8');
    console.log('Running migration 015...');
    await query(sql);
    console.log('Migration 015 successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration 015 failed:', err);
    process.exit(1);
  }
}

migrate();
