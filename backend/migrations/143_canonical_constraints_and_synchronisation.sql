-- Stage 10I: enforce canonical vocabulary, tenant-safe lineage and immutable evidence.
-- New constraints are NOT VALID so unresolved Stage-10H history is visible without blocking
-- deployment; PostgreSQL still enforces them for every new or changed row.
BEGIN;

ALTER TABLE risk_actions DROP CONSTRAINT IF EXISTS risk_actions_status_check;
ALTER TABLE risk_actions ALTER COLUMN status SET DEFAULT 'Open';
ALTER TABLE risk_actions DROP CONSTRAINT IF EXISTS risk_actions_status_canonical_chk;
ALTER TABLE risk_actions ADD CONSTRAINT risk_actions_status_canonical_chk
  CHECK (status::text IN ('Open','In Progress','Completed','Cancelled')) NOT VALID;

ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_check;
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_canonical_chk;
ALTER TABLE risks ADD CONSTRAINT risks_status_canonical_chk
  CHECK (status::text IN ('Open','In Progress','Escalated','Under Review','Closed')) NOT VALID;

ALTER TABLE risk_actions DROP CONSTRAINT IF EXISTS risk_actions_effectiveness_canonical_chk;
ALTER TABLE risk_actions ADD CONSTRAINT risk_actions_effectiveness_canonical_chk
  CHECK (effectiveness_outcome IS NULL OR effectiveness_outcome IN
    ('Effective','Partially Effective','Not Effective','Too Early To Assess')) NOT VALID;

-- Effectiveness reviews are evidence, not editable current state.
CREATE OR REPLACE FUNCTION reject_effectiveness_history_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'action_effectiveness_reviews is append-only; add a new review instead of changing history.';
END $$;
DROP TRIGGER IF EXISTS trg_effectiveness_history_immutable ON action_effectiveness_reviews;
CREATE TRIGGER trg_effectiveness_history_immutable
BEFORE UPDATE OR DELETE ON action_effectiveness_reviews
FOR EACH ROW EXECUTE FUNCTION reject_effectiveness_history_mutation();

-- Every action relationship must resolve inside the action's tenant.
CREATE OR REPLACE FUNCTION validate_risk_action_tenant_lineage()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.risk_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM risks x WHERE x.id=NEW.risk_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: action risk belongs to another company or does not exist.';
  END IF;
  IF NEW.escalation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM escalations x WHERE x.id=NEW.escalation_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: action escalation belongs to another company or does not exist.';
  END IF;
  IF NEW.governance_review_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM governance_reviews x WHERE x.id=NEW.governance_review_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: action governance review belongs to another company or does not exist.';
  END IF;
  IF NEW.source_pulse_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM governance_pulses x WHERE x.id=NEW.source_pulse_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: action signal belongs to another company or does not exist.';
  END IF;
  IF NEW.source_cluster_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM signal_clusters x WHERE x.id=NEW.source_cluster_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: action pattern belongs to another company or does not exist.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_risk_action_tenant_lineage ON risk_actions;
CREATE TRIGGER trg_risk_action_tenant_lineage
BEFORE INSERT OR UPDATE OF company_id, risk_id, escalation_id, governance_review_id, source_pulse_id, source_cluster_id
ON risk_actions FOR EACH ROW EXECUTE FUNCTION validate_risk_action_tenant_lineage();

CREATE OR REPLACE FUNCTION validate_escalation_tenant_lineage()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.risk_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM risks x WHERE x.id=NEW.risk_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: escalation risk belongs to another company or does not exist.';
  END IF;
  IF NEW.source_governance_review_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM governance_reviews x WHERE x.id=NEW.source_governance_review_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: escalation governance review belongs to another company or does not exist.';
  END IF;
  IF NEW.source_pulse_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM governance_pulses x WHERE x.id=NEW.source_pulse_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: escalation signal belongs to another company or does not exist.';
  END IF;
  IF NEW.source_cluster_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM signal_clusters x WHERE x.id=NEW.source_cluster_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: escalation pattern belongs to another company or does not exist.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_escalation_tenant_lineage ON escalations;
CREATE TRIGGER trg_escalation_tenant_lineage
BEFORE INSERT OR UPDATE OF company_id, risk_id, source_governance_review_id, source_pulse_id, source_cluster_id
ON escalations FOR EACH ROW EXECUTE FUNCTION validate_escalation_tenant_lineage();

CREATE OR REPLACE FUNCTION validate_governance_review_tenant_lineage()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.service_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM houses x WHERE x.id=NEW.service_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: governance review service belongs to another company or does not exist.';
  END IF;
  IF NEW.risk_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM risks x WHERE x.id=NEW.risk_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: governance review risk belongs to another company or does not exist.';
  END IF;
  IF NEW.escalation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM escalations x WHERE x.id=NEW.escalation_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: governance review escalation belongs to another company or does not exist.';
  END IF;
  IF NEW.pulse_entry_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM governance_pulses x WHERE x.id=NEW.pulse_entry_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: governance review signal belongs to another company or does not exist.';
  END IF;
  IF NEW.cluster_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM signal_clusters x WHERE x.id=NEW.cluster_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: governance review pattern belongs to another company or does not exist.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_governance_review_tenant_lineage ON governance_reviews;
CREATE TRIGGER trg_governance_review_tenant_lineage
BEFORE INSERT OR UPDATE OF company_id, service_id, risk_id, escalation_id, pulse_entry_id, cluster_id
ON governance_reviews FOR EACH ROW EXECUTE FUNCTION validate_governance_review_tenant_lineage();

CREATE OR REPLACE FUNCTION validate_risk_signal_link_tenant_lineage()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_company UUID;
BEGIN
  SELECT company_id INTO source_company FROM governance_pulses WHERE id=NEW.pulse_entry_id;
  IF source_company IS NULL THEN RETURN NEW; END IF; -- ordinary FK handles a missing signal
  IF NEW.risk_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM risks x WHERE x.id=NEW.risk_id AND x.company_id=source_company) THEN
    RAISE EXCEPTION 'Tenant lineage violation: signal and risk belong to different companies.';
  END IF;
  IF NEW.cluster_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM signal_clusters x WHERE x.id=NEW.cluster_id AND x.company_id=source_company) THEN
    RAISE EXCEPTION 'Tenant lineage violation: signal and pattern belong to different companies.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_risk_signal_link_tenant_lineage ON risk_signal_links;
CREATE TRIGGER trg_risk_signal_link_tenant_lineage
BEFORE INSERT OR UPDATE OF pulse_entry_id, risk_id, cluster_id
ON risk_signal_links FOR EACH ROW EXECUTE FUNCTION validate_risk_signal_link_tenant_lineage();

CREATE OR REPLACE FUNCTION validate_review_obligation_tenant_lineage()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.source_action_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM risk_actions x WHERE x.id=NEW.source_action_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: review obligation action belongs to another company or does not exist.';
  END IF;
  IF NEW.source_risk_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM risks x WHERE x.id=NEW.source_risk_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: review obligation risk belongs to another company or does not exist.';
  END IF;
  IF NEW.source_escalation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM escalations x WHERE x.id=NEW.source_escalation_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: review obligation escalation belongs to another company or does not exist.';
  END IF;
  IF NEW.source_cluster_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM signal_clusters x WHERE x.id=NEW.source_cluster_id AND x.company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Tenant lineage violation: review obligation pattern belongs to another company or does not exist.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_review_obligation_tenant_lineage ON governance_review_obligations;
CREATE TRIGGER trg_review_obligation_tenant_lineage
BEFORE INSERT OR UPDATE OF company_id, source_action_id, source_risk_id, source_escalation_id, source_cluster_id
ON governance_review_obligations FOR EACH ROW EXECUTE FUNCTION validate_review_obligation_tenant_lineage();

-- Prevent a second active escalation sharing any stable canonical source. Historical duplicates
-- remain for Stage-10H human review; the trigger prevents new divergence.
CREATE OR REPLACE FUNCTION prevent_duplicate_active_escalation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF LOWER(COALESCE(NEW.lifecycle_status::text, NEW.status::text, 'open')) IN ('closed','resolved') THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM escalations e
     WHERE e.company_id=NEW.company_id AND e.id<>NEW.id
       AND LOWER(COALESCE(e.lifecycle_status::text,e.status::text,'open')) NOT IN ('closed','resolved')
       AND ((NEW.risk_id IS NOT NULL AND e.risk_id=NEW.risk_id)
         OR (NEW.source_pulse_id IS NOT NULL AND e.source_pulse_id=NEW.source_pulse_id)
         OR (NEW.source_cluster_id IS NOT NULL AND e.source_cluster_id=NEW.source_cluster_id)
         OR (NEW.source_governance_review_id IS NOT NULL AND e.source_governance_review_id=NEW.source_governance_review_id))
  ) THEN RAISE EXCEPTION 'An active escalation already exists for this governance source.'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_no_duplicate_active_escalation ON escalations;
CREATE TRIGGER trg_no_duplicate_active_escalation
BEFORE INSERT OR UPDATE OF company_id, risk_id, source_pulse_id, source_cluster_id,
  source_governance_review_id, status, lifecycle_status ON escalations
FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_active_escalation();

-- Durable system-event idempotency is opt-in per material event.
ALTER TABLE system_events ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE system_events ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_system_event_idempotency
  ON system_events(company_id, event_type, idempotency_key)
  WHERE company_id IS NOT NULL AND idempotency_key IS NOT NULL;

COMMIT;
