-- Migration: 038_action_completion_weekly_validation.sql
-- Description: Add columns for action completion outcome, rationale, and RM review. 
-- Also add weekly review validation columns and action effectiveness flags table.

-- 1. Update risk_actions table
ALTER TABLE risk_actions
ADD COLUMN completion_outcome VARCHAR(30),
ADD COLUMN completion_rationale TEXT,
ADD COLUMN rm_decision VARCHAR(30),
ADD COLUMN rm_decision_at TIMESTAMPTZ,
ADD COLUMN rm_decision_comment TEXT,
ADD COLUMN trajectory_updated BOOLEAN DEFAULT FALSE;

-- 2. Update weekly_reviews table
ALTER TABLE weekly_reviews
ADD COLUMN rm_finalised_at TIMESTAMPTZ,
ADD COLUMN validation_status VARCHAR(20) DEFAULT 'Pending',
ADD COLUMN validation_by UUID REFERENCES users(id),
ADD COLUMN validation_comment TEXT,
ADD COLUMN validation_at TIMESTAMPTZ;

-- 3. Create action_effectiveness_flags table
CREATE TABLE action_effectiveness_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES risk_actions(id),
  risk_id UUID REFERENCES risks(id),
  service_id UUID NOT NULL REFERENCES houses(id),
  flag_type VARCHAR(50) NOT NULL, -- 'repeated_ineffective', 'superficial_closure', 'mismatched_completion'
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_note TEXT
);

-- Index for performance
CREATE INDEX idx_aef_service ON action_effectiveness_flags(service_id);
CREATE INDEX idx_aef_flag_type ON action_effectiveness_flags(flag_type);
