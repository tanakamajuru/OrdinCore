-- ============================================================================
-- Migration 074: publish a validated weekly review to the house team, and log a
-- per-staff acknowledgement (the evidence findings were communicated).
-- ----------------------------------------------------------------------------
-- Today a finalised review only notifies the RI/Director for validation — nothing
-- reaches the team that recorded the signals and carries out the actions. This adds
-- a publish step (LOCKED → published) that fans out to the house team, and an
-- acknowledgement log so "we told the team" becomes "here is each person, with the
-- time they confirmed they read it." For CQC Well-Led.
-- ============================================================================

ALTER TABLE weekly_reviews
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);

-- Per-staff acknowledgement log (the evidence). One ack per person per review.
CREATE TABLE IF NOT EXISTS weekly_review_acknowledgements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL,
  review_id        UUID NOT NULL REFERENCES weekly_reviews(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id),
  acknowledged_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wra_review ON weekly_review_acknowledgements(review_id);
