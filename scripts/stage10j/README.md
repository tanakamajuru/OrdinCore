# Stage 10J — Pilot acceptance

Stage 10J is a release gate, not a source-code-only pass. Run it against a staging deployment containing two separate providers: one newly seeded tenant and one restored, remediated copy of representative historical data.

## Required environment

```bash
export DATABASE_URL='postgresql://...staging...'
export BASE_URL='https://staging.example'
export CLEAN_TENANT_ID='...'
export MIGRATED_TENANT_ID='...'
export STAGE10J_RM_EMAIL='...'
export STAGE10J_RM_PASSWORD='...'
```

Use test-only accounts and staging data. Never point this runner at production.

## Run

```bash
bash scripts/stage10j/run-acceptance.sh
```

The runner deliberately stops when configuration is missing, any automated check fails, constraints are unvalidated, critical remediation remains, or the browser scenarios fail. A successful automated run still has a pending release decision until both the product owner and developer complete the generated `sign-off.md`.

The browser suite must capture request/response evidence and screenshots or traces for every scenario listed in the sign-off table. Do not mark an unexecuted scenario as passed.

