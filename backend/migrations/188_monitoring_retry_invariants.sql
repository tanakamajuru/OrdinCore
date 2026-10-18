-- Monitor/retry invariants (17 Oct 2026 developer findings, P1/P2).
--
-- 1. "A database-safe invariant for one active monitoring instruction per signal." Application
--    code already marks a prior active Monitor decision Completed when a new one is recorded
--    (governanceDecisions.service.ts), but nothing stopped two CONCURRENT requests (a double tap,
--    a retried offline submission) from both succeeding and leaving two active Monitoring rows for
--    the same signal. A partial unique index makes the second concurrent insert fail at the
--    database rather than silently create a duplicate active instruction.
--
-- Pre-existing duplicates found on production during this migration's development: two pulses
-- each had two Monitor/Monitoring rows created ~2 minutes (first pair) and ~14 seconds (second
-- pair) apart — the double-tap/retry pattern this invariant is meant to prevent, not two
-- deliberate separate decisions. Resolve them the same way the app's own supersession logic
-- would: keep the most recently created row active, mark the earlier one Completed. No row is
-- deleted; full history (reason, owner, evidence) is preserved on both.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY pulse_entry_id ORDER BY created_at DESC) AS rn
    FROM governance_reviews
   WHERE decision = 'Monitor' AND decision_status = 'Monitoring'
)
UPDATE governance_reviews gr
   SET decision_status = 'Completed'
  FROM ranked
 WHERE gr.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_governance_reviews_one_active_monitor_per_signal
  ON governance_reviews(pulse_entry_id)
  WHERE decision = 'Monitor' AND decision_status = 'Monitoring';

-- 2. "Add retry protection for monitoring-note submissions." signal_monitoring_updates had no
--    idempotency key at all — a retried/offline-replayed TL update could be inserted twice. Mirror
--    the existing pattern (governance_reviews.idempotency_key, governance_pulses
--    client_submission_id): an optional client-supplied reference, unique per company when present.
ALTER TABLE signal_monitoring_updates
  ADD COLUMN IF NOT EXISTS client_submission_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_signal_monitoring_updates_idempotency
  ON signal_monitoring_updates(company_id, client_submission_id)
  WHERE client_submission_id IS NOT NULL;
