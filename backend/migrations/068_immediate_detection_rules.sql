-- ============================================================================
-- Migration 068: Configurable immediate-detection & escalation rules (FAST path)
-- ----------------------------------------------------------------------------
-- Separates the FAST path (immediate, single-signal harm: safeguarding, High,
-- Critical) from the SLOW path (cumulative clustering in threshold_rules).
-- Fixes the false-negatives where a safeguarding pulse or a single High only
-- ever became a "risk candidate" in a review queue instead of escalating now.
-- ============================================================================

-- 1) Immediate-detection rules ------------------------------------------------
CREATE TABLE IF NOT EXISTS immediate_detection_rules (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Scope. company_id NULL = platform default (applies to every company until
  -- a company defines its own row for the same sector+domain+match).
  company_id         UUID REFERENCES companies(id) ON DELETE CASCADE,
  sector             VARCHAR(40)  NOT NULL,            -- 'SUPPORTED_LIVING' | 'DOMICILIARY'
  domain_name        VARCHAR(60)  NOT NULL,            -- e.g. 'Safeguarding', or '*' for any domain

  -- What makes this fire immediately (evaluate on EVERY pulse, no clustering).
  min_severity       VARCHAR(20),                      -- 'Low'|'Moderate'|'High'|'Critical' (>= this fires)
  signal_count       INTEGER NOT NULL DEFAULT 1,       -- how many matching signals in window_hours
  window_hours       INTEGER NOT NULL DEFAULT 1,       -- look-back window for signal_count
  match_any_severity BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE = domain alone is enough (e.g. Safeguarding 1/1)

  -- What to do when it fires.
  action             VARCHAR(30) NOT NULL DEFAULT 'ESCALATE'
                       CHECK (action IN ('ESCALATE','MANDATORY_REVIEW')),
  escalate_to_role   VARCHAR(40) NOT NULL DEFAULT 'REGISTERED_MANAGER'
                       CHECK (escalate_to_role IN ('REGISTERED_MANAGER','DIRECTOR','RESPONSIBLE_INDIVIDUAL')),
  sla_trigger_type   VARCHAR(60) NOT NULL DEFAULT 'HIGH_SAFEGUARDING',
  priority           VARCHAR(20) NOT NULL DEFAULT 'High'
                       CHECK (priority IN ('Medium','High','Urgent','Critical')),

  -- Governance + audit.
  rationale          TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (company_id, sector, domain_name, min_severity)
);

CREATE INDEX IF NOT EXISTS idx_idr_lookup
  ON immediate_detection_rules (sector, domain_name, is_active);
CREATE INDEX IF NOT EXISTS idx_idr_company
  ON immediate_detection_rules (company_id);

COMMENT ON TABLE immediate_detection_rules IS
  'Fast-path rules: evaluate every pulse for immediate escalation, bypassing cluster maths. company_id NULL = platform default.';

-- 2) Platform-default rules (the doctrine baseline) ---------------------------
INSERT INTO immediate_detection_rules
  (company_id, sector, domain_name, min_severity, signal_count, window_hours,
   match_any_severity, action, escalate_to_role, sla_trigger_type, priority, rationale)
VALUES
  -- SAFEGUARDING: any single safeguarding signal, any severity, fires now.
  (NULL, 'SUPPORTED_LIVING', 'Safeguarding', NULL, 1, 1, TRUE,
   'MANDATORY_REVIEW', 'REGISTERED_MANAGER', 'HIGH_SAFEGUARDING', 'Critical',
   'Any safeguarding signal requires immediate review (1/1). Never diluted by clustering.'),
  (NULL, 'DOMICILIARY', 'Safeguarding', NULL, 1, 1, TRUE,
   'MANDATORY_REVIEW', 'REGISTERED_MANAGER', 'HIGH_SAFEGUARDING', 'Critical',
   'Any safeguarding signal requires immediate review (1/1). Never diluted by clustering.'),

  -- CRITICAL severity in ANY domain: one Critical signal fires now.
  (NULL, 'SUPPORTED_LIVING', '*', 'Critical', 1, 48, FALSE,
   'ESCALATE', 'REGISTERED_MANAGER', 'SERIOUS_INCIDENT', 'Critical',
   'A single Critical-severity signal in any domain is an immediate risk.'),
  (NULL, 'DOMICILIARY', '*', 'Critical', 1, 48, FALSE,
   'ESCALATE', 'REGISTERED_MANAGER', 'SERIOUS_INCIDENT', 'Critical',
   'A single Critical-severity signal in any domain is an immediate risk.'),

  -- HIGH severity in ANY domain: one High fires now (was "2 High in 48h").
  (NULL, 'SUPPORTED_LIVING', '*', 'High', 1, 48, FALSE,
   'ESCALATE', 'REGISTERED_MANAGER', 'HIGH_SAFEGUARDING', 'High',
   'A single High-severity signal warrants immediate RM attention. Tunable per service.'),
  (NULL, 'DOMICILIARY', '*', 'High', 1, 48, FALSE,
   'ESCALATE', 'REGISTERED_MANAGER', 'HIGH_SAFEGUARDING', 'High',
   'A single High-severity signal warrants immediate RM attention. Tunable per service.')
ON CONFLICT (company_id, sector, domain_name, min_severity) DO NOTHING;

-- 3) Provenance on escalations raised by the engine ---------------------------
ALTER TABLE escalations
  ADD COLUMN IF NOT EXISTS source_pulse_id UUID REFERENCES governance_pulses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_rule_id  UUID REFERENCES immediate_detection_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trigger_type    VARCHAR(60),
  ADD COLUMN IF NOT EXISTS due_by          TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_escalations_due_by ON escalations(due_by);
CREATE INDEX IF NOT EXISTS idx_escalations_source_pulse ON escalations(source_pulse_id);

-- 4) Idempotency guard: never raise two escalations for the same pulse+rule ----
CREATE UNIQUE INDEX IF NOT EXISTS uq_escalation_pulse_rule
  ON escalations (source_pulse_id, source_rule_id)
  WHERE source_pulse_id IS NOT NULL AND source_rule_id IS NOT NULL;
