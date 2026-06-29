-- ============================================================================
-- Migration 075: surface when a signal cluster was promoted to a formal risk.
-- ----------------------------------------------------------------------------
-- signal_clusters already carries linked_risk_id (set on promotion) — that's the
-- promoted-risk reference. What was missing is *when* it was promoted, so the
-- Patterns view can show a "Promoted ✓" state with a timestamp and link to the
-- risk instead of re-offering promotion. Adds the timestamp only (no redundant
-- promoted_risk_id column — linked_risk_id is that reference).
-- ============================================================================

ALTER TABLE signal_clusters
  ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;

-- Backfill: clusters already linked to a risk are already promoted.
UPDATE signal_clusters
   SET promoted_at = COALESCE(promoted_at, updated_at, NOW())
 WHERE linked_risk_id IS NOT NULL AND promoted_at IS NULL;
