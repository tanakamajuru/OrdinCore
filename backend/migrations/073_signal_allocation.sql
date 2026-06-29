-- ============================================================================
-- Migration 073: allocate a signal to a responsible Team Leader.
-- ----------------------------------------------------------------------------
-- A signal records who RAISED it (created_by — the permanent observation) and,
-- now, who it's ALLOCATED to (the Team Leader responsible for follow-up —
-- reassignable). created_by is untouched; this adds the ownership dimension so a
-- concern raised by bank/night staff is never left ownerless.
-- ============================================================================

ALTER TABLE governance_pulses
  ADD COLUMN IF NOT EXISTS assigned_to         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assigned_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS allocation_is_auto  BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_pulses_assigned_to ON governance_pulses(assigned_to);

COMMENT ON COLUMN governance_pulses.assigned_to IS
  'Team Leader responsible for following up this signal. Separate from created_by (the observer/recorder). Reassignable; defaults to the house Team Leader on capture.';
