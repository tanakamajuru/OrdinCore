\set ON_ERROR_STOP on
-- Stage 2 release invariants.
-- A signal is only a governance_pulses row. (Uses RAISE, not a constant 1/0 — Postgres
-- constant-folds 1/0 at plan time and would error even when the CASE branch is not taken.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM canonical_signal_evidence_v
              WHERE evidence_type <> 'SIGNAL' OR provenance_table <> 'governance_pulses') THEN
    RAISE EXCEPTION 'Signal provenance contract failed: a non-governance_pulses row appears as a signal.';
  END IF;
END $$;
SELECT 'only_governance_pulses_are_signals: PASS' AS check;

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
