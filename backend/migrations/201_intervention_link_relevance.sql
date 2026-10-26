-- 25 Oct developer brief, "Intervention Action: video findings & fixes", P1.
-- The action-link picker fell back to the whole provider's action list whenever an
-- intervention had no active-theme risk_refs, and the server only checked that a
-- selected action belonged to the same company -- never that it was actually relevant
-- to the intervention. A deliberately wider link (no theme match) now requires an
-- RM-recorded reason, stored against the link itself for audit.
ALTER TABLE intervention_action_links
  ADD COLUMN IF NOT EXISTS relevance_reason text;
