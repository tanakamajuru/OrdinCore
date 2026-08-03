-- Migration 120: allow governance-decision tasks that are not (yet) tied to a risk.
-- Chapter 3 — the Daily Governance Review creates tasks for Team Leaders directly from
-- signals/patterns/decisions, before any formal risk exists. risk_actions.risk_id was
-- NOT NULL; a decision task links to its governance_review (migration 118) instead.
-- Additive and reversible; existing risk-linked actions are unaffected.

BEGIN;

ALTER TABLE risk_actions ALTER COLUMN risk_id DROP NOT NULL;

-- House context for tasks that have no risk to inherit it from (keeps My Work / scope
-- queries able to place the task in a service).
ALTER TABLE risk_actions
  ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES houses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_risk_actions_house ON risk_actions(house_id);

COMMIT;
