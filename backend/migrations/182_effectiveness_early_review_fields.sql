-- Early effectiveness review brief (8 Oct 2026): additive history fields so an effectiveness review
-- carried out before its scheduled date is recorded truthfully and reconstructably. Early timing is
-- derived on the SERVER (schedule vs review timestamp); the browser never asserts it. Existing
-- columns (action_id, company_id, outcome, intended_outcome, evidence, reviewed_by, reviewed_at,
-- next_review_date) are preserved. This does not create a second effectiveness subsystem.

ALTER TABLE action_effectiveness_reviews
  ADD COLUMN IF NOT EXISTS scheduled_review_at_snapshot TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_early_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS early_review_reason TEXT,
  ADD COLUMN IF NOT EXISTS evidence_still_needed TEXT;
