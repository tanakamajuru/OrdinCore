-- Mobile parity with the frozen architecture: frontline staff flag immediate action;
-- the Registered Manager owns the governance severity decision.
ALTER TYPE severity_level ADD VALUE IF NOT EXISTS 'Unrated' BEFORE 'Low';
ALTER TABLE governance_pulses
  ADD COLUMN IF NOT EXISTS requires_immediate_action BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS client_submission_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_governance_pulses_client_submission
  ON governance_pulses(company_id, client_submission_id) WHERE client_submission_id IS NOT NULL;
