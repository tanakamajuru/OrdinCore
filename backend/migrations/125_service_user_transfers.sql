-- Service-user transfers: preserve one person identity while recording every placement.
-- Historical signals, risks, actions, escalations and interventions are deliberately
-- NOT rewritten: their house_id remains the site at which the governance event occurred.

CREATE TABLE IF NOT EXISTS service_user_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_user_id UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  transfer_reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ended_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_user_placements_dates_check
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- A person can have only one current placement.
CREATE UNIQUE INDEX IF NOT EXISTS uq_service_user_active_placement
  ON service_user_placements(service_user_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_service_user_placements_person
  ON service_user_placements(service_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_user_placements_house
  ON service_user_placements(house_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_user_placements_company
  ON service_user_placements(company_id, started_at DESC);

-- Existing residents become the first known placement. The service_users.house_id
-- column remains the current-placement pointer for backwards compatibility.
INSERT INTO service_user_placements (
  company_id, service_user_id, house_id, started_at
)
SELECT h.company_id, su.id, su.house_id, COALESCE(su.created_at, NOW())
  FROM service_users su
  JOIN houses h ON h.id = su.house_id
 WHERE NOT EXISTS (
   SELECT 1 FROM service_user_placements sup WHERE sup.service_user_id = su.id
 );

