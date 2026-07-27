-- 111_action_escalation_stage.sql
-- Governance Compliance: an overdue ACTION must not sit silently. It climbs an aging ladder
-- (owner → Team Leader → Registered Manager → Director → governance report) as it ages. We record
-- the last stage the ladder fired so the hourly sweep notifies each level exactly once instead of
-- re-chasing every hour.
--
-- stage 0 = not yet overdue / no chase; 1 = owner reminded (24h); 2 = TL (48h); 3 = RM (72h);
-- 4 = Director (7d); 5 = surfaced in governance report (14d).

BEGIN;

ALTER TABLE risk_actions ADD COLUMN IF NOT EXISTS escalation_stage INT NOT NULL DEFAULT 0;
ALTER TABLE risk_actions ADD COLUMN IF NOT EXISTS escalation_stage_at TIMESTAMPTZ;

-- The sweep looks up open, past-due actions by tenant.
CREATE INDEX IF NOT EXISTS idx_risk_actions_open_due
  ON risk_actions(company_id, due_date)
  WHERE status NOT IN ('Complete','Completed','Cancelled');

COMMIT;
