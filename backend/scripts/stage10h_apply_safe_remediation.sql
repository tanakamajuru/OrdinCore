-- Stage 10H phase 2. DO NOT run until the migration-142 inventory has been exported,
-- reviewed and backed up. Only AUTO_SAFE items from the latest inventory are changed.
BEGIN;

DO $$
DECLARE
  inventory_id UUID;
  apply_id UUID := gen_random_uuid();
BEGIN
  SELECT id INTO inventory_id FROM governance_remediation_runs
   WHERE mode='INVENTORY' AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1;
  IF inventory_id IS NULL THEN RAISE EXCEPTION 'Stage 10H inventory has not been completed.'; END IF;

  INSERT INTO governance_remediation_runs(id, mode) VALUES (apply_id, 'APPLY');

  UPDATE risk_actions ra
     SET effectiveness_outcome=canonical_effectiveness_outcome(ra.effectiveness_outcome::text, ra.effectiveness::text),
         updated_at=NOW()
    FROM governance_remediation_items i
   WHERE i.run_id=inventory_id AND i.issue_type='EFFECTIVENESS_VOCABULARY'
     AND i.disposition='AUTO_SAFE' AND i.resolution_status='OPEN'
     AND ra.id=i.record_id AND ra.company_id=i.company_id;

  UPDATE risks r
     SET status='Closed', closed_at=COALESCE(r.closed_at, r.resolved_at, NOW()), updated_at=NOW()
    FROM governance_remediation_items i
   WHERE i.run_id=inventory_id AND i.issue_type='RESOLVED_RISK_STATUS'
     AND i.disposition='AUTO_SAFE' AND i.resolution_status='OPEN'
     AND r.id=i.record_id AND r.company_id=i.company_id AND LOWER(r.status::text)='resolved';

  UPDATE risk_actions ra
     SET status=CASE LOWER(ra.status::text)
       WHEN 'pending' THEN 'Open' WHEN 'not started' THEN 'Open'
       WHEN 'ongoing' THEN 'In Progress' WHEN 'complete' THEN 'Completed' WHEN 'done' THEN 'Completed'
       ELSE ra.status::text END,
       updated_at=NOW()
    FROM governance_remediation_items i
   WHERE i.run_id=inventory_id AND i.issue_type='ACTION_STATUS_VOCABULARY'
     AND i.disposition='AUTO_SAFE' AND i.resolution_status='OPEN'
     AND ra.id=i.record_id AND ra.company_id=i.company_id;

  UPDATE risks r
     SET control_effectiveness=NULL, updated_at=NOW()
    FROM governance_remediation_items i
   WHERE i.run_id=inventory_id AND i.issue_type='UNSUPPORTED_CONTROL_EFFECTIVENESS'
     AND i.disposition='AUTO_SAFE' AND i.resolution_status='OPEN'
     AND r.id=i.record_id AND r.company_id=i.company_id
     AND NOT EXISTS (SELECT 1 FROM risk_actions ra WHERE ra.company_id=r.company_id
       AND (ra.risk_id=r.id OR (r.source_cluster_id IS NOT NULL AND ra.source_cluster_id=r.source_cluster_id)));

  -- Re-run deterministic relational backfills. No narrative/title matching is permitted.
  UPDATE risk_actions ra SET risk_id=gr.risk_id, updated_at=NOW()
    FROM governance_reviews gr
   WHERE ra.risk_id IS NULL AND ra.governance_review_id=gr.id
     AND gr.risk_id IS NOT NULL AND ra.company_id=gr.company_id;
  UPDATE risk_actions ra SET risk_id=sc.linked_risk_id, updated_at=NOW()
    FROM signal_clusters sc
   WHERE ra.risk_id IS NULL AND ra.source_cluster_id=sc.id
     AND sc.linked_risk_id IS NOT NULL AND ra.company_id=sc.company_id;
  UPDATE risk_actions ra SET risk_id=e.risk_id, updated_at=NOW()
    FROM escalations e
   WHERE ra.risk_id IS NULL AND ra.escalation_id=e.id
     AND e.risk_id IS NOT NULL AND ra.company_id=e.company_id;
  UPDATE risk_signal_links rsl SET risk_id=sc.linked_risk_id
    FROM signal_clusters sc
   WHERE rsl.cluster_id=sc.id AND rsl.risk_id IS NULL AND sc.linked_risk_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM risk_signal_links x WHERE x.risk_id=sc.linked_risk_id AND x.pulse_entry_id=rsl.pulse_entry_id);

  UPDATE governance_remediation_items i
     SET resolution_status='RESOLVED', resolved_at=NOW(),
         resolution_note='Applied by Stage 10H deterministic remediation; original_data retains the pre-change row.'
   WHERE i.run_id=inventory_id AND i.disposition='AUTO_SAFE' AND i.resolution_status='OPEN';

  UPDATE governance_remediation_runs SET completed_at=NOW(), summary=jsonb_build_object(
    'source_inventory_run_id', inventory_id,
    'resolved_auto_safe', (SELECT COUNT(*) FROM governance_remediation_items WHERE run_id=inventory_id AND disposition='AUTO_SAFE' AND resolution_status='RESOLVED'),
    'human_review_remaining', (SELECT COUNT(*) FROM governance_remediation_items WHERE run_id=inventory_id AND disposition='HUMAN_REVIEW' AND resolution_status='OPEN')
  ) WHERE id=apply_id;
END $$;

COMMIT;

SELECT id, mode, completed_at, summary FROM governance_remediation_runs ORDER BY started_at DESC LIMIT 2;
