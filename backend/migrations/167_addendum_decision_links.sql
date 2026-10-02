-- 167: Structured decision linkage for same-day daily-governance addenda (brief 1, §4/§6).
--
-- After the primary daily review is signed, the RM decides outstanding signals through the normal
-- signal queue — each decision is ALREADY saved as a governance_reviews row with its downstream
-- record. The addendum must REFERENCE those saved decision IDs (idempotent linkage), not replay or
-- re-execute them. The current reason-only addendum linked nothing, so weekly governance reported a
-- material addendum as "zero decisions". This column holds the stable IDs of the governance_reviews
-- the addendum attests to, so reports can show the real dated decisions.

ALTER TABLE daily_governance_addendum
  ADD COLUMN IF NOT EXISTS decision_ids uuid[] NOT NULL DEFAULT '{}';
