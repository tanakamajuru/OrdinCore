-- Migration 109: an intervention must DO something — link it to a real, actionable task.
-- When an intervention starts, the system raises a risk action on the theme's top risk,
-- assigned to the owner. These columns hold that link so the panel can send the owner
-- straight to the risk to complete the action and rate effectiveness (which closes the loop
-- back into Intervention Effectiveness).
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS linked_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS linked_action_id UUID;
