-- 094_provider_review_signoff.sql
-- Finding O — provider-level acknowledgement on the Review Roll-up. Sits on top of the
-- per-site weekly reviews (Finding G): the Director/RI signs the provider-wide weekly
-- position once every site is finalised. One per company x week.

BEGIN;

CREATE TABLE IF NOT EXISTS provider_review_signoffs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL,
  week_ending          DATE NOT NULL,
  position             TEXT,
  acknowledged_by      UUID,
  acknowledged_by_name TEXT,
  acknowledged_at      TIMESTAMPTZ,
  statement            TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, week_ending)
);

COMMIT;

-- Separation of duties: the provider sign-off is made by a Director/RI (route-guarded),
-- distinct from the Registered Manager(s) who signed the per-site reviews.
