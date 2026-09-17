-- 153 · Phase 6 historical remediation of legacy unclassified risk_actions.
--
-- Migration 152 (Canonical Action Evidence Contract) intentionally left a residue of actions with
-- review_requirement = NULL: those with no intended_outcome, no effectiveness_outcome/effectiveness
-- value, and no action_effectiveness_reviews row. 152 refused to silently reclassify them or invent
-- evidence. This migration is the deliberate, reviewed remediation of that residue.
--
-- Classification rule (conservative, evidence-led): an action that never carried any effectiveness
-- intent or verdict cannot be retro-fitted with an effectiveness obligation without inventing
-- evidence. It is therefore COMPLETION_ONLY — it requires completion evidence, not an effectiveness
-- review. Any legacy action that DID carry effectiveness signals was already set to
-- EFFECTIVENESS_REQUIRED by 152 and is untouched here (the WHERE guards re-confirm this).
--
-- The batch is tagged with a distinct evidence_contract_version so the remediation is auditable and
-- can be distinguished from both live-contract classification and 152's legacy-classified set.

UPDATE risk_actions ra
   SET review_requirement = 'COMPLETION_ONLY',
       evidence_contract_version = COALESCE(evidence_contract_version, 'phase6-remediated-v1')
 WHERE review_requirement IS NULL
   AND NULLIF(BTRIM(COALESCE(ra.intended_outcome,'')),'') IS NULL
   AND ra.effectiveness_outcome IS NULL
   AND ra.effectiveness IS NULL
   AND NOT EXISTS (
     SELECT 1 FROM action_effectiveness_reviews aer
      WHERE aer.company_id = ra.company_id AND aer.action_id = ra.id
   );

-- Post-condition guard: after this migration NO risk_action may remain unclassified. If any row is
-- still NULL it means it carries effectiveness signals that 152 should have classified — surface it
-- loudly rather than leave a silent gap in the evidence contract.
DO $$
DECLARE remaining INT;
BEGIN
  SELECT COUNT(*) INTO remaining FROM risk_actions WHERE review_requirement IS NULL;
  IF remaining > 0 THEN
    RAISE EXCEPTION 'Phase 6 remediation incomplete: % risk_actions still have NULL review_requirement', remaining;
  END IF;
END $$;
