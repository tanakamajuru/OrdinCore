-- Stage 10G: one reporting projection for action effectiveness.
-- Dashboards, frozen reports, PDFs and narratives must classify the same action identically.
BEGIN;

CREATE OR REPLACE VIEW canonical_action_effectiveness_v AS
SELECT
  cag.id AS action_id,
  cag.company_id,
  COALESCE(cag.house_id, r.house_id, sc.house_id, gp.house_id) AS house_id,
  cag.governance_domain AS domain,
  cag.effectiveness_outcome AS outcome,
  cag.effectiveness_reviewed_at,
  cag.completed_at,
  CASE
    WHEN cag.effectiveness_final THEN 'FINAL'
    WHEN cag.effectiveness_outcome = 'Too Early To Assess' THEN 'INTERIM'
    ELSE 'NOT_REVIEWED'
  END AS review_state
FROM canonical_action_governance cag
LEFT JOIN risks r ON r.id = cag.risk_id AND r.company_id = cag.company_id
LEFT JOIN signal_clusters sc ON sc.id = cag.source_cluster_id AND sc.company_id = cag.company_id
LEFT JOIN governance_pulses gp ON gp.id = cag.source_pulse_id AND gp.company_id = cag.company_id;

COMMENT ON VIEW canonical_action_effectiveness_v IS
  'Canonical Stage 10G reporting projection. Too Early To Assess is interim, never final or unclassified.';

COMMIT;
