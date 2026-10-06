-- Single source of truth (patterns): the Canonical Evidence "Pattern reviews" count must mean the
-- SAME thing the Governance Overview ribbon means — genuine patterns awaiting a decision, not every
-- active cluster. is_active counted single-signal "watches" too (Gella: 25), while the Overview
-- counts only clusters that qualify as real patterns (qualifying signals >= 2, not yet promoted to
-- a risk) — 0. Align the view's PATTERN_REVIEW branch to the rm5.service.counts() predicate.
-- (EFFECTIVENESS_REVIEW branch unchanged from migration 170.)
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
SELECT sc.company_id, 'PATTERN_REVIEW', sc.id::text, sc.house_id, sc.next_review_date::timestamptz
  FROM signal_clusters sc
  LEFT JOIN canonical_pattern_formation_v pf ON pf.cluster_id = sc.id
 WHERE sc.cluster_status IN ('Emerging', 'Escalated', 'Confirmed')
   AND sc.linked_risk_id IS NULL
   AND COALESCE(pf.qualifying_count, sc.signal_count, 0) >= 2;
COMMIT;
