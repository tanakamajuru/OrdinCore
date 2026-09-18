import { splitSqlStatements, selectMigrationFiles } from '../migrationIntegrity';

describe('splitSqlStatements', () => {
  it('keeps a DO $$ ... $$ block with internal semicolons as one statement', () => {
    const sql = `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1) THEN
    ALTER TYPE t ADD VALUE 'x';
  END IF;
END $$;
CREATE TABLE a (id int);`;
    const parts = splitSqlStatements(sql);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain('DO $$');
    expect(parts[0]).toContain("ADD VALUE 'x'");
    expect(parts[1]).toBe('CREATE TABLE a (id int)');
  });

  it('does not split on a semicolon inside a single-quoted string', () => {
    const parts = splitSqlStatements(`INSERT INTO t(v) VALUES ('a;b'); SELECT 1;`);
    expect(parts).toEqual(["INSERT INTO t(v) VALUES ('a;b')", 'SELECT 1']);
  });

  it('ignores semicolons inside line and block comments', () => {
    const parts = splitSqlStatements(`-- a; comment\nSELECT 1; /* b; c */ SELECT 2;`);
    expect(parts).toEqual(['-- a; comment\nSELECT 1', '/* b; c */ SELECT 2']);
  });

  it('handles tagged dollar quotes', () => {
    const parts = splitSqlStatements(`SELECT $tag$x;y$tag$; SELECT 3;`);
    expect(parts).toEqual(['SELECT $tag$x;y$tag$', 'SELECT 3']);
  });
});

describe('selectMigrationFiles', () => {
  it('selects only versioned .sql files, sorted deterministically', () => {
    const out = selectMigrationFiles(['002_b.sql', '001_a.sql', 'repair_schema.sql', 'notes.md', '001a_x.sql']);
    expect(out).toEqual(['001_a.sql', '001a_x.sql', '002_b.sql']);
  });
});
