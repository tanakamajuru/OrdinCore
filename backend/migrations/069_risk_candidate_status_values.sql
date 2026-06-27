-- ============================================================================
-- Migration 069: Fix risk_candidates status drift (root cause A — promotion block)
-- ----------------------------------------------------------------------------
-- The original CHECK (038) allowed only New/In Review/Accepted/Rejected/Converted,
-- but the engine + services set status='Promoted' on promotion and 'Dismissed' on
-- dismissal (and 'Superseded' for dedup). Those writes violated the constraint, so
-- EVERY promote/dismiss threw — a risk row was created but the candidate update
-- failed, surfacing as "Failed to promote". With nothing promoted, every downstream
-- Director rollup (heat map, trends, effectiveness, oversight counts) showed 0.
--
-- Align the constraint with the values the code actually uses.
-- ============================================================================
ALTER TABLE risk_candidates DROP CONSTRAINT IF EXISTS risk_candidates_status_check;

ALTER TABLE risk_candidates
  ADD CONSTRAINT risk_candidates_status_check
  CHECK (status IN (
    'New', 'In Review', 'Accepted', 'Rejected', 'Converted',
    'Promoted', 'Dismissed', 'Superseded'
  ));
