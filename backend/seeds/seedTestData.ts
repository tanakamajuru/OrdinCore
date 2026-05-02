import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.TEST_DB_URL || 'postgresql://test:test@localhost:5432/ordincore_test'
});

export async function seedTestData() {
  console.log('🌱 Seeding test data for Ordin Core E2E tests...');
  
  try {
    await pool.query('BEGIN');

    // Create test company
    const companyId = '11111111-1111-1111-1111-111111111111';
    await pool.query(`
      INSERT INTO companies (id, name, created_at, updated_at)
      VALUES ($1, 'OrdinCore Test Company', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [companyId]);

    // Create test services
    const roseHouseId = '11111111-2222-3333-4444-555555555555';
    const lakeViewId = '22222222-3333-4444-5555-666666666666';
    
    await pool.query(`
      INSERT INTO services (id, company_id, name, type, created_at, updated_at)
      VALUES 
        ($1, $2, 'Rose House', 'residential', NOW(), NOW()),
        ($3, $2, 'Lake View', 'residential', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [roseHouseId, companyId, lakeViewId, companyId]);

    // Create test users with different roles
    const users = [
      {
        id: 'taylor-rose-uuid',
        email: 'taylor.rose@ordincore.com',
        firstName: 'Taylor',
        lastName: 'Rose',
        role: 'team_leader',
        serviceId: roseHouseId,
        password: 'admin123'
      },
      {
        id: 'sam-rivers-uuid',
        email: 'sam.rivers@ordincore.com',
        firstName: 'Sam',
        lastName: 'Rivers',
        role: 'registered_manager',
        serviceId: roseHouseId,
        password: 'admin123'
      },
      {
        id: 'chris-ordin-uuid',
        email: 'chris@ordincore.com',
        firstName: 'Chris',
        lastName: 'Ordin',
        role: 'responsible_individual',
        serviceId: null,
        password: 'admin123'
      },
      {
        id: 'pat-director-uuid',
        email: 'pat@ordincore.com',
        firstName: 'Pat',
        lastName: 'Director',
        role: 'director',
        serviceId: null,
        password: 'admin123'
      },
      {
        id: 'admin-uuid',
        email: 'admin@ordincore.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        serviceId: null,
        password: 'admin123'
      }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await pool.query(`
        INSERT INTO users (id, email, first_name, last_name, password_hash, role, service_id, company_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          updated_at = NOW()
      `, [user.id, user.email, user.firstName, user.lastName, hashedPassword, user.role, user.serviceId, companyId]);
    }

    // Create some initial test signals for pattern detection
    const signalData = [
      {
        id: uuidv4(),
        serviceId: roseHouseId,
        userId: users[0].id, // Team Leader
        entryDate: new Date('2026-04-25'),
        signalType: 'Incident',
        riskDomain: ['Behaviour'],
        description: 'Resident A showed aggressive behavior during lunch',
        severity: 'High',
        hasHappenedBefore: 'Yes',
        patternConcern: 'Clear'
      },
      {
        id: uuidv4(),
        serviceId: roseHouseId,
        userId: users[0].id,
        entryDate: new Date('2026-04-27'),
        signalType: 'Incident',
        riskDomain: ['Behaviour'],
        description: 'Resident A refused medication and became agitated',
        severity: 'High',
        hasHappenedBefore: 'Yes',
        patternConcern: 'Clear'
      },
      {
        id: uuidv4(),
        serviceId: roseHouseId,
        userId: users[0].id,
        entryDate: new Date('2026-04-29'),
        signalType: 'Incident',
        riskDomain: ['Behaviour'],
        description: 'Resident A shouted at staff members',
        severity: 'High',
        hasHappenedBefore: 'Yes',
        patternConcern: 'Clear'
      }
    ];

    for (const signal of signalData) {
      await pool.query(`
        INSERT INTO signals (id, service_id, user_id, entry_date, signal_type, risk_domain, description, severity, has_happened_before, pattern_concern, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [signal.id, signal.serviceId, signal.userId, signal.entryDate, signal.signalType, signal.riskDomain, signal.description, signal.severity, signal.hasHappenedBefore, signal.patternConcern]);
    }

    await pool.query('COMMIT');
    console.log('✅ Test data seeded successfully');
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedTestData().catch(console.error);
}
