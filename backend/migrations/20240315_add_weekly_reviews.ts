
import { query } from '../src/config/database';

async function migrate() {
  try {
    console.log('Starting migration: weekly_reviews table');
    
    await query(`
      CREATE TABLE IF NOT EXISTS weekly_reviews (
        id UUID PRIMARY KEY,
        company_id UUID NOT NULL REFERENCES companies(id),
        house_id UUID NOT NULL REFERENCES houses(id),
        week_ending DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        content JSONB NOT NULL DEFAULT '{}',
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(house_id, week_ending)
      );
    `);

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
