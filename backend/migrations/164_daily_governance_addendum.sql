-- 164: Immutable same-day daily-governance addenda (doctrine §9.2).
--
-- The primary daily review is one-per-service/date and immutable once signed. A signal that
-- arrives after sign-off must NOT reopen it; instead it is decided and captured in a signed,
-- append-only addendum linked to the parent log. Weekly governance aggregates the primary
-- review AND its addenda.
CREATE TABLE IF NOT EXISTS daily_governance_addendum (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        uuid NOT NULL,
  house_id          uuid NOT NULL,
  parent_log_id     uuid NOT NULL REFERENCES daily_governance_log(id),
  sequence          integer NOT NULL,
  review_date       date NOT NULL,
  reason            text NOT NULL,
  evidence_ids      uuid[] NOT NULL DEFAULT '{}',
  decisions_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  signed_at         timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (parent_log_id, sequence)
);
CREATE INDEX IF NOT EXISTS idx_dga_scope ON daily_governance_addendum(company_id, house_id, review_date);
CREATE INDEX IF NOT EXISTS idx_dga_parent ON daily_governance_addendum(parent_log_id);
