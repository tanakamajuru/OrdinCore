import { createHash } from 'crypto';

const VERSIONED_SQL = /^\d{3}[a-z]?_.+\.sql$/;

export function selectMigrationFiles(names: string[]): string[] {
  return names.filter((name) => VERSIONED_SQL.test(name)).sort();
}

export function migrationChecksum(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

/**
 * Split a SQL script into top-level statements, respecting dollar-quoted blocks ($$ / $tag$),
 * single-quoted string literals, and -- / block comments. A naive sql.split(';') shreds any
 * DO $$ ... ; ... $$ block or function body at its internal semicolons, producing "unterminated
 * dollar-quoted string" errors — which is exactly what broke migration 035 on a clean build.
 * Only semicolons at the top level (outside any quote/comment/dollar block) terminate a statement.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Line comment -- ... to end of line
    if (ch === '-' && next === '-') {
      const nl = sql.indexOf('\n', i);
      const end = nl === -1 ? n : nl;
      current += sql.slice(i, end);
      i = end;
      continue;
    }
    // Block comment /* ... */
    if (ch === '/' && next === '*') {
      const close = sql.indexOf('*/', i + 2);
      const end = close === -1 ? n : close + 2;
      current += sql.slice(i, end);
      i = end;
      continue;
    }
    // Single-quoted string literal (handle '' escape)
    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") { j += 1; break; }
        j += 1;
      }
      current += sql.slice(i, j);
      i = j;
      continue;
    }
    // Dollar-quoted block: $$ or $tag$
    if (ch === '$') {
      const tagMatch = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0];
        const close = sql.indexOf(tag, i + tag.length);
        const end = close === -1 ? n : close + tag.length;
        current += sql.slice(i, end);
        i = end;
        continue;
      }
    }
    // Top-level statement terminator
    if (ch === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = '';
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  const tail = current.trim();
  if (tail.length > 0) statements.push(tail);
  return statements;
}
