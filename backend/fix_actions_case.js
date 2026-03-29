const { Pool } = require('pg');

const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'caresignal_db', 
  user: 'postgres', 
  password: 'Chemz@25' 
});

async function migrate() {
  try {
    console.log('Updating risk_actions table constraints and defaults...');
    
    // Drop old constraint
    await pool.query("ALTER TABLE risk_actions DROP CONSTRAINT IF EXISTS risk_actions_status_check");
    
    // Add new Title Case constraint
    await pool.query("ALTER TABLE risk_actions ADD CONSTRAINT risk_actions_status_check CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled', 'Ongoing'))");
    
    // Update default
    await pool.query("ALTER TABLE risk_actions ALTER COLUMN status SET DEFAULT 'Pending'");
    
    // Update existing data to Title Case
    await pool.query("UPDATE risk_actions SET status = 'Pending' WHERE status = 'pending'");
    await pool.query("UPDATE risk_actions SET status = 'In Progress' WHERE status = 'in_progress'");
    await pool.query("UPDATE risk_actions SET status = 'Completed' WHERE status = 'completed'");
    await pool.query("UPDATE risk_actions SET status = 'Cancelled' WHERE status = 'cancelled'");
    
    console.log('Success: risk_actions table aligned with Title Case.');
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
