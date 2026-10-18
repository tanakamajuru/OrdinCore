-- Signal validity states (17 Oct 2026 developer findings, P1 "separate four concepts").
--
-- A workflow decision (Monitor/Create Action/Escalate/Close, or a candidate/pattern being
-- dismissed) is a decision about what to DO, not a decision about whether the underlying event
-- happened. Before this migration, Ordin Core had no field at all for "this specific recorded
-- entry does not qualify as evidence" (a duplicate submission, something entered in error, a
-- disproved account) — the only way to stop a bad entry counting was to actually mark the whole
-- signal Reviewed/Closed, which also erases it from genuine recurrence history. This conflates
-- (1) occurrence identity/time, (2) evidence validity, (3) governance/workflow decision and
-- (4) current detection-window qualification into one set of fields.
--
-- This migration adds ONLY the evidence-validity axis. It does not touch review_status, decision
-- workflow, or detection windows — those remain exactly as they are.
DO $$ BEGIN
  CREATE TYPE signal_validity_status AS ENUM ('VALID', 'DUPLICATE', 'ENTERED_IN_ERROR', 'DISPROVED', 'PENDING_VALIDATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE governance_pulses
  ADD COLUMN IF NOT EXISTS validity_status signal_validity_status NOT NULL DEFAULT 'VALID',
  ADD COLUMN IF NOT EXISTS validity_reason TEXT,
  ADD COLUMN IF NOT EXISTS validity_set_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS validity_set_at TIMESTAMPTZ,
  -- Required only when validity_status = DUPLICATE: the canonical occurrence this one duplicates,
  -- so a duplicate is linked (auditable) rather than orphaned or silently dropped.
  ADD COLUMN IF NOT EXISTS validity_duplicate_of_id UUID REFERENCES governance_pulses(id);

CREATE INDEX IF NOT EXISTS idx_governance_pulses_validity_status
  ON governance_pulses(company_id, validity_status)
  WHERE validity_status <> 'VALID';
