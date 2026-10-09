-- Daily Oversight wording brief (8 Oct 2026): three additive, structured decision fields that the
-- brief requires be stored distinctly (not stuffed into one narrative string and lost on retrieval):
--   monitoring_trigger  — Monitor: "When should action be taken sooner?" (the change that triggers
--                         action/escalation before the next scheduled review).
--   change_outcome      — Returning monitoring review: "How has the concern changed?"
--                         (Improved / Unchanged / Worsened / Not enough evidence).
--   immediate_action    — Escalate: "What immediate action is already in place?"
-- Additive only. No existing governance entity, status, transition or value is modified. Columns are
-- nullable so pre-existing rows and clients that do not yet send them are unaffected.

ALTER TABLE governance_reviews
  ADD COLUMN IF NOT EXISTS monitoring_trigger TEXT,
  ADD COLUMN IF NOT EXISTS change_outcome     TEXT,
  ADD COLUMN IF NOT EXISTS immediate_action   TEXT;
