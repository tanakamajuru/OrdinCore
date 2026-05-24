import '../config/env';
import * as fs from 'fs';
import * as path from 'path';
import { getPool } from '../config/database';
import logger from '../utils/logger';

async function runMigrations() {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const isExecuted = await client.query(
        'SELECT id FROM _migrations WHERE filename = $1',
        [file]
      );

      if (isExecuted.rows.length > 0) {
        logger.info(`Migration already executed: ${file}`);
        continue;
      }

      const filepath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filepath, 'utf-8');

      // Check if migration alters an enum type using ADD VALUE.
      // If so, execute without a transaction block to prevent Postgres from throwing
      // "ALTER TYPE ... ADD VALUE cannot be executed inside a transaction block"
      // and allowing sequential statements in the file to auto-commit and see the new enum value.
      const useTransaction = !sql.includes('ALTER TYPE') || !sql.includes('ADD VALUE');

      if (useTransaction) {
        await client.query('BEGIN');
      }
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        if (useTransaction) {
          await client.query('COMMIT');
        }
        logger.info(`✅ Migration executed: ${file}`);
      } catch (err: any) {
        if (useTransaction) {
          await client.query('ROLLBACK');
        }
        logger.error(`❌ Migration failed: ${file} | Error: ${err.message}`, err);
        throw err;
      }
    }

    logger.info('All migrations completed!');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  logger.error('Migration runner failed', err);
  process.exit(1);
});
