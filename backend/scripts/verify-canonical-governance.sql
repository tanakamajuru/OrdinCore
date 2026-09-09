-- Read-only post-deployment reconciliation. Every returned count should be zero except
-- open_review_obligations, which is the intentional workload to be managed.
WITH checks AS (
  SELECT 'promoted_clusters_without_signal_links' AS check_name, COUNT(*)::bigint AS failures
    FROM signal_clusters sc
   WHERE sc.linked_risk_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM risk_signal_links rsl WHERE rsl.cluster_id=sc.id OR rsl.risk_id=sc.linked_risk_id)
  UNION ALL
  SELECT 'promoted_signal_links_missing_risk_id', COUNT(*)
    FROM risk_signal_links rsl JOIN signal_clusters sc ON sc.id=rsl.cluster_id
   WHERE sc.linked_risk_id IS NOT NULL AND rsl.risk_id IS NULL
  UNION ALL
  SELECT 'linked_actions_missing_promoted_risk_id', COUNT(*)
    FROM risk_actions ra JOIN signal_clusters sc ON sc.id=ra.source_cluster_id
   WHERE sc.linked_risk_id IS NOT NULL AND ra.risk_id IS NULL
  UNION ALL
  SELECT 'completed_actions_missing_effectiveness_obligation', COUNT(*)
    FROM risk_actions ra
   WHERE ra.completed_at IS NOT NULL AND ra.effectiveness_outcome IS NULL
     AND NOT EXISTS (SELECT 1 FROM governance_review_obligations gro
                      WHERE gro.source_action_id=ra.id AND gro.obligation_type='ACTION_EFFECTIVENESS' AND gro.status='OPEN')
  UNION ALL
  SELECT 'closed_escalations_still_requiring_post_review', COUNT(*)
    FROM escalations e
   WHERE COALESCE(e.lifecycle_status::text,e.status::text) IN ('Closed','Resolved')
     AND e.post_closure_risk_review_required=TRUE
     AND NOT EXISTS (SELECT 1 FROM governance_review_obligations gro
                      WHERE gro.source_escalation_id=e.id AND gro.obligation_type='POST_ESCALATION_RISK' AND gro.status='OPEN')
  UNION ALL
  SELECT 'open_review_obligations', COUNT(*) FROM governance_review_obligations WHERE status='OPEN'
)
SELECT check_name, failures FROM checks ORDER BY check_name;
