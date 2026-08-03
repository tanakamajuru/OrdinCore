-- Migration 119: Team Leader acknowledgement of the Daily Governance Brief (Chapter 2).
-- The published Team Brief creates evidence that operational leaders were informed of
-- the day's governance priorities. Additive, idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS daily_brief_acknowledgements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_id UUID NOT NULL REFERENCES daily_governance_log(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (log_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_brief_ack_log ON daily_brief_acknowledgements(log_id);

COMMIT;
