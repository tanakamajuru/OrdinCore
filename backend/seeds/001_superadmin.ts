import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getPool } from '../src/config/database';
const pool = getPool();
import logger from '../src/utils/logger';

async function seed() {
  const client = await pool.connect();
  try {
    // Check if superadmin already exists
    const existing = await client.query(
      "SELECT id FROM users WHERE email = 'superadmin@caresignal.com'"
    );

    if (existing.rows.length > 0) {
      logger.info('Superadmin already exists, skipping seed.');
      return;
    }

    const passwordHash = await bcrypt.hash('admin123', 12);

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['superadmin@caresignal.com', passwordHash, 'Super', 'Admin', 'SUPER_ADMIN', 'active']
    );

    const userId = result.rows[0].id;

    // Create user profile
    await client.query(
      `INSERT INTO user_profiles (user_id, job_title, timezone)
       VALUES ($1, $2, $3)`,
      [userId, 'System Super Administrator', 'UTC']
    );

    await client.query('COMMIT');

    logger.info(`✅ Superadmin created: superadmin@caresignal.com / admin123`);
    logger.info(`   User ID: ${userId}`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Seed failed', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  logger.error('Seed script failed', err);
  process.exit(1);
});
