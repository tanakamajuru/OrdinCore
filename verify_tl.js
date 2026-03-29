const { query } = require('./backend/src/config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function verify() {
  try {
    console.log('--- Verifying TEAM_LEADER Role ---');
    
    // 1. Check role in database
    const roleRes = await query("SELECT * FROM roles WHERE name = 'TEAM_LEADER'");
    if (roleRes.rows.length === 0) {
      console.error('❌ TEAM_LEADER role not found in roles table');
      return;
    }
    console.log('✅ TEAM_LEADER role exists in roles table');

    // 2. Check if we can create a user with this role
    const email = `test_tl_${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash('password123', 12);
    
    const userRes = await query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [uuidv4(), email, passwordHash, 'Test', 'TL', 'TEAM_LEADER', 'active']
    );
    const userId = userRes.rows[0].id;
    console.log(`✅ Created test Team Leader: ${email}`);

    // 3. Assign to a house
    const houseRes = await query('SELECT id FROM houses LIMIT 1');
    if (houseRes.rows.length === 0) {
      console.log('⚠️ No houses found to test assignment');
    } else {
      const houseId = houseRes.rows[0].id;
      await query('UPDATE houses SET manager_id = $1 WHERE id = $2', [userId, houseId]);
      console.log(`✅ Assigned TL to house: ${houseId}`);
      
      // Update house settings for pulse days
      await query(
        `INSERT INTO house_settings (id, house_id, settings)
         VALUES ($1, $2, $3)
         ON CONFLICT (house_id) DO UPDATE SET settings = $3`,
        [uuidv4(), houseId, JSON.stringify({ pulse_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] })]
      );
      console.log('✅ Updated house settings with pulse days');
    }

    console.log('--- Verification Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

verify();
