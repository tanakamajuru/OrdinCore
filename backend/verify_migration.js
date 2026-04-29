const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:Chemz%4025@localhost:5432/caresignal_db'
});

async function check() {
  try {
    const tables = ['daily_governance_log', 'action_effectiveness', 'risk_candidates'];
    for (const table of tables) {
      const res = await pool.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}')`);
      console.log(`Table ${table} exists:`, res.rows[0].exists);
    }
    
    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'weekly_reviews' AND column_name IN ('governance_narrative', 'overall_position')");
    console.log('Weekly Review columns:', cols.rows.map(r => r.column_name).join(', '));
    
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await pool.end();
  }
}

check();
