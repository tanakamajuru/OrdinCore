-- Migration 206: idempotency key on risk_actions (escalation task allocation).
-- Same pattern as migration 122 (governance_reviews). canonicalGovernanceActionService.create's
-- existing duplicate guard was SELECT-before-INSERT (a race window) and title-only (ignored
-- assignee/deadline) -- a double-click or network retry of the SAME allocation attempt could
-- create two actions, or silently return someone else's action as if a new one had been made
-- (Nov 2026 brief: "Escalation tasks and reviews: duplicate prevention"). A unique key per
-- (company, key) lets a genuine retry resolve atomically to the one row it already created.
BEGIN;

ALTER TABLE risk_actions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_actions_idempotency
  ON risk_actions(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMIT;
