import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { query } from './src/config/database';

async function check() {
  const res = await query("SELECT id, email, role FROM users LIMIT 20", []);
  console.log('Users:', JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

check().catch(console.error);
