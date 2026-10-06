-- Pattern lifecycle doctrine (finding D): a Confirmed/Escalated (established) pattern remains a
-- counted, reviewable pattern-review obligation until explicit leadership closure — even if recent
-- recurrence falls below two signals. Only a still-FORMING (Emerging) candidate is gated on being a
-- genuine pattern (>= 2 qualifying signals), so single-signal watches stay out while established
-- unresolved concerns stay visible. Promoted patterns (linked_risk_id) remain traceable via their
-- risk and are not counted as pending review here.
-- (EFFECTIVENESS_REVIEW branch unchanged from migration 172.)
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
   AND (sc.cluster_status IN ('Confirmed', 'Escalated')
        OR COALESCE(pf.qualifying_count, sc.signal_count, 0) >= 2);
COMMIT;
