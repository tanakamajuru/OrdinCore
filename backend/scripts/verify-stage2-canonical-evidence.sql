\set ON_ERROR_STOP on
-- Stage 2 release invariants.
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM canonical_signal_evidence_v
   WHERE evidence_type <> 'SIGNAL' OR provenance_table <> 'governance_pulses'
) THEN 1/0 ELSE 1 END AS only_governance_pulses_are_signals;

SELECT count(*) AS canonical_risk_review_count
  FROM canonical_material_count_v WHERE count_type='RISK_REVIEW';

SELECT count(*) AS direct_risk_review_count
  FROM canonical_risk_state_v WHERE needs_review;

-- These two counts must match.
DO $$
DECLARE a bigint; b bigint;
BEGIN
 SELECT count(*) INTO a FROM canonical_material_count_v WHERE count_type='RISK_REVIEW';
 SELECT count(*) INTO b FROM canonical_risk_state_v WHERE needs_review;
 IF a<>b THEN RAISE EXCEPTION 'Risk review count contract failed: % vs %',a,b; END IF;
END $$;
