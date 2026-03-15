// seed_tanaka.js - Seeds Tanaka Care house and users using the real schema
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'caresignal_db',
  user: 'postgres',
  password: 'Chemz@25',
  ssl: false,
});

async function seed() {
  const client = await pool.connect();
  try {
    // 1. Find Tanaka Care company
    const companyRes = await client.query(
      `SELECT id, name FROM companies WHERE name ILIKE 'Tanaka Care' LIMIT 1`
    );
    if (companyRes.rows.length === 0) {
      console.error('❌ Tanaka Care not found! Create it from the Super Admin dashboard first.');
      process.exit(1);
    }
    const company = companyRes.rows[0];
    console.log(`✅ Found company: ${company.name} (${company.id})`);

    // 2. Create house (schema: name, address, postcode, city, status, capacity)
    let houseId;
    const existHouse = await client.query(
      `SELECT id FROM houses WHERE name = 'Tanaka View' AND company_id = $1`, [company.id]
    );
    if (existHouse.rows.length > 0) {
      houseId = existHouse.rows[0].id;
      console.log(`ℹ️  House "Tanaka View" already exists (${houseId})`);
    } else {
      const houseRes = await client.query(
        `INSERT INTO houses (company_id, name, address, city, postcode, capacity, status)
         VALUES ($1, 'Tanaka View', '123 Care Lane, London', 'London', 'W1A 1AA', 20, 'active')
         RETURNING id`,
        [company.id]
      );
      houseId = houseRes.rows[0].id;
      console.log(`✅ Created house: Tanaka View (${houseId})`);
    }

    // 3. Create users (schema: uses 'status' not 'is_active', no house_id directly)
    const users = [
      { first_name: 'Sarah',  last_name: 'Jones',  email: 'ri@tanakacare.co.uk',        password: 'Pass123!', role: 'RESPONSIBLE_INDIVIDUAL', assignHouse: false },
      { first_name: 'Mike',   last_name: 'Brown',   email: 'rm@tanakacare.co.uk',        password: 'Pass123!', role: 'REGISTERED_MANAGER',      assignHouse: true  },
      { first_name: 'Claire', last_name: 'Lee',     email: 'director@tanakacare.co.uk',  password: 'Pass123!', role: 'DIRECTOR',                 assignHouse: false },
    ];

    for (const u of users) {
      const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [u.email]);
      let userId;
      if (existing.rows.length > 0) {
        userId = existing.rows[0].id;
        console.log(`ℹ️  User ${u.email} already exists — skipping creation`);
      } else {
        const hash = bcrypt.hashSync(u.password, 10);
        const res = await client.query(
          `INSERT INTO users (company_id, first_name, last_name, email, password_hash, role, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'active')
           RETURNING id`,
          [company.id, u.first_name, u.last_name, u.email, hash, u.role]
        );
        userId = res.rows[0].id;
        console.log(`✅ Created user: ${u.email} (${u.role})`);
      }

      // Assign Registered Manager to the house via user_houses table
      if (u.assignHouse && houseId) {
        const alreadyAssigned = await client.query(
          `SELECT id FROM user_houses WHERE user_id = $1 AND house_id = $2`, [userId, houseId]
        );
        if (alreadyAssigned.rows.length === 0) {
          await client.query(
            `INSERT INTO user_houses (user_id, house_id, company_id, role_in_house)
             VALUES ($1, $2, $3, 'manager')`,
            [userId, houseId, company.id]
          );
          // Also set house manager_id
          await client.query(
            `UPDATE houses SET manager_id = $1 WHERE id = $2`, [userId, houseId]
          );
          console.log(`✅ Assigned ${u.email} as house manager of Tanaka View`);
        }
      }
    }

    console.log('\n🎉 All done! Test these logins at http://localhost:5173/login:');
    console.log('   Responsible Individual: ri@tanakacare.co.uk / Pass123!');
    console.log('   Registered Manager:     rm@tanakacare.co.uk / Pass123!');
    console.log('   Director:               director@tanakacare.co.uk / Pass123!');
    console.log('   Company Admin:          admin@tanakacare.co.uk / Admin123!');
  } finally {
    client.release();
    pool.end();
  }
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
