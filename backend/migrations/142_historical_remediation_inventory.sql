-- Stage 10H phase 1: non-destructive historical-data inventory.
-- This migration records what is safe to repair and what requires human judgement.
BEGIN;

CREATE TABLE IF NOT EXISTS governance_remediation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL CHECK (mode IN ('INVENTORY','APPLY')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  executed_by TEXT NOT NULL DEFAULT CURRENT_USER,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS governance_remediation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES governance_remediation_runs(id) ON DELETE RESTRICT,
  company_id UUID,
  issue_type TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  disposition TEXT NOT NULL CHECK (disposition IN ('AUTO_SAFE','HUMAN_REVIEW')),
  reason TEXT NOT NULL,
  original_data JSONB NOT NULL,
  candidate_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolution_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (resolution_status IN ('OPEN','RESOLVED','ACCEPTED_EXCEPTION')),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  UNIQUE(run_id, issue_type, record_type, record_id)
);

CREATE INDEX IF NOT EXISTS idx_governance_remediation_open
  ON governance_remediation_items(company_id, disposition, issue_type)
  WHERE resolution_status='OPEN';

DO $$
DECLARE inventory_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO governance_remediation_runs(id, mode) VALUES (inventory_id, 'INVENTORY');

  -- Deterministic vocabulary repairs. Original rows are retained as JSON before any apply step.
  INSERT INTO governance_remediation_items
    (run_id, company_id, issue_type, record_type, record_id, disposition, reason, original_data)
  SELECT inventory_id, ra.company_id, 'EFFECTIVENESS_VOCABULARY', 'ACTION', ra.id, 'AUTO_SAFE',
         'Canonical outcome is missing or differs from the established legacy mapping.', to_jsonb(ra)
    FROM risk_actions ra
   WHERE canonical_effectiveness_outcome(ra.effectiveness_outcome::text, ra.effectiveness::text) IS NOT NULL
     AND ra.effectiveness_outcome IS DISTINCT FROM canonical_effectiveness_outcome(ra.effectiveness_outcome::text, ra.effectiveness::text);

  INSERT INTO governance_remediation_items
    (run_id, company_id, issue_type, record_type, record_id, disposition, reason, original_data)
  SELECT inventory_id, ra.company_id, 'ACTION_STATUS_VOCABULARY', 'ACTION', ra.id, 'AUTO_SAFE',
         'Historic action status has a deterministic canonical equivalent.', to_jsonb(ra)
    FROM risk_actions ra WHERE LOWER(ra.status::text) IN ('pending','not started','ongoing','complete','done');

  INSERT INTO governance_remediation_items
    (run_id, company_id, issue_type, record_type, record_id, disposition, reason, original_data)
  SELECT inventory_id, r.company_id, 'RESOLVED_RISK_STATUS', 'RISK', r.id, 'AUTO_SAFE',
         'Resolved is a historic terminal label; canonical terminal status is Closed.', to_jsonb(r)
    FROM risks r WHERE LOWER(r.status::text)='resolved';

  INSERT INTO governance_remediation_items
    (run_id, company_id, issue_type, record_type, record_id, disposition, reason, original_data)
  SELECT inventory_id, r.company_id, 'UNSUPPORTED_CONTROL_EFFECTIVENESS', 'RISK', r.id, 'AUTO_SAFE',
         'A control-effectiveness value exists but no action/control is linked to this risk or its source pattern.', to_jsonb(r)
    FROM risks r
   WHERE NULLIF(TRIM(r.control_effectiveness), '') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM risk_actions ra
        WHERE ra.company_id=r.company_id
          AND (ra.risk_id=r.id OR (r.source_cluster_id IS NOT NULL AND ra.source_cluster_id=r.source_cluster_id))
     );

  -- Residual orphans are never title-matched. Candidate relational paths are shown for review.
  INSERT INTO governance_remediation_items
    (run_id, company_id, issue_type, record_type, record_id, disposition, reason, original_data, candidate_links)
  SELECT inventory_id, ra.company_id, 'ACTION_WITHOUT_SOURCE', 'ACTION', ra.id, 'HUMAN_REVIEW',
         'The action has no explicit risk, escalation, governance review, signal or pattern source.', to_jsonb(ra), '[]'::jsonb
    FROM risk_actions ra
   WHERE ra.risk_id IS NULL AND ra.escalation_id IS NULL AND ra.governance_review_id IS NULL
     AND ra.source_pulse_id IS NULL AND ra.source_cluster_id IS NULL;

  INSERT INTO governance_remediation_items
    (run_id, company_id, issue_type, record_type, record_id, disposition, reason, original_data, candidate_links)
  SELECT inventory_id, r.company_id, 'RISK_WITHOUT_EVIDENCE_SOURCE', 'RISK', r.id, 'HUMAN_REVIEW',
         'The risk has neither a source pattern nor an explicit linked signal.', to_jsonb(r), '[]'::jsonb
    FROM risks r
   WHERE r.source_cluster_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM risk_signal_links rsl WHERE rsl.risk_id=r.id);

  INSERT INTO governance_remediation_items
    (run_id, company_id, issue_type, record_type, record_id, disposition, reason, original_data, candidate_links)
  SELECT inventory_id, e.company_id, 'DUPLICATE_ACTIVE_ESCALATION', 'ESCALATION', e.id, 'HUMAN_REVIEW',
         'Another active escalation shares at least one canonical source record.', to_jsonb(e),
         to_jsonb(ARRAY(
           SELECT other.id FROM escalations other WHERE other.id<>e.id AND other.company_id=e.company_id
             AND LOWER(COALESCE(other.lifecycle_status::text,other.status::text,'open')) NOT IN ('closed','resolved')
             AND ((e.risk_id IS NOT NULL AND other.risk_id=e.risk_id)
               OR (e.source_pulse_id IS NOT NULL AND other.source_pulse_id=e.source_pulse_id)
               OR (e.source_cluster_id IS NOT NULL AND other.source_cluster_id=e.source_cluster_id)
               OR (e.source_governance_review_id IS NOT NULL AND other.source_governance_review_id=e.source_governance_review_id))
         ))
    FROM escalations e
   WHERE LOWER(COALESCE(e.lifecycle_status::text,e.status::text,'open')) NOT IN ('closed','resolved')
     AND EXISTS (SELECT 1 FROM escalations other WHERE other.id<>e.id AND other.company_id=e.company_id
       AND LOWER(COALESCE(other.lifecycle_status::text,other.status::text,'open')) NOT IN ('closed','resolved')
       AND ((e.risk_id IS NOT NULL AND other.risk_id=e.risk_id)
         OR (e.source_pulse_id IS NOT NULL AND other.source_pulse_id=e.source_pulse_id)
         OR (e.source_cluster_id IS NOT NULL AND other.source_cluster_id=e.source_cluster_id)
         OR (e.source_governance_review_id IS NOT NULL AND other.source_governance_review_id=e.source_governance_review_id)));

  INSERT INTO governance_remediation_items
    (run_id, company_id, issue_type, record_type, record_id, disposition, reason, original_data)
  SELECT inventory_id, ra.company_id, 'TENANT_LINEAGE_MISMATCH', 'ACTION', ra.id, 'HUMAN_REVIEW',
         'At least one action lineage record does not belong to the action company.', to_jsonb(ra)
    FROM risk_actions ra
   WHERE (ra.risk_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM risks x WHERE x.id=ra.risk_id AND x.company_id=ra.company_id))
      OR (ra.escalation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM escalations x WHERE x.id=ra.escalation_id AND x.company_id=ra.company_id))
      OR (ra.governance_review_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM governance_reviews x WHERE x.id=ra.governance_review_id AND x.company_id=ra.company_id))
      OR (ra.source_pulse_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM governance_pulses x WHERE x.id=ra.source_pulse_id AND x.company_id=ra.company_id))
      OR (ra.source_cluster_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM signal_clusters x WHERE x.id=ra.source_cluster_id AND x.company_id=ra.company_id));

  INSERT INTO governance_remediation_items
    (run_id, company_id, issue_type, record_type, record_id, disposition, reason, original_data)
  SELECT inventory_id, e.company_id, 'TENANT_LINEAGE_MISMATCH', 'ESCALATION', e.id, 'HUMAN_REVIEW',
         'At least one escalation lineage record does not belong to the escalation company.', to_jsonb(e)
    FROM escalations e
   WHERE (e.risk_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM risks x WHERE x.id=e.risk_id AND x.company_id=e.company_id))
      OR (e.source_governance_review_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM governance_reviews x WHERE x.id=e.source_governance_review_id AND x.company_id=e.company_id))
      OR (e.source_pulse_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM governance_pulses x WHERE x.id=e.source_pulse_id AND x.company_id=e.company_id))
      OR (e.source_cluster_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM signal_clusters x WHERE x.id=e.source_cluster_id AND x.company_id=e.company_id));

  INSERT INTO governance_remediation_items
    (run_id, company_id, issue_type, record_type, record_id, disposition, reason, original_data, candidate_links)
  SELECT inventory_id, sc.company_id, 'DUPLICATE_ACTIVE_PATTERN', 'PATTERN', sc.id, 'HUMAN_REVIEW',
         'More than one active pattern occupies the same canonical company/service/domain/person lens.', to_jsonb(sc),
         to_jsonb(ARRAY(
           SELECT other.id FROM signal_clusters other
            WHERE other.id<>sc.id AND other.company_id=sc.company_id
              AND other.house_id IS NOT DISTINCT FROM sc.house_id
              AND other.risk_domain IS NOT DISTINCT FROM sc.risk_domain
              AND other.scope IS NOT DISTINCT FROM sc.scope
              AND other.service_user_id IS NOT DISTINCT FROM sc.service_user_id
              AND other.cluster_status IN ('Emerging','Confirmed','Escalated')
         ))
    FROM signal_clusters sc
   WHERE sc.cluster_status IN ('Emerging','Confirmed','Escalated')
     AND EXISTS (
       SELECT 1 FROM signal_clusters other
        WHERE other.id<>sc.id AND other.company_id=sc.company_id
          AND other.house_id IS NOT DISTINCT FROM sc.house_id
          AND other.risk_domain IS NOT DISTINCT FROM sc.risk_domain
          AND other.scope IS NOT DISTINCT FROM sc.scope
          AND other.service_user_id IS NOT DISTINCT FROM sc.service_user_id
          AND other.cluster_status IN ('Emerging','Confirmed','Escalated')
     );

  INSERT INTO governance_remediation_items
    (run_id, company_id, issue_type, record_type, record_id, disposition, reason, original_data, candidate_links)
  SELECT inventory_id, r.company_id, 'DUPLICATE_ACTIVE_RISK_FOR_PATTERN', 'RISK', r.id, 'HUMAN_REVIEW',
         'Multiple active risks reference the same source pattern. They cannot be merged automatically.', to_jsonb(r),
         to_jsonb(ARRAY(
           SELECT other.id FROM risks other
            WHERE other.id<>r.id AND other.company_id=r.company_id AND other.source_cluster_id=r.source_cluster_id
              AND LOWER(other.status::text) NOT IN ('closed','resolved')
         ))
    FROM risks r
   WHERE r.source_cluster_id IS NOT NULL AND LOWER(r.status::text) NOT IN ('closed','resolved')
     AND EXISTS (SELECT 1 FROM risks other WHERE other.id<>r.id AND other.company_id=r.company_id
       AND other.source_cluster_id=r.source_cluster_id AND LOWER(other.status::text) NOT IN ('closed','resolved'));

  UPDATE governance_remediation_runs
     SET completed_at=NOW(), summary=jsonb_build_object(
       'total', (SELECT COUNT(*) FROM governance_remediation_items WHERE run_id=inventory_id),
       'auto_safe', (SELECT COUNT(*) FROM governance_remediation_items WHERE run_id=inventory_id AND disposition='AUTO_SAFE'),
       'human_review', (SELECT COUNT(*) FROM governance_remediation_items WHERE run_id=inventory_id AND disposition='HUMAN_REVIEW'),
       'by_issue', COALESCE((SELECT jsonb_object_agg(issue_type, n) FROM (
         SELECT issue_type, COUNT(*)::int n FROM governance_remediation_items
          WHERE run_id=inventory_id GROUP BY issue_type
       ) grouped), '{}'::jsonb)
     )
   WHERE id=inventory_id;
END $$;

CREATE OR REPLACE VIEW governance_remediation_open_items AS
SELECT i.*, r.mode, r.started_at, r.completed_at
  FROM governance_remediation_items i
  JOIN governance_remediation_runs r ON r.id=i.run_id
 WHERE i.resolution_status='OPEN';

COMMIT;
