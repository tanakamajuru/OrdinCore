-- Migration 204: record WHO dismissed a risk candidate and WHEN, mirroring the
-- dismissed_by/dismissed_at columns signal_clusters already has. Without these, the
-- dismissal archive (/rm/dismissed) could not show a decision maker or a trustworthy
-- event time for candidate dismissals, and risk_candidates.dismissal_reason alone gave
-- no actor/timestamp evidence.
ALTER TABLE risk_candidates ADD COLUMN IF NOT EXISTS dismissed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE risk_candidates ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

-- Backfill existing dismissed candidates: we have no reliable record of who/when for
-- rows dismissed before this migration, so leave dismissed_by/dismissed_at NULL rather
-- than inventing a time — the archive query renders this as "Not recorded", not as
-- today's date (never use updated_at or migration time as a stand-in for dismissal time).
