import { query } from './src/config/database';
import { governanceService } from './src/services/governance.service';
import { usersRepo } from './src/repositories/users.repo';
import { housesRepo } from './src/repositories/houses.repo';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

async function verify() {
  try {
    console.log('--- START VERIFICATION ---');
    
    // 1. Setup Test Data
    const companyId = uuidv4();
    await query("INSERT INTO companies (id, name) VALUES ($1, 'Test Pulse Co')", [companyId]);
    
    const houseId = uuidv4();
    await query("INSERT INTO houses (id, company_id, name, status) VALUES ($1, $2, 'House 1', 'active')", [houseId, companyId]);
    
    const passwordHash = await bcrypt.hash('password123', 12);
    
    // RM User - Monday
    const rmId = uuidv4();
    await query(`
      INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, status, pulse_days)
      VALUES ($1, $2, 'rm@test.com', $3, 'RM', 'One', 'REGISTERED_MANAGER', 'active', $4)
    `, [rmId, companyId, passwordHash, JSON.stringify(['Monday'])]);
    
    // TL User - Tuesday
    const tlId = uuidv4();
    await query(`
      INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, status, pulse_days)
      VALUES ($1, $2, 'tl@test.com', $3, 'TL', 'One', 'TEAM_LEADER', 'active', $4)
    `, [tlId, companyId, passwordHash, JSON.stringify(['Tuesday'])]);
    
    // Assign both to house
    await query("INSERT INTO user_houses (id, user_id, house_id, company_id) VALUES ($1, $2, $3, $4)", [uuidv4(), rmId, houseId, companyId]);
    await query("INSERT INTO user_houses (id, user_id, house_id, company_id) VALUES ($1, $2, $3, $4)", [uuidv4(), tlId, houseId, companyId]);
    
    // 2. Generate Pulses
    console.log('Generating missing pulses...');
    await governanceService.generateMissingPulses(companyId);
    
    // 3. Verify
    const pulses = await query("SELECT * FROM governance_pulses WHERE company_id = $1 ORDER BY due_date ASC", [companyId]);
    console.log(`Generated ${pulses.rows.length} pulses.`);
    
    for (const p of pulses.rows) {
      const user = p.assigned_user_id === rmId ? 'RM' : (p.assigned_user_id === tlId ? 'TL' : 'Unknown');
      const date = new Date(p.due_date);
      const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
      console.log(`Pulse: ID=${p.id}, User=${user}, Day=${day}, Date=${p.due_date.toISOString().split('T')[0]}`);
    }
    
    const rmPulses = pulses.rows.filter(p => p.assigned_user_id === rmId);
    const tlPulses = pulses.rows.filter(p => p.assigned_user_id === tlId);
    
    let success = true;
    if (rmPulses.length === 0) { console.error('FAIL: No pulses generated for RM'); success = false; }
    if (tlPulses.length === 0) { console.error('FAIL: No pulses generated for TL'); success = false; }
    
    if (success) {
      console.log('--- VERIFICATION SUCCESSFUL! ---');
    } else {
      console.log('--- VERIFICATION FAILED! ---');
    }
    
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Verification error:', err);
    process.exit(1);
  }
}

verify();
