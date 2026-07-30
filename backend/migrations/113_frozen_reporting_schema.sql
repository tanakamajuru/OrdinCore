-- 113_frozen_reporting_schema.sql
-- Foundation for the scoped ("frozen") reporting architecture (v2.0.0):
--   * a real site -> service -> region hierarchy
--   * a stable service_user_id linkage on the domain tables (person scope)
--   * immutable report snapshots (generate -> approve -> PDF-from-snapshot)
-- Additive only — nothing existing changes behaviour.

BEGIN;

-- ---- Service / Region hierarchy -------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS regions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE houses ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id) ON DELETE SET NULL;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS region_id  uuid REFERENCES regions(id)  ON DELETE SET NULL;

-- ---- Person linkage (service_user_id) ------------------------------------------
-- Records currently identify a person by free-text name; a stable FK lets PERSON-scoped
-- reports reconstruct one resident's history reliably. Backfilled in migration 114.
ALTER TABLE governance_pulses ADD COLUMN IF NOT EXISTS service_user_id uuid REFERENCES service_users(id) ON DELETE SET NULL;
ALTER TABLE risks             ADD COLUMN IF NOT EXISTS service_user_id uuid REFERENCES service_users(id) ON DELETE SET NULL;
ALTER TABLE escalations       ADD COLUMN IF NOT EXISTS service_user_id uuid REFERENCES service_users(id) ON DELETE SET NULL;
ALTER TABLE risk_actions      ADD COLUMN IF NOT EXISTS service_user_id uuid REFERENCES service_users(id) ON DELETE SET NULL;
ALTER TABLE interventions     ADD COLUMN IF NOT EXISTS service_user_id uuid REFERENCES service_users(id) ON DELETE SET NULL;

-- ---- Immutable report snapshots -------------------------------------------------
-- The PDF renders from the stored snapshot, never from live data — so figures, scope,
-- person/site selection, narrative, confidence, hash and approval are frozen at generation.
CREATE TABLE IF NOT EXISTS report_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL,
  report_key    text NOT NULL,
  scope_type    text NOT NULL,                 -- PERSON | SITE | SERVICE | REGION | ORGANISATION
  scope_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  site_ids      uuid[] NOT NULL DEFAULT '{}',
  person_id     uuid,
  service_id    uuid,
  region_id     uuid,
  period_start  timestamptz,
  period_end    timestamptz,
  data          jsonb NOT NULL DEFAULT '{}'::jsonb,
  narrative     text,
  confidence    jsonb,
  evidence_hash text,
  status        text NOT NULL DEFAULT 'DRAFT',  -- DRAFT | APPROVED
  generated_by  uuid,
  approved_by   uuid,
  approved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_company ON report_snapshots(company_id, report_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_sites   ON report_snapshots USING gin(site_ids);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_person  ON report_snapshots(person_id) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_report_snapshots_period  ON report_snapshots(company_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_houses_service       ON houses(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_houses_region        ON houses(region_id)  WHERE region_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pulses_service_user  ON governance_pulses(service_user_id) WHERE service_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risks_service_user   ON risks(service_user_id) WHERE service_user_id IS NOT NULL;

COMMIT;
