-- The governance decision executor (governanceDecisions.service) writes the full set of decision
-- types into governance_reviews.decision, but the original CHECK constraint (migration 050) only
-- allowed Monitor/Create Action/Escalate/Close/Reopen. Closing a monitored signal records
-- 'Close Signal', which the stale constraint rejected ("violates governance_reviews_decision_check").
-- Widen the constraint to exactly the service's allowed decision types.
BEGIN;
ALTER TABLE governance_reviews DROP CONSTRAINT IF EXISTS governance_reviews_decision_check;
ALTER TABLE governance_reviews ADD CONSTRAINT governance_reviews_decision_check
  CHECK (decision IN (
    'Monitor', 'Create Action', 'Create Pattern', 'Link to Pattern', 'Escalate',
    'Promote to Risk', 'Close', 'Close Signal', 'Request Risk Closure', 'Reopen'
  ));
COMMIT;
