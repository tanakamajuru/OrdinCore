-- Migration 107: measure whether an intervention is working.
-- Snapshot the theme's average Risk Index at the moment the intervention starts, so
-- Effectiveness = (RiskBefore − RiskAfter) / RiskBefore × 100 can be shown on the panel.
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS risk_index_before INTEGER;
