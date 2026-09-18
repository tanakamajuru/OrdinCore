# Clean DB Build Report

**Status:** Phase 7 deliverable (Stabilisation Plan).
**Date:** 2026-09-18
**Build:** `main` @ 195fb0b (post-#82)
**Method:** throwaway database (`ordincore_cleanbuild`, owned by `ordinuser`), extensions `uuid-ossp` + `pgcrypto`, `DB_NAME=ordincore_cleanbuild npm run db:migrate` over the full 156-file migration history.

## Result

| Range | Outcome |
|---|---|
| 001 → 034 | ✅ apply cleanly |
| **035_stabilize_schema.sql** | ✅ **now passes — was the first clean-build defect (fixed #82)** |
| 036 → 151 | ✅ apply cleanly |
| **152_canonical_action_evidence_contract.sql** | ❌ fails on a clean build: `cannot change name of view column "effectiveness" to "linked_review_id"` |

## Defect 1 — migration runner shredded dollar-quoted blocks (FIXED, #82)
The non-transactional path (used when a migration contains `ALTER TYPE … ADD VALUE`) split the script with a naive `sql.split(';')`, which cuts `DO $$ … ; … $$` blocks at their **internal** semicolons and produces `unterminated dollar-quoted string`. Migration 035 has both a DO block and an enum add, so it took this path and failed from zero (production never hit it — it was built incrementally). Fixed with a dollar-quote/string/comment-aware `splitSqlStatements` ([migrationIntegrity.ts](../../backend/src/scripts/migrationIntegrity.ts)); unit-tested.

## Defect 2 — order-dependent `CREATE OR REPLACE VIEW` (documented, not code-fixable in place)
`canonical_action_state_v` is first created in **147** as `SELECT ra.*, <derived>` and re-created in **152** with an **explicit hard-coded column list** whose order matches *production's* physical `risk_actions` layout. On a clean build the physical column order of `risk_actions` differs (columns were added by a different historical sequence of ALTERs/repairs), so 152's explicit list no longer lines up with 147's `ra.*` expansion, and `CREATE OR REPLACE VIEW` rejects the positional column-name change.

**Why it cannot simply be edited:** migrations 147 and 152 are already applied on production and recorded in `_migrations` with checksums. The runner refuses any applied migration whose content changed (`Applied migration was modified`). Editing 147/152 to fix the clean build would break every production redeploy. This is the correct trade-off — immutable history — but it means the from-zero path cannot be repaired by touching those files.

**Root anti-pattern (avoid in future migrations):** a view defined once with `SELECT base.*` and later re-created with an explicit column list is order-fragile across environments. New migrations should either (a) always list identical explicit columns in both the create and every replace, or (b) `DROP … CASCADE` and recreate the view **and its dependents** together.

## Recommended remediation — baseline snapshot for fresh environments
Because the full history is not re-runnable from zero (and must stay immutable), new environments should be provisioned from a **schema baseline** rather than by replaying 001→N:

1. Generate the baseline from a known-good reference DB:
   `pg_dump --schema-only --no-owner --no-privileges -d ordincore > schema_baseline.sql`
2. Provision a fresh DB: create DB + `uuid-ossp`/`pgcrypto`, `psql -f schema_baseline.sql`.
3. Seed `_migrations` with every historical filename through the baseline point as already-executed (so the runner does not attempt to replay them), then run `npm run db:migrate` for anything newer.
4. Verify with `npm run verify:invariants` and the other `verify:*` gates.

This keeps production history immutable while giving new tenants/environments a deterministic, fast, correct starting schema. The baseline is generated on demand from the reference DB (never committed as a stale dump).

## Implemented — `scripts/clean-build.sh` (#83)
The baseline approach is now a **working, tested script**:
```
REF_DB=ordincore TARGET_DB=ordincore_cleanbuild bash scripts/clean-build.sh
```
It baselines the reference schema (stripping extension DDL), provisions a fresh app-owned DB, seeds the historical `_migrations` ledger so the immutable history (including 152) is treated as applied, runs only genuinely-new migrations, and verifies the canonical invariants. Objects are created app-owned via `SET SESSION AUTHORIZATION`.

## Verified
- Clean build applies migrations **001–151** from zero with no error after #82.
- The order-dependent 152 is bypassed by the baseline path (never replayed), and immutable history is preserved.
- **End-to-end run is green:** baseline → seed → migrate → `canonical invariants I1-I6 hold` → "Clean build OK." (verified on the server against a throwaway DB).
