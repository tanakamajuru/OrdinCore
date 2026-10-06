-- Single source of truth for "effectiveness due now", driven by the obligation scheduler so that
-- repeat reviews after a Not Effective / Partially Effective verdict are not lost.
--
-- Problem: requires_effectiveness_review (migration 152) is true only for blank or "Too Early To
-- Assess" outcomes, so a completed action rated Not/Partially Effective — even with a scheduled
-- repeat ACTION_EFFECTIVENESS obligation — dropped out of the due queue entirely. The obligation's
-- is_due flag is NOT gated on requires_effectiveness_review, so we drive membership off the
-- obligation being due, which covers first reviews, too-early reassessments AND negative-outcome
-- repeats under one definition.
--
-- An action is effectiveness-due-now when it is an effectiveness-bearing completed action AND:
--   * its first verdict is still outstanding (effectiveness_outcome IS NULL), OR
--   * it has an OPEN ACTION_EFFECTIVENESS obligation whose review date has arrived (is_due) —
--     this is how too-early reassessments and negative-outcome repeats return, OR
--   * it is "Too Early To Assess" with NO open obligation at all — a broken/missing schedule that
--     we surface (fail-safe) rather than silently hide.
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
 WHERE ra.review_requirement = 'EFFECTIVENESS_REQUIRED'
   AND ra.is_completed
   AND (
     ra.effectiveness_outcome IS NULL
     OR EXISTS (SELECT 1 FROM canonical_review_obligation_state_v g
                 WHERE g.company_id = ra.company_id AND g.subject_id = ra.id
                   AND g.obligation_type = 'ACTION_EFFECTIVENESS' AND g.is_due)
     OR (LOWER(BTRIM(COALESCE(ra.effectiveness_outcome::text, ''))) = 'too early to assess'
         AND NOT EXISTS (SELECT 1 FROM canonical_review_obligation_state_v g2
                          WHERE g2.company_id = ra.company_id AND g2.subject_id = ra.id
                            AND g2.obligation_type = 'ACTION_EFFECTIVENESS' AND g2.status = 'OPEN'))
   )
UNION ALL
SELECT company_id, 'ESCALATION_OPEN', id::text, house_id, due_by
  FROM canonical_escalation_state_v WHERE is_open
UNION ALL
SELECT sc.company_id, 'PATTERN_REVIEW', sc.id::text, sc.house_id, sc.next_review_date::timestamptz
  FROM signal_clusters sc
  LEFT JOIN canonical_pattern_formation_v pf ON pf.cluster_id = sc.id
 WHERE sc.cluster_status IN ('Emerging', 'Escalated', 'Confirmed')
   AND sc.linked_risk_id IS NULL
   AND COALESCE(pf.qualifying_count, sc.signal_count, 0) >= 2;
COMMIT;
