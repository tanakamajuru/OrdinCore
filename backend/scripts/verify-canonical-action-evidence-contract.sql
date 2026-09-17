\set ON_ERROR_STOP on
-- Canonical Action Evidence Contract release gates.

-- New-contract effectiveness-bearing actions always have intended outcomes and lineage.
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM risk_actions
    WHERE evidence_contract_version='action-evidence-v1'
      AND review_requirement='EFFECTIVENESS_REQUIRED'
      AND (
        LENGTH(BTRIM(COALESCE(intended_outcome,''))) < 10
        OR NOT (risk_id IS NOT NULL OR governance_review_id IS NOT NULL OR source_pulse_id IS NOT NULL OR source_cluster_id IS NOT NULL OR escalation_id IS NOT NULL)
      )
 ) THEN RAISE EXCEPTION 'Invalid new effectiveness-bearing action: intended outcome/lineage missing'; END IF;
END $$;

-- New completed actions always carry evidence.
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM risk_actions
    WHERE evidence_contract_version='action-evidence-v1' AND completed_at IS NOT NULL
      AND LENGTH(BTRIM(COALESCE(completion_evidence,completion_rationale,completion_note,''))) < 10
 ) THEN RAISE EXCEPTION 'New completed action missing completion evidence'; END IF;
END $$;

-- Completion-only actions cannot remain in the effectiveness queue.
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM canonical_action_state_v
    WHERE review_requirement='COMPLETION_ONLY' AND requires_effectiveness_review
 ) THEN RAISE EXCEPTION 'Completion-only action incorrectly requires effectiveness review'; END IF;
END $$;

-- Legacy unknowns remain visibly unclassified rather than being fabricated.
SELECT COUNT(*) AS legacy_unclassified_completed_actions
  FROM risk_actions
 WHERE completed_at IS NOT NULL AND review_requirement IS NULL AND effectiveness_outcome IS NULL;

SELECT 'PASS: canonical action evidence contract' AS result;
