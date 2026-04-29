-- Migration 035: Stabilize Schema and Worker Compatibility

-- 1. Update threshold_output_type enum
-- Check if the value exists first (for robustness)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'threshold_output_type' AND e.enumlabel = 'Risk Review Required') THEN
        ALTER TYPE threshold_output_type ADD VALUE 'Risk Review Required';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'threshold_output_type' AND e.enumlabel = 'Control Failure') THEN
        ALTER TYPE threshold_output_type ADD VALUE 'Control Failure';
    END IF;
END $$;

-- 2. Ensure risks table has worker-required columns
ALTER TABLE risks ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_domain TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS last_linked_signal_date TIMESTAMPTZ;

-- 3. Ensure daily_governance_log table exists and has required columns
-- If it doesn't exist, create it (it seems it was missing from migrations)
CREATE TABLE IF NOT EXISTS daily_governance_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    review_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    review_type VARCHAR(50) DEFAULT 'Regular',
    escalation_sent BOOLEAN DEFAULT FALSE,
    deputy_assigned_at TIMESTAMPTZ,
    director_alerted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(house_id, review_date)
);

-- 4. Fix threshold_events table
ALTER TABLE threshold_events ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE threshold_events ADD COLUMN IF NOT EXISTS pulse_id UUID REFERENCES governance_pulses(id);
ALTER TABLE threshold_events ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Pending';
ALTER TABLE threshold_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE threshold_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Update company_id in threshold_events from houses if missing
UPDATE threshold_events te
SET company_id = h.company_id
FROM houses h
WHERE te.house_id = h.id AND te.company_id IS NULL;

-- 5. Add missing indexes
CREATE INDEX IF NOT EXISTS idx_risks_closed_at ON risks(closed_at);
CREATE INDEX IF NOT EXISTS idx_daily_governance_log_house_date ON daily_governance_log(house_id, review_date);
