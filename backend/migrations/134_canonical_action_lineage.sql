BEGIN;

-- A single primary origin marker supplements (and never replaces) the existing foreign keys.
-- Existing foreign keys remain the evidence chain; these two columns make its entry point explicit.
ALTER TABLE risk_actions ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE risk_actions ADD COLUMN IF NOT EXISTS source_id UUID;

ALTER TABLE risk_actions DROP CONSTRAINT IF EXISTS risk_actions_source_type_check;
ALTER TABLE risk_actions ADD CONSTRAINT risk_actions_source_type_check
  CHECK (source_type IS NULL OR source_type IN
    ('ESCALATION','GOVERNANCE_REVIEW','SIGNAL','PATTERN','RISK')) NOT VALID;

CREATE OR REPLACE FUNCTION set_risk_action_canonical_source()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Direct creation context wins. Risk/cluster/pulse links remain available for reconstruction.
  IF NEW.escalation_id IS NOT NULL THEN
    NEW.source_type := 'ESCALATION'; NEW.source_id := NEW.escalation_id;
  ELSIF NEW.governance_review_id IS NOT NULL THEN
    NEW.source_type := 'GOVERNANCE_REVIEW'; NEW.source_id := NEW.governance_review_id;
  ELSIF NEW.source_pulse_id IS NOT NULL THEN
    NEW.source_type := 'SIGNAL'; NEW.source_id := NEW.source_pulse_id;
  ELSIF NEW.source_cluster_id IS NOT NULL THEN
    NEW.source_type := 'PATTERN'; NEW.source_id := NEW.source_cluster_id;
  ELSIF NEW.risk_id IS NOT NULL THEN
    NEW.source_type := 'RISK'; NEW.source_id := NEW.risk_id;
  ELSE
    NEW.source_type := NULL; NEW.source_id := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_risk_action_canonical_source ON risk_actions;
CREATE TRIGGER trg_risk_action_canonical_source
BEFORE INSERT OR UPDATE OF escalation_id, governance_review_id, source_pulse_id,
  source_cluster_id, risk_id ON risk_actions
FOR EACH ROW EXECUTE FUNCTION set_risk_action_canonical_source();

-- Deterministic backfill only. No narrative/title matching is permitted.
UPDATE risk_actions SET
  source_type = CASE
    WHEN escalation_id IS NOT NULL THEN 'ESCALATION'
    WHEN governance_review_id IS NOT NULL THEN 'GOVERNANCE_REVIEW'
    WHEN source_pulse_id IS NOT NULL THEN 'SIGNAL'
    WHEN source_cluster_id IS NOT NULL THEN 'PATTERN'
    WHEN risk_id IS NOT NULL THEN 'RISK'
    ELSE NULL END,
  source_id = COALESCE(escalation_id, governance_review_id, source_pulse_id,
                       source_cluster_id, risk_id);

CREATE INDEX IF NOT EXISTS idx_risk_actions_canonical_source
  ON risk_actions(company_id, source_type, source_id);

-- Operations can repair genuine orphans through a controlled queue. This view does not guess.
CREATE OR REPLACE VIEW governance_lineage_exceptions AS
SELECT ra.company_id, 'ACTION'::text AS record_type, ra.id AS record_id,
       'Action has no relational source'::text AS reason, ra.created_at
FROM risk_actions ra
WHERE ra.source_id IS NULL
UNION ALL
SELECT r.company_id, 'RISK'::text, r.id,
       'Risk has neither a source pattern nor a linked signal'::text, r.created_at
FROM risks r
WHERE r.source_cluster_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM risk_signal_links l WHERE l.risk_id = r.id);

COMMIT;
