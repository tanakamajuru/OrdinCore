-- 213: Weekly provider assurance sign-off — align readiness and capture the signed evidence.
--
-- Before: provider_review_signoffs (094) only stored the conclusion/signer/statement. Nothing
-- recorded WHICH services and weekly reviews the RI actually relied on, or what the evidence
-- totals (open risks, escalations, etc.) looked like at the moment of signing. Because
-- Review Roll-up and the reports below recompute those totals live, re-opening an old signed
-- week after a risk/escalation changes silently drifts the evidence shown next to a historic,
-- immutable decision (brief: "Reporting gap").
--
-- Readiness was also split across three places that could disagree: My Work
-- (guidedWork.service.ts) only checked that ONE weekly_reviews row for the company's latest
-- week had validation_status='Approved', while providerRollup()/signProviderRollup() in
-- weeklyReviews.service.ts correctly required EVERY active service's review to be Director
-- validated. My Work is being changed (application code, not this migration) to call the same
-- providerRollup() readiness instead of its own query.
--
-- After: the signed row is a self-contained snapshot. included_service_ids and
-- validated_weekly_review_ids/versions record exactly what was in scope and validated;
-- evidence_totals_snapshot (jsonb, same shape as providerRollup's evidence_totals) freezes the
-- counts the RI saw; snapshot_taken_at timestamps it separately from acknowledged_at (the
-- signing moment) in case they ever need to diverge. rationale is split out from the free-text
-- `statement` so the server can enforce "written rationale required" without parsing prose out
-- of the generated acknowledgement sentence. linked_followup_refs holds any risk/action/
-- escalation references the RI cited. A CHECK constraint pins `position` to the four allowed
-- conclusions so a typo can't silently create a fifth, unrenderable state.
--
-- Risk/escalation/effectiveness status are deliberately NOT duplicated in here — those reports
-- keep reading their own source-of-truth tables live; only the sign-off's own evidence totals
-- are frozen (brief: "do NOT freeze/duplicate those into the snapshot").

ALTER TABLE provider_review_signoffs
  ADD COLUMN IF NOT EXISTS included_service_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS validated_weekly_review_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evidence_totals_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_taken_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rationale TEXT,
  ADD COLUMN IF NOT EXISTS linked_followup_refs JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: existing rows (pre-213) have no snapshot. Treat their free-text `statement` as the
-- rationale so existing sign-offs still render something, but leave the snapshot columns at
-- their empty defaults — the retrieval layer must label these as "historical evidence
-- unavailable" rather than inventing a snapshot that was never actually taken (brief point 3).
UPDATE provider_review_signoffs
   SET rationale = COALESCE(rationale, statement)
 WHERE rationale IS NULL;

-- Allowed conclusions only. Existing free-text `position` values that don't match are left as-is
-- (historic data integrity) — the constraint is NOT VALID so it governs new/updated rows only
-- without failing the migration on any legacy row that predates the fixed vocabulary.
ALTER TABLE provider_review_signoffs
  DROP CONSTRAINT IF EXISTS provider_review_signoffs_position_check;
ALTER TABLE provider_review_signoffs
  ADD CONSTRAINT provider_review_signoffs_position_check
  CHECK (position IN ('Assured', 'Assured with actions', 'Further evidence required', 'Not assured'))
  NOT VALID;
