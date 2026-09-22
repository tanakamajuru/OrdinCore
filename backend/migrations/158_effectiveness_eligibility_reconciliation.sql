-- V6: reconcile durable effectiveness obligations with the canonical action contract.
-- No action, effectiveness review or audit record is deleted.
BEGIN;

UPDATE governance_review_obligations o
   SET status = 'CANCELLED',
       completion_note = COALESCE(o.completion_note, 'V6 reconciliation: completion-only action does not require effectiveness review.'),
       updated_at = NOW()
  FROM risk_actions ra
 WHERE o.company_id = ra.company_id
   AND o.subject_type = 'ACTION'
   AND o.subject_id = ra.id
   AND o.obligation_type = 'ACTION_EFFECTIVENESS'
   AND o.status = 'OPEN'
   AND ra.review_requirement = 'COMPLETION_ONLY';

UPDATE governance_review_obligations o
   SET status = 'COMPLETED',
       completion_note = COALESCE(o.completion_note, 'V6 reconciliation: a final canonical effectiveness outcome is already recorded.'),
       completed_at = COALESCE(o.completed_at, NOW()),
       updated_at = NOW()
  FROM risk_actions ra
 WHERE o.company_id = ra.company_id
   AND o.subject_type = 'ACTION'
   AND o.subject_id = ra.id
   AND o.obligation_type = 'ACTION_EFFECTIVENESS'
   AND o.status = 'OPEN'
   AND ra.review_requirement = 'EFFECTIVENESS_REQUIRED'
   AND ra.effectiveness_outcome IN ('Effective', 'Partially Effective', 'Not Effective');

COMMIT;
