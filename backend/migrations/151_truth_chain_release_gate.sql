-- Ordin Core final truth-chain release gate.
-- Boundary/time/orchestration hardening only. No frozen governance lifecycle change.
BEGIN;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS governance_timezone TEXT NOT NULL DEFAULT 'Europe/London',
  ADD COLUMN IF NOT EXISTS weekly_governance_review_dow SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weekly_governance_review_time TIME NOT NULL DEFAULT '09:00:00';

DO $$ BEGIN
  ALTER TABLE companies ADD CONSTRAINT companies_weekly_governance_dow_chk
    CHECK (weekly_governance_review_dow BETWEEN 0 AND 6);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN companies.governance_timezone IS
'IANA timezone used to derive provider-local governance business dates. Timestamps remain absolute.';
COMMENT ON COLUMN companies.weekly_governance_review_dow IS
'ISO-style review day number used by Guided Work: 0 Sunday, 1 Monday ... 6 Saturday. Default Monday.';
COMMENT ON COLUMN companies.weekly_governance_review_time IS
'Provider-local time at which the previous completed governance week becomes due for RM Weekly Governance review.';

COMMIT;
