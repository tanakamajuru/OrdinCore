-- Stage 2: deterministic lineage repair. Only links supported by an existing foreign-key path
-- are filled; no title/theme text matching is used.
BEGIN;

-- A promoted cluster owns one risk. Carry that stable id onto its existing signal links.
UPDATE risk_signal_links rsl
   SET risk_id = sc.linked_risk_id
  FROM signal_clusters sc
 WHERE rsl.cluster_id = sc.id
   AND rsl.risk_id IS NULL
   AND sc.linked_risk_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM risk_signal_links x
      WHERE x.risk_id = sc.linked_risk_id AND x.pulse_entry_id = rsl.pulse_entry_id
   );

-- Remove now-redundant cluster-only duplicates only where a risk+signal row already exists.
DELETE FROM risk_signal_links rsl
 USING signal_clusters sc
 WHERE rsl.cluster_id = sc.id
   AND rsl.risk_id IS NULL
   AND sc.linked_risk_id IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM risk_signal_links x
      WHERE x.id <> rsl.id
        AND x.risk_id = sc.linked_risk_id
        AND x.pulse_entry_id = rsl.pulse_entry_id
   );

-- Back-link actions only through explicit relational provenance.
UPDATE risk_actions ra
   SET risk_id = gr.risk_id,
       updated_at = NOW()
  FROM governance_reviews gr
 WHERE ra.risk_id IS NULL
   AND ra.governance_review_id = gr.id
   AND gr.risk_id IS NOT NULL
   AND ra.company_id = gr.company_id;

UPDATE risk_actions ra
   SET risk_id = sc.linked_risk_id,
       updated_at = NOW()
  FROM signal_clusters sc
 WHERE ra.risk_id IS NULL
   AND ra.source_cluster_id = sc.id
   AND sc.linked_risk_id IS NOT NULL
   AND ra.company_id = sc.company_id;

UPDATE risk_actions ra
   SET risk_id = e.risk_id,
       updated_at = NOW()
  FROM escalations e
 WHERE ra.risk_id IS NULL
   AND ra.escalation_id = e.id
   AND e.risk_id IS NOT NULL
   AND ra.company_id = e.company_id;

CREATE INDEX IF NOT EXISTS idx_risk_actions_lineage_lookup
  ON risk_actions(company_id, source_pulse_id, source_cluster_id, governance_review_id, escalation_id);

COMMIT;
