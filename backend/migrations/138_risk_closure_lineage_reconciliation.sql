BEGIN;

-- Repair only missing lineage. Existing explicit links remain authoritative.
-- No title or narrative matching is used.
UPDATE escalations e
SET risk_id = COALESCE(
  (SELECT gr.risk_id FROM governance_reviews gr
    WHERE gr.id = e.source_governance_review_id AND gr.company_id = e.company_id),
  (SELECT sc.linked_risk_id FROM signal_clusters sc
    WHERE sc.id = e.source_cluster_id AND sc.company_id = e.company_id)
)
WHERE e.risk_id IS NULL
  AND COALESCE(
    (SELECT gr.risk_id FROM governance_reviews gr
      WHERE gr.id = e.source_governance_review_id AND gr.company_id = e.company_id),
    (SELECT sc.linked_risk_id FROM signal_clusters sc
      WHERE sc.id = e.source_cluster_id AND sc.company_id = e.company_id)
  ) IS NOT NULL;

UPDATE risk_actions ra
SET risk_id = COALESCE(
  (SELECT e.risk_id FROM escalations e
    WHERE e.id = ra.escalation_id AND e.company_id = ra.company_id),
  (SELECT gr.risk_id FROM governance_reviews gr
    WHERE gr.id = ra.governance_review_id AND gr.company_id = ra.company_id),
  (SELECT sc.linked_risk_id FROM signal_clusters sc
    WHERE sc.id = ra.source_cluster_id AND sc.company_id = ra.company_id)
)
WHERE ra.risk_id IS NULL
  AND COALESCE(
    (SELECT e.risk_id FROM escalations e
      WHERE e.id = ra.escalation_id AND e.company_id = ra.company_id),
    (SELECT gr.risk_id FROM governance_reviews gr
      WHERE gr.id = ra.governance_review_id AND gr.company_id = ra.company_id),
    (SELECT sc.linked_risk_id FROM signal_clusters sc
      WHERE sc.id = ra.source_cluster_id AND sc.company_id = ra.company_id)
  ) IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escalations_company_risk_state
  ON escalations(company_id, risk_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_risk_actions_company_risk_state
  ON risk_actions(company_id, risk_id, status);

COMMIT;
