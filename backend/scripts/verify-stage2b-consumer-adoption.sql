\set ON_ERROR_STOP on
-- Stage 2B: all material populations must reconcile to canonical views.
DO $$
DECLARE a bigint; b bigint;
BEGIN
 SELECT count(*) INTO a FROM canonical_material_count_v WHERE count_type='RISK_REVIEW';
 SELECT count(*) INTO b FROM canonical_risk_state_v WHERE needs_review;
 IF a<>b THEN RAISE EXCEPTION 'RISK_REVIEW mismatch % vs %',a,b; END IF;

 SELECT count(*) INTO a FROM canonical_material_count_v WHERE count_type='ACTION_OPEN';
 SELECT count(*) INTO b FROM canonical_action_state_v WHERE is_open;
 IF a<>b THEN RAISE EXCEPTION 'ACTION_OPEN mismatch % vs %',a,b; END IF;

 SELECT count(*) INTO a FROM canonical_material_count_v WHERE count_type='EFFECTIVENESS_REVIEW';
 SELECT count(*) INTO b FROM canonical_action_state_v WHERE requires_effectiveness_review;
 IF a<>b THEN RAISE EXCEPTION 'EFFECTIVENESS_REVIEW mismatch % vs %',a,b; END IF;

 SELECT count(*) INTO a FROM canonical_material_count_v WHERE count_type='ESCALATION_OPEN';
 SELECT count(*) INTO b FROM canonical_escalation_state_v WHERE is_open;
 IF a<>b THEN RAISE EXCEPTION 'ESCALATION_OPEN mismatch % vs %',a,b; END IF;

 SELECT count(*) INTO a FROM canonical_material_count_v WHERE count_type='PATTERN_REVIEW';
 SELECT count(*) INTO b FROM canonical_pattern_state_v WHERE is_active;
 IF a<>b THEN RAISE EXCEPTION 'PATTERN_REVIEW mismatch % vs %',a,b; END IF;
END $$;

-- Every signal exposed through canonical evidence must still be a genuine governance_pulses record.
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM canonical_signal_evidence_v cse
   LEFT JOIN governance_pulses gp ON gp.id=cse.signal_id AND gp.company_id=cse.company_id
   WHERE gp.id IS NULL
 ) THEN RAISE EXCEPTION 'Canonical signal evidence contains non-governance_pulses IDs'; END IF;
END $$;
