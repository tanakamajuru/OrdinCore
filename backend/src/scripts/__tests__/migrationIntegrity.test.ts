import { migrationChecksum, selectMigrationFiles } from '../migrationIntegrity';

describe('migration integrity', () => {
  it('deploys only versioned SQL and excludes operator repair scripts', () => {
    expect(selectMigrationFiles([
      'repair_schema.sql', '20240315_add_weekly_reviews.ts', '132_canonical_control_failures.sql',
      '006b_incident_events.sql', '001_initial.sql', 'notes.txt',
    ])).toEqual(['001_initial.sql', '006b_incident_events.sql', '132_canonical_control_failures.sql']);
  });

  it('produces a stable SHA-256 checksum and detects content changes', () => {
    expect(migrationChecksum('SELECT 1;')).toHaveLength(64);
    expect(migrationChecksum('SELECT 1;')).toBe(migrationChecksum('SELECT 1;'));
    expect(migrationChecksum('SELECT 1;')).not.toBe(migrationChecksum('SELECT 2;'));
  });
});
