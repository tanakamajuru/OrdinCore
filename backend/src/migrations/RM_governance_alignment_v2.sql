-- Migration: Align RM Governance Flows with Ordin Core Spec (PART 2)

-- 2. Action Effectiveness Tracker
CREATE TABLE IF NOT EXISTS action_effectiveness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES risk_actions(id) ON DELETE CASCADE,
    risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    risk_domain VARCHAR(50),
    outcome VARCHAR(20) NOT NULL, -- 'Effective', 'Neutral', 'Ineffective'
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data JSONB DEFAULT '{}' -- Stores frequency/severity changes for audit
);

-- 3. Risk Candidates (From Threshold Engine)
CREATE TABLE IF NOT EXISTS risk_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES signal_clusters(id) ON DELETE CASCADE,
    risk_domain VARCHAR(50) NOT NULL,
    candidate_type VARCHAR(50) NOT NULL, -- 'Pattern Emerging', 'Risk Review Required', 'Immediate Risk', 'Deteriorating Trajectory'
    source_signals UUID[] DEFAULT '{}', -- Array of signal IDs
    status VARCHAR(20) DEFAULT 'New', -- 'New', 'Promoted', 'Dismissed'
    dismissal_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Weekly Review (Expand to 15 steps + Narrative)
ALTER TABLE weekly_reviews 
ADD COLUMN IF NOT EXISTS governance_narrative TEXT,
ADD COLUMN IF NOT EXISTS overall_position VARCHAR(50); -- 'Stable', 'Watch', 'Concern', 'Escalating', 'Serious Concern'

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_risk_candidates_updated_at
    BEFORE UPDATE ON risk_candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
