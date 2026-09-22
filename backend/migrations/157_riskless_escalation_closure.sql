-- V5: clear impossible post-risk-review obligations created by historic closures
-- where no direct risk or promoted source-pattern risk exists. This preserves every
-- escalation, closure review and audit record; it only corrects queue state.
BEGIN;

UPDATE escalations e
   SET post_closure_risk_review_required = FALSE,
       updated_at = NOW()
 WHERE e.post_closure_risk_review_required = TRUE
   AND COALESCE(e.lifecycle_status::text, e.status::text) IN ('Closed', 'Resolved')
   AND e.risk_id IS NULL
   AND NOT EXISTS (
     SELECT 1
       FROM signal_clusters sc
      WHERE sc.id = e.source_cluster_id
        AND sc.company_id = e.company_id
        AND sc.linked_risk_id IS NOT NULL
   );

-- Remove the originating signal from the active monitoring queue only when its
-- immediate escalation is closed without a continuing risk and no other open
-- escalation remains. Historical evidence is not deleted or rewritten.
UPDATE governance_pulses gp
   SET review_status = 'Closed'::review_status,
       reviewed_at = COALESCE(gp.reviewed_at, NOW()),
       updated_at = NOW()
 WHERE EXISTS (
       SELECT 1
         FROM escalations e
        WHERE e.source_pulse_id = gp.id
          AND e.company_id = gp.company_id
          AND COALESCE(e.lifecycle_status::text, e.status::text) IN ('Closed', 'Resolved')
          AND e.risk_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM signal_clusters sc
             WHERE sc.id = e.source_cluster_id
               AND sc.company_id = e.company_id
               AND sc.linked_risk_id IS NOT NULL
          )
     )
   AND NOT EXISTS (
       SELECT 1
         FROM canonical_escalation_state_v open_e
        WHERE open_e.source_pulse_id = gp.id
          AND open_e.company_id = gp.company_id
          AND open_e.is_open
     );

COMMIT;
