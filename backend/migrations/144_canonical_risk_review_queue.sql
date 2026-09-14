-- One canonical queue for scheduled risk reviews.
BEGIN;

ALTER TABLE governance_review_obligations
  DROP CONSTRAINT IF EXISTS governance_review_obligations_obligation_type_check;
ALTER TABLE governance_review_obligations
  ADD CONSTRAINT governance_review_obligations_obligation_type_check
  CHECK (obligation_type IN (
    'ACTION_EFFECTIVENESS','RISK_POST_EFFECTIVENESS','POST_ESCALATION_RISK',
    'PATTERN_REVIEW','RISK_SCHEDULED_REVIEW'
  ));

CREATE OR REPLACE FUNCTION sync_due_risk_review_obligations(target_company UUID DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE inserted_count INTEGER;
BEGIN
  INSERT INTO governance_review_obligations
    (company_id, obligation_type, subject_type, subject_id, source_risk_id,
     owner_id, owner_role, due_at, reason)
  SELECT r.company_id, 'RISK_SCHEDULED_REVIEW', 'RISK', r.id, r.id,
         r.assigned_to, 'REGISTERED_MANAGER',
         COALESCE(r.next_review_date, r.review_due_date)::timestamptz,
         'The scheduled governance review date for this risk is due.'
    FROM risks r
   WHERE (target_company IS NULL OR r.company_id=target_company)
     AND LOWER(r.status::text) NOT IN ('closed','resolved')
     AND COALESCE(r.next_review_date, r.review_due_date) IS NOT NULL
     AND COALESCE(r.next_review_date, r.review_due_date) <= CURRENT_DATE
     AND NOT EXISTS (
       SELECT 1 FROM governance_review_obligations o
        WHERE o.company_id=r.company_id
          AND o.obligation_type='RISK_SCHEDULED_REVIEW'
          AND o.subject_type='RISK' AND o.subject_id=r.id AND o.status='OPEN'
     )
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END $$;

SELECT sync_due_risk_review_obligations(NULL);
COMMIT;
