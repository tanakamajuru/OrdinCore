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
    console.log('Updating risks table defaults...');
    await pool.query("ALTER TABLE risks ALTER COLUMN severity SET DEFAULT 'Medium'");
    await pool.query("ALTER TABLE risks ALTER COLUMN status SET DEFAULT 'Open'");
    console.log('Success: Column defaults updated to Title Case.');
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
