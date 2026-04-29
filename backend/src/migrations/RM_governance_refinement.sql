-- Migration: RM Governance Refinement (Action Effectiveness & Weekly Review)

-- 1. Enhance action_effectiveness with refined columns
ALTER TABLE action_effectiveness 
ADD COLUMN IF NOT EXISTS service_id UUID,
ADD COLUMN IF NOT EXISTS measurement_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS signals_before_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS signals_after_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS severity_before_max VARCHAR(20),
ADD COLUMN IF NOT EXISTS severity_after_max VARCHAR(20),
ADD COLUMN IF NOT EXISTS rm_override_outcome VARCHAR(20),
ADD COLUMN IF NOT EXISTS rm_override_reason TEXT,
ADD COLUMN IF NOT EXISTS is_auto_calculated BOOLEAN DEFAULT TRUE;

-- 2. Add effectiveness tracking to risk_actions
ALTER TABLE risk_actions 
ADD COLUMN IF NOT EXISTS effectiveness_measured_at TIMESTAMP WITH TIME ZONE;

-- 3. Refine Weekly Review with Control Failure Analysis
ALTER TABLE weekly_reviews 
ADD COLUMN IF NOT EXISTS control_failure_analysis TEXT,
ADD COLUMN IF NOT EXISTS effectiveness_summary JSONB DEFAULT '{}';

-- 4. Add Deputy Override Flags to Daily Log
ALTER TABLE daily_governance_log
ADD COLUMN IF NOT EXISTS enhanced_oversight_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS director_notified_at TIMESTAMP WITH TIME ZONE;

-- 5. Add linked_risk_id to risk_candidates to track promotion
ALTER TABLE risk_candidates
ADD COLUMN IF NOT EXISTS linked_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL;

-- 6. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_action_effectiveness_action_id ON action_effectiveness(action_id);
CREATE INDEX IF NOT EXISTS idx_action_effectiveness_measurement_date ON action_effectiveness(measurement_date);
CREATE INDEX IF NOT EXISTS idx_risk_actions_effectiveness_measured_at ON risk_actions(effectiveness_measured_at) WHERE effectiveness_measured_at IS NULL;
