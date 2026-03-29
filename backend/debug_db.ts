import { query } from './src/config/database';

async function debug() {
  try {
    const tables = ['users', 'houses', 'house_settings', 'governance_pulses', 'governance_templates'];
    for (const table of tables) {
      const res = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]);
      console.log(`Table ${table} columns:`, res.rows.map(r => r.column_name).join(', '));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
