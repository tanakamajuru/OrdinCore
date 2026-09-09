import '../config/env';
import * as fs from 'fs';
import * as path from 'path';
import { getPool } from '../config/database';
import logger from '../utils/logger';
import { migrationChecksum, selectMigrationFiles } from './migrationIntegrity';

async function runMigrations() {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64)
      )
    `);
    await client.query(`ALTER TABLE _migrations ADD COLUMN IF NOT EXISTS checksum VARCHAR(64)`);

    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    // Only immutable, versioned migrations are deployable. repair_schema*.sql are operator
    // utilities and previously ran accidentally in lexical order on clean environments.
    const files = selectMigrationFiles(fs.readdirSync(migrationsDir));

    for (const file of files) {
      const filepath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filepath, 'utf-8');
      const checksum = migrationChecksum(sql);
      // Several historical files include their own outer BEGIN/COMMIT. The runner owns the
      // transaction boundary, so remove only those standalone wrapper lines; nested BEGIN would
      // otherwise commit before the tracking row is written.
      const transactionalSql = sql
        .replace(/(^|\n)\s*BEGIN;\s*(?=\n)/i, '$1')
        .replace(/(^|\n)\s*COMMIT;\s*$/i, '$1');
      const isExecuted = await client.query(
        'SELECT id, checksum FROM _migrations WHERE filename = $1', [file]
      );

      if (isExecuted.rows.length > 0) {
        const prior = isExecuted.rows[0].checksum;
        if (prior && prior !== checksum) {
          throw new Error(`Applied migration was modified: ${file}. Restore it and create a new migration.`);
        }
        if (!prior) await client.query('UPDATE _migrations SET checksum=$1 WHERE filename=$2', [checksum, file]);
        logger.info(`Migration already executed: ${file}`);
        continue;
      }

      // Run non-transactionally when the migration adds an enum value: `ALTER TYPE …
      // ADD VALUE` cannot run inside a transaction block on older Postgres. Detected by
      // content so any such migration is handled, not just a hardcoded filename (044).
      const addsEnumValue = /ALTER\s+TYPE[\s\S]*ADD\s+VALUE/i.test(sql);
      const useTransaction = !file.includes('044_ordin_core_alignment_v2.sql') && !addsEnumValue;

      if (useTransaction) {
        await client.query('BEGIN');
        try {
          await client.query(transactionalSql);
          await client.query('INSERT INTO _migrations (filename, checksum) VALUES ($1,$2)', [file, checksum]);
          await client.query('COMMIT');
          logger.info(`✅ Migration executed: ${file}`);
        } catch (err: any) {
          await client.query('ROLLBACK');
          logger.error(`❌ Migration failed: ${file} | Error: ${err.message}`, err);
          throw err;
        }
      } else {
        logger.info(`Running non-transactional migration: ${file}`);
        try {
          // Split by semicolon, filter out empty statements, and execute each sequentially
          const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

          for (const stmt of statements) {
            await client.query(stmt);
          }
          await client.query('INSERT INTO _migrations (filename, checksum) VALUES ($1,$2)', [file, checksum]);
          logger.info(`✅ Non-transactional migration executed: ${file}`);
        } catch (err: any) {
          logger.error(`❌ Non-transactional migration failed: ${file} | Error: ${err.message}`, err);
          throw err;
        }
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
