-- Run after Stage 10H AUTO_SAFE remediation and resolution of every critical HUMAN_REVIEW item.
-- ON_ERROR_STOP must be enabled. Any remaining canonical vocabulary or tenant breach aborts.
DO $$
DECLARE breaches BIGINT;
BEGIN
  SELECT COUNT(*) INTO breaches FROM governance_remediation_open_items
   WHERE issue_type IN ('TENANT_LINEAGE_MISMATCH','DUPLICATE_ACTIVE_ESCALATION');
  IF breaches > 0 THEN
    RAISE EXCEPTION 'Cannot validate Stage 10I: % critical remediation item(s) remain open.', breaches;
  END IF;

  SELECT COUNT(*) INTO breaches FROM risk_actions
   WHERE status::text NOT IN ('Open','In Progress','Completed','Cancelled')
      OR (effectiveness_outcome IS NOT NULL AND effectiveness_outcome NOT IN
          ('Effective','Partially Effective','Not Effective','Too Early To Assess'));
  IF breaches > 0 THEN RAISE EXCEPTION 'Cannot validate Stage 10I: % non-canonical action row(s) remain.', breaches; END IF;

  SELECT COUNT(*) INTO breaches FROM risks
   WHERE status::text NOT IN ('Open','In Progress','Escalated','Under Review','Closed');
  IF breaches > 0 THEN RAISE EXCEPTION 'Cannot validate Stage 10I: % non-canonical risk row(s) remain.', breaches; END IF;
END $$;

ALTER TABLE risk_actions VALIDATE CONSTRAINT risk_actions_status_canonical_chk;
ALTER TABLE risk_actions VALIDATE CONSTRAINT risk_actions_effectiveness_canonical_chk;
ALTER TABLE risks VALIDATE CONSTRAINT risks_status_canonical_chk;

SELECT conrelid::regclass AS table_name, conname, convalidated
  FROM pg_constraint
 WHERE conname IN ('risk_actions_status_canonical_chk','risk_actions_effectiveness_canonical_chk','risks_status_canonical_chk')
 ORDER BY table_name::text, conname;
