const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:Chemz%4025@localhost:5432/caresignal_db'
});

async function run() {
  try {
    console.log('Cleaning up potential partial states...');
    await pool.query('DROP TABLE IF EXISTS action_effectiveness CASCADE');
    await pool.query('DROP TABLE IF EXISTS risk_candidates CASCADE');
    
    console.log('Creating action_effectiveness...');
    await pool.query(`
      CREATE TABLE action_effectiveness (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action_id UUID NOT NULL REFERENCES risk_actions(id) ON DELETE CASCADE,
        risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
        risk_domain VARCHAR(50),
        outcome VARCHAR(20) NOT NULL,
        calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        data JSONB DEFAULT '{}'
      )
    `);

    console.log('Creating risk_candidates...');
    await pool.query(`
      CREATE TABLE risk_candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
        cluster_id UUID REFERENCES signal_clusters(id) ON DELETE CASCADE,
        risk_domain VARCHAR(50) NOT NULL,
        candidate_type VARCHAR(50) NOT NULL,
        source_signals UUID[] DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'New',
        dismissal_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('Updating weekly_reviews...');
    await pool.query('ALTER TABLE weekly_reviews ADD COLUMN IF NOT EXISTS governance_narrative TEXT');
    await pool.query('ALTER TABLE weekly_reviews ADD COLUMN IF NOT EXISTS overall_position VARCHAR(50)');

    console.log('Migration Part 2 successful');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

run();
