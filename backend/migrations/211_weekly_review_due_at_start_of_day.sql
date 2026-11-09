-- Migration 211: weekly governance review becomes "due" from the start of the due day, not 09:00.
-- User-reported, 9 Nov 2026: a weekly review for the just-completed week showed as available on
-- the Weekly Review page (which is not time-gated) well before it appeared on Decisions Due/My
-- Work, which only surfaces it once weekly_governance_review_time has passed -- confusing, since
-- both describe the same "due Monday" obligation. Change the default and every existing company's
-- configured time to 00:00, so "due Monday" means due from the start of Monday everywhere.

ALTER TABLE companies ALTER COLUMN weekly_governance_review_time SET DEFAULT '00:00:00';

UPDATE companies SET weekly_governance_review_time = '00:00:00', updated_at = NOW()
 WHERE weekly_governance_review_time = '09:00:00';
