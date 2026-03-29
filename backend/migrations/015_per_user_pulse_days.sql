-- Migration 015: Per-User Pulse Days
-- Add pulse_days to users table
ALTER TABLE users ADD COLUMN pulse_days JSONB DEFAULT '[]';

-- Add assigned_user_id to governance_pulses table
ALTER TABLE governance_pulses ADD COLUMN assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_governance_pulses_assigned_user_id ON governance_pulses(assigned_user_id);

-- Data Migration: Copy existing house pulse_days to their primary managers
UPDATE users u
SET pulse_days = hs.settings->'pulse_days'
FROM houses h
JOIN house_settings hs ON hs.house_id = h.id
WHERE h.manager_id = u.id AND hs.settings ? 'pulse_days';

-- Update existing pulses to assign them to the house manager if not already assigned
UPDATE governance_pulses gp
SET assigned_user_id = h.manager_id
FROM houses h
WHERE h.id = gp.service_unit_id AND gp.assigned_user_id IS NULL;
