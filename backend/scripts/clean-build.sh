#!/usr/bin/env bash
# =============================================================================
# Phase 7 · Deterministic clean database build from a schema baseline.
#
# The full 001→N migration history is intentionally immutable (the runner rejects
# any applied migration whose checksum changed) and is NOT re-runnable from zero:
# migration 152 re-creates a view with a hard-coded column order that only matches
# the production physical layout (see docs/canonical/CLEAN_BUILD_REPORT.md). So a
# fresh environment is provisioned from a schema BASELINE taken from a known-good
# reference DB, with the historical migration rows pre-seeded as already-applied,
# and then only genuinely-new migrations run on top.
#
# Usage (run as a role that can create databases, e.g. postgres):
#   REF_DB=ordincore TARGET_DB=ordincore_cleanbuild bash scripts/clean-build.sh
#
# Env:
#   REF_DB     reference database to baseline from   (default: ordincore)
#   TARGET_DB  fresh database to build               (default: ordincore_cleanbuild)
#   DB_OWNER   owner/app role for the new database   (default: ordinuser)
#   KEEP=1     do not drop TARGET_DB at the end (leave it for inspection)
# =============================================================================
set -euo pipefail

REF_DB="${REF_DB:-ordincore}"
TARGET_DB="${TARGET_DB:-ordincore_cleanbuild}"
DB_OWNER="${DB_OWNER:-ordinuser}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "==> Baselining schema from reference DB: $REF_DB"
# Extensions are created as superuser during provisioning below; strip their DDL from the dump so
# the app-role load (SET SESSION AUTHORIZATION) does not fail on "must be owner of extension".
pg_dump --schema-only --no-owner --no-privileges -d "$REF_DB" \
  | grep -vE '^(CREATE EXTENSION|COMMENT ON EXTENSION)' > "$TMP/schema_baseline.sql"
# Historical migration ledger (rows only) so the runner treats the baseline as applied.
pg_dump --data-only --table=_migrations -d "$REF_DB" > "$TMP/migrations_ledger.sql"

echo "==> Provisioning fresh DB: $TARGET_DB (owner: $DB_OWNER)"
psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${TARGET_DB};"
psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${TARGET_DB} OWNER ${DB_OWNER};"
psql -v ON_ERROR_STOP=1 -d "$TARGET_DB" \
  -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' \
  -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;' \
  -c "GRANT ALL ON SCHEMA public TO ${DB_OWNER};"

# Load as the app role so every object is owned by ${DB_OWNER}, not the (possibly superuser)
# invoker — otherwise the app hits permission-denied against postgres-owned tables. When the
# invoker is a superuser, SET SESSION AUTHORIZATION makes the load create app-owned objects;
# when the invoker already is ${DB_OWNER} it is a no-op.
echo "==> Loading baseline schema (as ${DB_OWNER})"
psql -v ON_ERROR_STOP=1 -d "$TARGET_DB" \
  -c "SET SESSION AUTHORIZATION ${DB_OWNER};" -f "$TMP/schema_baseline.sql" >/dev/null
echo "==> Seeding historical migration ledger (as ${DB_OWNER})"
psql -v ON_ERROR_STOP=1 -d "$TARGET_DB" \
  -c "SET SESSION AUTHORIZATION ${DB_OWNER};" -f "$TMP/migrations_ledger.sql" >/dev/null

echo "==> Applying any migrations newer than the baseline"
( cd "$(dirname "$0")/.." && DB_NAME="$TARGET_DB" npm run db:migrate )

echo "==> Verifying canonical invariants on the fresh build"
psql -v ON_ERROR_STOP=1 -d "$TARGET_DB" -f "$(dirname "$0")/verify-canonical-invariants.sql"

if [ "${KEEP:-0}" != "1" ]; then
  echo "==> Dropping $TARGET_DB (set KEEP=1 to retain)"
  psql -c "DROP DATABASE IF EXISTS ${TARGET_DB};"
fi

echo "==> Clean build OK."
