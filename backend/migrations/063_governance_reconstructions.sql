-- Migration 063: purpose-built store for the Incident Reconstruction wizard (FR9).
-- The wizard reconstructs the governance signal history BY HOUSE or BY PERSON up to an
-- incident day and locks an immutable account. Unlike incident_reconstruction(s), this
-- does NOT require a linked incidents row — reconstruction is read-only history assembled
-- from existing signals, so it must work without a formal incident entity.
CREATE TABLE IF NOT EXISTS governance_reconstructions (
  id                    UUID PRIMARY KEY,
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scope                 VARCHAR(20) NOT NULL,            -- 'house' | 'person'
  scope_ref             TEXT NOT NULL,                   -- house_id (uuid text) or person reference
  scope_label           TEXT,                            -- display label (house name / person)
  incident_date         DATE,
  trajectory            VARCHAR(30),                     -- Improving | Stable | Deteriorating
  contributing_factors  TEXT,
  control_failure       TEXT,
  narrative             TEXT NOT NULL DEFAULT '',
  timeline_events       JSONB NOT NULL DEFAULT '[]',
  summary               JSONB NOT NULL DEFAULT '{}',
  linked_risk_ids       JSONB NOT NULL DEFAULT '[]',
  status                VARCHAR(20) NOT NULL DEFAULT 'Draft',  -- Draft | Locked
  created_by            UUID REFERENCES users(id),
  locked_at             TIMESTAMPTZ,
  locked_by             UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gov_reconstructions_company ON governance_reconstructions(company_id, created_at DESC);
