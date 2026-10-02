-- 165: Preserve the full monitoring review per event, and separate monitoring
-- scheduling from the escalation SLA (Monitoring review requirements, 1 Oct 2026).
--
-- Before: a "continue monitoring" review wrote the monitoring owner, trigger,
-- evidence-to-observe and next-review date only onto escalations.metadata (the
-- LATEST projection), while each escalation_actions row stored just action_type +
-- description. Historical reviews therefore lost their complete snapshot, and the
-- next-review date was written onto escalations.due_by, silently resetting the
-- escalation SLA/overdue clock.
--
-- After: each monitoring review event carries its own complete snapshot on
-- escalation_actions.metadata, and the monitoring schedule lives on its own
-- escalations.next_review_at column — the SLA (due_by) is left untouched.

ALTER TABLE escalation_actions
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE escalations
  ADD COLUMN IF NOT EXISTS next_review_at timestamptz;

-- Surface due monitoring obligations efficiently (D6 carry-forward / daily board).
CREATE INDEX IF NOT EXISTS idx_escalations_next_review_at
  ON escalations(company_id, next_review_at)
  WHERE next_review_at IS NOT NULL;

-- Backfill the schedule column from the existing latest-projection metadata so
-- currently-monitored escalations keep surfacing. This reads the value the review
-- already recorded; it does not invent or backdate anything.
UPDATE escalations
   SET next_review_at = NULLIF(metadata->>'next_review_at','')::timestamptz
 WHERE next_review_at IS NULL
   AND NULLIF(metadata->>'next_review_at','') IS NOT NULL;
