const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'caresignal_db',
  user: 'postgres',
  password: 'Chemz@25',
});

async function verify() {
  try {
    console.log('Connecting to database...');
    const result = await pool.query('SELECT *, (first_name || \' \' || last_name) as name FROM users LIMIT 1');
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('User found in DB:', {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        name: user.name
      });
      if (user.name === `${user.first_name} ${user.last_name}`) {
        console.log('✅ Name concatenation in SQL is working!');
      } else {
        console.error('❌ Name concatenation in SQL failed:', user.name);
      }
    } else {
      console.log('No users found in database.');
    }
  } catch (err) {
    console.error('Database query failed:', err.message);
  } finally {
    await pool.end();
  }
}

verify();
