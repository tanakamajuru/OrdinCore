BEGIN;

-- Canonical rationale: the reason for a leadership decision is distinct from
-- what is happening, intended outcome, and downstream completion evidence.
ALTER TABLE governance_reviews
  ADD COLUMN IF NOT EXISTS decision_rationale TEXT;

-- Preserve any historic review evidence that was explicitly used as rationale.
UPDATE governance_reviews
   SET decision_rationale = NULLIF(TRIM(evidence), '')
 WHERE decision_rationale IS NULL
   AND NULLIF(TRIM(evidence), '') IS NOT NULL;

-- Expand the canonical effectiveness projection so every report can expose
-- what was done, what outcome was expected, what evidence was observed, and
-- who made the effectiveness judgement.
-- The new evidence columns are inserted ahead of completed_at/review_state, which
-- reorders the projection. CREATE OR REPLACE VIEW cannot rename/reorder existing
-- output columns, so drop the view first (verified: no DB-level dependents).
DROP VIEW IF EXISTS canonical_action_effectiveness_v;
CREATE VIEW canonical_action_effectiveness_v AS
SELECT
  cag.id AS action_id,
  cag.company_id,
  COALESCE(cag.house_id, r.house_id, sc.house_id, gp.house_id) AS house_id,
  cag.governance_domain AS domain,
  cag.effectiveness_outcome AS outcome,
  cag.effectiveness_reviewed_at,
  ra.effectiveness_reviewed_by,
  NULLIF(TRIM(COALESCE(eu.first_name,'') || ' ' || COALESCE(eu.last_name,'')), '') AS effectiveness_reviewer,
  ra.effectiveness_evidence,
  ra.intended_outcome,
  ra.completion_evidence,
  ra.due_date,
  cag.completed_at,
  CASE
    WHEN cag.effectiveness_final THEN 'FINAL'
    WHEN cag.effectiveness_outcome = 'Too Early To Assess' THEN 'INTERIM'
    ELSE 'NOT_REVIEWED'
  END AS review_state
FROM canonical_action_governance cag
JOIN risk_actions ra ON ra.id = cag.id AND ra.company_id = cag.company_id
LEFT JOIN risks r ON r.id = cag.risk_id AND r.company_id = cag.company_id
LEFT JOIN signal_clusters sc ON sc.id = cag.source_cluster_id AND sc.company_id = cag.company_id
LEFT JOIN governance_pulses gp ON gp.id = cag.source_pulse_id AND gp.company_id = cag.company_id
LEFT JOIN users eu ON eu.id = ra.effectiveness_reviewed_by AND eu.company_id = ra.company_id;

COMMENT ON VIEW canonical_action_effectiveness_v IS
  'Canonical reporting projection: one effectiveness outcome plus intended outcome, completion evidence, effectiveness evidence, reviewer and review state.';

COMMIT;
