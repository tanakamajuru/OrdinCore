import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false,
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create/Find Company
    let companyId;
    const existingCompany = await client.query("SELECT id FROM companies WHERE name = 'Oakwood Care' LIMIT 1");
    if (existingCompany.rows.length > 0) {
      companyId = existingCompany.rows[0].id;
      console.log(`ℹ️  Company Oakwood Care already exists (${companyId})`);
    } else {
      const companyRes = await client.query("INSERT INTO companies (name, status) VALUES ('Oakwood Care', 'active') RETURNING id");
      companyId = companyRes.rows[0].id;
      console.log(`✅ Created Company: Oakwood Care (${companyId})`);
    }

    // 2. Create Site 1 (House)
    let houseId;
    const existingHouse = await client.query("SELECT id FROM houses WHERE name = 'Site 1' AND company_id = $1 LIMIT 1", [companyId]);
    if (existingHouse.rows.length > 0) {
      houseId = existingHouse.rows[0].id;
      console.log(`ℹ️  House Site 1 already exists (${houseId})`);
    } else {
      const houseRes = await client.query(
        `INSERT INTO houses (company_id, name, address, city, postcode, status, capacity)
         VALUES ($1, 'Site 1', 'Oakwood Drive', 'London', 'OK1 1AA', 'active', 10)
         RETURNING id`,
        [companyId]
      );
      houseId = houseRes.rows[0].id;
      console.log(`✅ Created House: Site 1 (${houseId})`);
    }

    const passwordHash = await bcrypt.hash('Pass123!', 10);

    const testUsers = [
      { name: 'Tanaka Majuru', email: 'admin@oakwoodcare.co.uk', role: 'ADMIN', days: [] },
      { name: 'Ngoni Majuru', email: 'tl2@oakwoodcare.co.uk', role: 'TEAM_LEADER', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
      { name: 'Gerald Majuru', email: 'dir@oakwoodcare.co.uk', role: 'DIRECTOR', days: [] },
      { name: 'Tashinga Majuru', email: 'ri@oakwoodcare.co.uk', role: 'RESPONSIBLE_INDIVIDUAL', days: [] },
      { name: 'Ronald Majuru', email: 'rm@oakwoodcare.co.uk', role: 'REGISTERED_MANAGER', days: ['Tue', 'Thu', 'Sat'] },
      { name: 'Tariro Majuru', email: 'tl@oakwoodcare.co.uk', role: 'TEAM_LEADER', days: ['Mon', 'Wed', 'Fri'] }
    ];

    for (const u of testUsers) {
      const [firstName, lastName] = u.name.split(' ');
      const userRes = await client.query(
        `INSERT INTO users (company_id, first_name, last_name, email, password_hash, role, status, pulse_days)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
         ON CONFLICT (email) DO UPDATE SET 
            role = EXCLUDED.role, 
            pulse_days = EXCLUDED.pulse_days,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name
         RETURNING id`,
        [companyId, firstName, lastName, u.email, passwordHash, u.role, JSON.stringify(u.days)]
      );
      const userId = userRes.rows[0].id;
      console.log(`✅ User: ${u.email} (${u.role})`);

      // Assign to Site 1 if not global role
      if (['TEAM_LEADER', 'REGISTERED_MANAGER'].includes(u.role)) {
        await client.query(
          `INSERT INTO user_houses (user_id, house_id, company_id, role_in_house)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, house_id) DO NOTHING`,
          [userId, houseId, companyId, u.role === 'REGISTERED_MANAGER' ? 'manager' : 'staff']
        );
        
        if (u.role === 'REGISTERED_MANAGER') {
          await client.query(`UPDATE houses SET manager_id = $1 WHERE id = $2`, [userId, houseId]);
        }
      }
    }

    await client.query('COMMIT');
    console.log('🚀 Seeding complete for Journey Verification');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
