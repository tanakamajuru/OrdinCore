import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { query } from './src/config/database';

async function check() {
  const res = await query("SELECT id, email, role, assigned_house_id FROM users WHERE email = 'kuda@beamoflight.org.uk'", []);
  console.log('User:', JSON.stringify(res.rows[0], null, 2));
  
  if (res.rows[0]) {
    const houses = await query("SELECT uh.house_id, h.name FROM user_houses uh JOIN houses h ON h.id = uh.house_id WHERE uh.user_id = $1", [res.rows[0].id]);
    console.log('Assigned Houses:', JSON.stringify(houses.rows, null, 2));
  }
  process.exit(0);
}

check().catch(console.error);
