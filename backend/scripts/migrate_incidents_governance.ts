import { query } from '../src/config/database';

async function migrate() {
  console.log('Starting migration to add missing incident fields...');
  try {
    await query(`
      ALTER TABLE incidents 
      ADD COLUMN IF NOT EXISTS la_referral TEXT,
      ADD COLUMN IF NOT EXISTS cqc_notification TEXT,
      ADD COLUMN IF NOT EXISTS police_reference TEXT,
      ADD COLUMN IF NOT EXISTS other_references TEXT,
      ADD COLUMN IF NOT EXISTS is_foreseeable TEXT,
      ADD COLUMN IF NOT EXISTS risk_factors TEXT,
      ADD COLUMN IF NOT EXISTS preventive_measures TEXT,
      ADD COLUMN IF NOT EXISTS leadership_commentary TEXT;
    `);
    console.log('Migration successful: Added governance fields to incidents table.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
