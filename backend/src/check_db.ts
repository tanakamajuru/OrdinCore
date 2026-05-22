import * as dotenv from 'dotenv';
dotenv.config();
import { query } from './config/database';

async function main() {
  try {
    console.log('--- USERS ---');
    const users = await query('SELECT id, email, role, first_name, last_name FROM users');
    console.table(users.rows);

    console.log('--- USER HOUSES ---');
    const userHouses = await query('SELECT * FROM user_houses');
    console.table(userHouses.rows);

    console.log('--- HOUSES ---');
    const houses = await query('SELECT id, name FROM houses');
    console.table(houses.rows);

    console.log('--- ACTIONS ---');
    const actions = await query('SELECT id, title, assigned_to, status FROM actions');
    console.table(actions.rows);

  } catch (err) {
    console.error(err);
  }
}

main();
