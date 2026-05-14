-- Migration 025: Action Effectiveness Tracking
-- Adds effectiveness monitoring to risk actions as per Spec 04 §2.9 and 07 §7.

-- 1. Create effectiveness enum
DO $$ 
BEGIN
    -- 5. Action Effectiveness Enum
    BEGIN
        CREATE TYPE action_effectiveness AS ENUM ('Effective', 'Neutral', 'Ineffective');
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 2. Add columns to risk_actions
ALTER TABLE risk_actions 
ADD COLUMN effectiveness action_effectiveness,
ADD COLUMN linked_review_id UUID REFERENCES weekly_reviews(id) ON DELETE SET NULL;

-- 3. Indexing for analytics
CREATE INDEX idx_risk_actions_effectiveness ON risk_actions(effectiveness);
CREATE INDEX idx_risk_actions_linked_review ON risk_actions(linked_review_id);
