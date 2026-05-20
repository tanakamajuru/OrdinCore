import * as dotenv from 'dotenv';
dotenv.config();
import { query } from './src/config/database';
async function run() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS service_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        display_name VARCHAR(200) GENERATED ALWAYS AS (LEFT(first_name, 1) || ' ' || last_name) STORED,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('table created');
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
run();
