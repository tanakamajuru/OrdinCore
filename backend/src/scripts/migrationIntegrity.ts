import { createHash } from 'crypto';

const VERSIONED_SQL = /^\d{3}[a-z]?_.+\.sql$/;

export function selectMigrationFiles(names: string[]): string[] {
  return names.filter((name) => VERSIONED_SQL.test(name)).sort();
}

export function migrationChecksum(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}
