-- 27 Oct developer review, P1 "Correct false verification and its bypass": verifyImprovement()
-- wrote progress = IMPROVEMENT_VERIFIED for every outcome, including Partly Effective, Not
-- Effective, Too Early and Insufficient Evidence -- a "Partly Effective" verdict showed as a
-- fully green "Improvement verified" pill. Non-Effective outcomes now need their own review due
-- date (user instruction, 27 Oct: "if outcome is not effective we need a review date which will
-- go on waiting and then on decision due on the day") and each verification attempt is preserved
-- append-only rather than overwriting the previous one.
ALTER TABLE learning_records
  ADD COLUMN IF NOT EXISTS verification_review_due_at date,
  ADD COLUMN IF NOT EXISTS verification_history jsonb NOT NULL DEFAULT '[]'::jsonb;
