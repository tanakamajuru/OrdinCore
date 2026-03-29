import { query } from './src/config/database';

async function migrate() {
  try {
    console.log('1. Adding pulse_days to users...');
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS pulse_days JSONB DEFAULT '[]'");
    
    console.log('2. Adding assigned_user_id to governance_pulses...');
    await query("ALTER TABLE governance_pulses ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL");
    
    console.log('3. Creating index...');
    await query("CREATE INDEX IF NOT EXISTS idx_governance_pulses_assigned_user_id ON governance_pulses(assigned_user_id)");
    
    console.log('4. Data migration (pulse_days)...');
    await query(`
      UPDATE users u
      SET pulse_days = hs.settings->'pulse_days'
      FROM houses h
      JOIN house_settings hs ON hs.house_id = h.id
      WHERE h.manager_id = u.id AND hs.settings ? 'pulse_days'
    `);
    
    console.log('5. Data migration (assigned_user_id)...');
    await query(`
      UPDATE governance_pulses gp
      SET assigned_user_id = h.manager_id
      FROM houses h
      WHERE h.id = gp.service_unit_id AND gp.assigned_user_id IS NULL
    `);

    console.log('Migration 015 successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration 015 failed:', err);
    process.exit(1);
  }
}

migrate();
