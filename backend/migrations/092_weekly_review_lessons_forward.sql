-- 092_weekly_review_lessons_forward.sql
-- Closes the migration-sequence gap (091 -> 093) flagged in the SSOT audit, so a clean
-- `db:migrate` on a fresh trial environment applies a contiguous 090..097 set.
--
-- Also promotes Finding L's "Lessons Learnt" and forward "Anticipated Risks" to first-class,
-- optional columns. The live code stores them inside the weekly_reviews.content JSONB, which
-- keeps working unchanged; these nullable columns exist so the data can be surfaced/queried
-- directly later without another migration. Idempotent and non-breaking.

BEGIN;

ALTER TABLE weekly_reviews ADD COLUMN IF NOT EXISTS lessons_learnt    TEXT;
ALTER TABLE weekly_reviews ADD COLUMN IF NOT EXISTS anticipated_risks JSONB;

COMMIT;
