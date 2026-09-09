-- Migration 129: adaptive signal library without daily taxonomy changes.
-- Staff can record a concern against a stable governance theme using the
-- virtual "Other" option. Candidate labels are collected for batch review;
-- they never change the pattern key, which remains governance_domain.

CREATE TABLE IF NOT EXISTS signal_label_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  pulse_id UUID NOT NULL REFERENCES governance_pulses(id) ON DELETE CASCADE,
  sector VARCHAR(40) NOT NULL,
  domain_name VARCHAR(60) NOT NULL,
  suggested_label VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pulse_id)
);

CREATE INDEX IF NOT EXISTS idx_signal_label_suggestions_review
  ON signal_label_suggestions(company_id, sector, status, domain_name, created_at DESC);
