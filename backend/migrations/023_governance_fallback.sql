-- Migration 023: Daily Governance Log & Absence Fallback

-- 1. EXTEND houses table for deputies
ALTER TABLE houses 
ADD COLUMN primary_rm_id UUID REFERENCES users(id),
ADD COLUMN deputy_rm_id UUID REFERENCES users(id);

-- 2. CREATE daily_review_type enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'daily_review_type') THEN
        CREATE TYPE daily_review_type AS ENUM ('Primary', 'Deputy Cover', 'Director Override');
    END IF;
END $$;

-- 3. CREATE daily_governance_log table
CREATE TABLE daily_governance_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    review_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES users(id),
    review_type daily_review_type DEFAULT 'Primary',
    daily_note TEXT,
    completed_at TIMESTAMPTZ,
    escalation_sent BOOLEAN DEFAULT FALSE,
    UNIQUE(house_id, review_date)
);

-- 4. INDEXING
CREATE INDEX idx_daily_gov_log_house_date ON daily_governance_log(house_id, review_date);
