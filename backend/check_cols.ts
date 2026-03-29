import { query } from './src/config/database';

async function check() {
  try {
    const resUsers = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    console.log('Users columns:', resUsers.rows);

    const resUH = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_houses';
    `);
    console.log('UserHouses columns:', resUH.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
