-- Mobile assurance and closure alignment.
-- Additive only: it keeps the frozen Signal -> Pattern -> Risk -> Escalation ->
-- Action -> Effectiveness -> Weekly Review -> Director -> RI architecture.


ALTER TABLE risk_actions
  ADD COLUMN IF NOT EXISTS escalation_id UUID REFERENCES escalations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_risk_actions_escalation
  ON risk_actions(escalation_id);

ALTER TABLE daily_governance_log
  ADD COLUMN IF NOT EXISTS exceptions_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exception_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

-- One RI sign-off is immutable evidence for one provider/week. Existing rows are
-- preserved; subsequent attempts must be rejected by the service rather than overwrite.
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_review_signoff_week
  ON provider_review_signoffs(company_id, week_ending);

