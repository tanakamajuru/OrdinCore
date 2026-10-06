-- Single source of truth: the Canonical Evidence "Effectiveness due" count must mean the SAME
-- thing the Governance Overview ribbon and the Awaiting Effectiveness list mean — effectiveness
-- reviews that are ACTIONABLE NOW. Previously it counted every action with
-- requires_effectiveness_review, which includes "Too Early To Assess" actions: scheduled future
-- re-assessments whose review date has not yet arrived. That made Canonical Evidence show 7 while
-- the Governance Overview showed 1 (6 were not-yet-due reassessments). Align the view's
-- EFFECTIVENESS_REVIEW branch to the actionable-now predicate used by rm5.service.counts().
BEGIN;
CREATE OR REPLACE VIEW canonical_material_count_v AS
SELECT company_id, 'RISK_REVIEW'::text AS count_type, id::text AS evidence_id, house_id,
       review_due_at AS due_at
  FROM canonical_risk_state_v WHERE needs_review
UNION ALL
SELECT company_id, 'ACTION_OPEN', id::text, house_id, due_date
  FROM canonical_action_state_v WHERE is_open
UNION ALL
SELECT ra.company_id, 'EFFECTIVENESS_REVIEW', ra.id::text, ra.house_id, ra.effectiveness_due_at
  FROM canonical_action_state_v ra
  LEFT JOIN canonical_review_obligation_state_v gro
    ON gro.company_id = ra.company_id AND gro.subject_id = ra.id
   AND gro.obligation_type = 'ACTION_EFFECTIVENESS' AND gro.is_actionable
 WHERE ra.requires_effectiveness_review
   AND (ra.effectiveness_outcome IS NULL
        OR (LOWER(BTRIM(COALESCE(ra.effectiveness_outcome::text, ''))) = 'too early to assess' AND gro.is_due))
UNION ALL
SELECT company_id, 'ESCALATION_OPEN', id::text, house_id, due_by
  FROM canonical_escalation_state_v WHERE is_open
UNION ALL
SELECT company_id, 'PATTERN_REVIEW', id::text, house_id, NULL::timestamptz
  FROM canonical_pattern_state_v WHERE is_active;
COMMIT;
