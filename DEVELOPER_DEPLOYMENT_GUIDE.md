# OrdinCore Canonical Governance Repair — Deployment Guide

## Outcome

This release changes the application from several loosely related screen projections to one traceable governance case. Signals remain permanent evidence; patterns group those signals; decisions create work; risks and escalations retain the same lineage; completed actions generate effectiveness and follow-up review obligations; registers and reports read those records rather than recreating them.

## Before deployment

1. Create a database backup and record the currently deployed Git SHA.
2. Deploy to a staging environment with production-like anonymised data.
3. Confirm PostgreSQL has `uuid-ossp`, Redis is available, and the API and worker processes use the same release.
4. Install dependencies with the lockfiles, then run backend tests/typecheck and frontend/mobile typechecks.

## Apply in order

Apply Stage 1 through Stage 7 without reordering. Stages 2, 3 and 6 include migrations `130`, `131` and `132`. Run:

```bash
cd backend
npm ci
npm run typecheck
npm test -- --runInBand
npm run db:migrate
```

Then build the interfaces:

```bash
cd ../frontend && npm ci && npm run build
cd ../mobile && npm ci && npm run typecheck
```

Restart the API and all workers from the same Git SHA. The new trajectory refresh worker must be running.

## Required post-deployment checks

Run the read-only reconciliation:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/scripts/verify-canonical-governance.sql
```

All rows should be zero except `open_review_obligations`; that row is the genuine current review workload.

Complete one controlled end-to-end case in staging:

1. Support Worker records a signal.
2. Team Leader completes and evidences the assigned action.
3. Registered Manager records/links the decision, reviews effectiveness, and sets the next review.
4. Director/Responsible Individual verifies the same action history, outcome, trajectory and due review in Systemic Patterns, Escalations, Oversight Register and Reports.
5. Generate and reopen a frozen report; verify its action history matches the live case at snapshot time.

## Release gate

Do not promote if any of these occur: an orphaned promoted cluster, a completed action absent from effectiveness review, different trajectory labels for the same risk, an escalation detail with fewer actions than its list row, a report missing completed-action evidence, or an interface exposing another tenant/site.

## Rollback

Application rollback is by the previously recorded Git SHA. Database migrations are forward migrations: do not delete backfilled lineage or review obligations. If application rollback is necessary, leave migrations `130`–`132` in place; they are additive and preserve evidence. Restore the database backup only under the organisation's incident/change-control procedure.
