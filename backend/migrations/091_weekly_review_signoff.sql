-- 091_weekly_review_signoff.sql
-- Finding G — capture the Registered Manager's signed acknowledgement on the weekly
-- review (per site). Additive. The machine narrative stays a draft in content JSON
-- (step15_narrative_draft); the RM authors step15_narrative themselves.

BEGIN;

ALTER TABLE weekly_reviews ADD COLUMN IF NOT EXISTS acknowledged_by            UUID;
ALTER TABLE weekly_reviews ADD COLUMN IF NOT EXISTS acknowledged_by_name      TEXT;
ALTER TABLE weekly_reviews ADD COLUMN IF NOT EXISTS acknowledged_at           TIMESTAMPTZ;
ALTER TABLE weekly_reviews ADD COLUMN IF NOT EXISTS acknowledgement_statement TEXT;

COMMIT;

-- Per SITE (weekly_reviews is keyed on house_id + week_ending) — each registered
-- location is signed off on its own, the correct CQC posture. A provider-level roll-up
-- acknowledgement (Finding O) sits on top, on the Review Roll-up.
