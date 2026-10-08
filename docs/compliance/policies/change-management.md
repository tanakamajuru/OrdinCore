# Change management — OrdinCore

> DSPT Standards 7, 9. Owner: **[NEEDS INPUT]**. Review: annually.

## Principle

Changes to production are controlled, tested and reversible. No change reaches production without
passing automated checks and being deployable back out.

## Standard change flow

1. **Branch & change** — work on a branch; never commit secrets (pre-commit + CI gitleaks gate).
2. **Automated verification (CI)** — every push runs clean build, tests, migrations against a blank
   DB, dependency audit and secret scan ([.github/workflows/ci.yml](../../../.github/workflows/ci.yml)).
   A red build does not ship.
3. **Review** — changes are reviewed before merge to `main` (see
   [secure-development.md](./secure-development.md)).
4. **Deploy** — via the documented deployment runbook (pull + `deployment/deploy.sh`), with a health
   check after. Frontend/backend deploy together; mobile ships as a versioned build.
5. **Rollback** — git revert + redeploy; database changes use idempotent, forward migrations and are
   preceded by a tested backup for destructive changes.

## Database migrations

- Versioned, append-only migration files; applied by the migration runner (never ad-hoc SQL in prod).
- Destructive or EOL-upgrade migrations: **take and verify a backup first**, and have a rollback plan.

## Higher-risk / emergency changes

- Infrastructure, DB-version or auth changes: planned, with the owner notified and a rollback plan
  documented before execution.
- Emergency fixes (e.g. security patch) follow the same CI gate; the change and reason are recorded.

## Records

Change history is the git history + deployment log. Significant/planned changes (infra, DB upgrades)
are additionally noted by **[NEEDS INPUT]** with date and rollback outcome.
