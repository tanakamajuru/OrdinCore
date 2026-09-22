-- Pattern closure integrity repair.
--
-- Older builds could leave an active pattern displaying review_outcome='Close'. That
-- is not a completed closure and must not be represented as one. Preserve the full
-- governance_reviews audit trail, but make the denormalised current state honest and
-- require an authorised reviewer to reassess it through the corrected closure gate.

UPDATE signal_clusters
   SET review_outcome = 'Closure attempted — reassessment required',
       closed_at = NULL,
       closed_by = NULL,
       closure_reason = NULL,
       updated_at = NOW()
 WHERE review_outcome = 'Close'
   AND cluster_status NOT IN ('Resolved', 'Dismissed');

-- Operational integrity view for release checks and provider reconciliation reports.
CREATE OR REPLACE VIEW pattern_closure_integrity_v AS
SELECT sc.id,
       sc.company_id,
       sc.risk_domain,
       sc.cluster_status,
       sc.review_outcome,
       sc.last_reviewed_at,
       sc.closed_at,
       sc.closed_by,
       CASE
         WHEN sc.review_outcome = 'Close' AND sc.cluster_status NOT IN ('Resolved', 'Dismissed')
           THEN 'CLOSE_OUTCOME_ACTIVE_PATTERN'
         WHEN sc.cluster_status IN ('Resolved', 'Dismissed') AND sc.closed_at IS NULL
           THEN 'RESOLVED_WITHOUT_CLOSED_AT'
         WHEN sc.cluster_status NOT IN ('Resolved', 'Dismissed') AND sc.closed_at IS NOT NULL
           THEN 'ACTIVE_WITH_CLOSED_AT'
         ELSE 'OK'
       END AS integrity_state
  FROM signal_clusters sc;
