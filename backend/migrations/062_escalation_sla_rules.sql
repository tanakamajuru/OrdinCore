-- Migration 062: make the time-bound escalation SLAs editable (were a hardcoded map in
-- escalations.service). Seeded from the current defaults so behaviour is unchanged; the
-- Escalation SLAs admin screen edits these and escalationDueBy() reads them (cached).
CREATE TABLE IF NOT EXISTS escalation_sla_rules (
  trigger_type   VARCHAR(60) PRIMARY KEY,
  hours          INTEGER NOT NULL,
  description    TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO escalation_sla_rules (trigger_type, hours, description) VALUES
  ('HIGH_SAFEGUARDING',        24, 'High-severity safeguarding signal — review within 24h'),
  ('SERIOUS_INCIDENT',         24, 'Serious incident acknowledged — review within 24h'),
  ('SIMILAR_SIGNALS_14_DAYS',  72, 'Similar signals recurring within 14 days'),
  ('CROSS_SERVICE_PATTERN',    72, 'Same pattern seen across multiple services'),
  ('ACTION_INEFFECTIVE_TWICE', 72, 'A risk action rated ineffective twice'),
  ('REOPENED_RISK',            72, 'A previously closed risk reopened')
ON CONFLICT (trigger_type) DO NOTHING;
