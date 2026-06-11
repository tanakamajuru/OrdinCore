-- Migration 058: Reconcile production schema with code/dev DB (additive only).
-- ADD COLUMN IF NOT EXISTS only — no drops, no data changes. Fixes assorted
-- "column does not exist" 500s (promote-from-cluster, etc.) caused by columns
-- that the code references but no committed migration ever created.

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(30) DEFAULT 'entity'::character varying,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE daily_governance_log
  ADD COLUMN IF NOT EXISTS is_deputy_review boolean DEFAULT false;

ALTER TABLE escalations
  ADD COLUMN IF NOT EXISTS severity_at_escalation VARCHAR(10),
  ADD COLUMN IF NOT EXISTS escalation_type VARCHAR(15) DEFAULT 'governance'::character varying,
  ADD COLUMN IF NOT EXISTS service_unit_id uuid,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

ALTER TABLE governance_pulses
  ADD COLUMN IF NOT EXISTS week_start date,
  ADD COLUMN IF NOT EXISTS pulse_date date,
  ADD COLUMN IF NOT EXISTS signals jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS signal_flags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS locked_by uuid,
  ADD COLUMN IF NOT EXISTS flags jsonb DEFAULT '[]'::jsonb;

ALTER TABLE governance_templates
  ADD COLUMN IF NOT EXISTS category VARCHAR(30);

ALTER TABLE house_settings
  ADD COLUMN IF NOT EXISTS health_rating VARCHAR(20) DEFAULT 'Healthy'::character varying;

ALTER TABLE houses
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS linked_risk_id uuid,
  ADD COLUMN IF NOT EXISTS category VARCHAR(20);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

ALTER TABLE risk_actions
  ADD COLUMN IF NOT EXISTS rm_decision VARCHAR(30),
  ADD COLUMN IF NOT EXISTS rm_decision_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rm_decision_comment text,
  ADD COLUMN IF NOT EXISTS trajectory_updated boolean DEFAULT false;

ALTER TABLE signal_clusters
  ADD COLUMN IF NOT EXISTS linked_person VARCHAR(200);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

ALTER TABLE weekly_reviews
  ADD COLUMN IF NOT EXISTS rm_finalised_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'Pending'::character varying,
  ADD COLUMN IF NOT EXISTS validation_by uuid,
  ADD COLUMN IF NOT EXISTS validation_comment text,
  ADD COLUMN IF NOT EXISTS validation_at TIMESTAMPTZ;
