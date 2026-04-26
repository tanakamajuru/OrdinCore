-- Migration 029: OrdinCore Alignment (Fixed)
-- 1. Add source_cluster_id and tracking columns
ALTER TABLE risks ADD COLUMN IF NOT EXISTS source_cluster_id UUID REFERENCES signal_clusters(id);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS last_linked_signal_date TIMESTAMPTZ;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS recurrence_watch_until DATE;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ;

-- 2. Action effectiveness columns
ALTER TABLE risk_actions ADD COLUMN IF NOT EXISTS effectiveness_reviewed_at TIMESTAMPTZ;
ALTER TABLE risk_actions ADD COLUMN IF NOT EXISTS effectiveness_reviewed_by UUID REFERENCES users(id);

-- 3. Daily governance log enhancements
ALTER TABLE daily_governance_log ADD COLUMN IF NOT EXISTS deputy_assigned_at TIMESTAMPTZ;
ALTER TABLE daily_governance_log ADD COLUMN IF NOT EXISTS director_alerted_at TIMESTAMPTZ;

-- 4. Threshold events table enhancements
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'threshold_events' AND column_name = 'company_id') THEN
        ALTER TABLE threshold_events ADD COLUMN company_id UUID REFERENCES companies(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'threshold_events' AND column_name = 'pulse_id') THEN
        ALTER TABLE threshold_events ADD COLUMN pulse_id UUID REFERENCES governance_pulses(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'threshold_events' AND column_name = 'description') THEN
        ALTER TABLE threshold_events ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'threshold_events' AND column_name = 'status') THEN
        ALTER TABLE threshold_events ADD COLUMN status VARCHAR(20) DEFAULT 'Pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'threshold_events' AND column_name = 'created_at') THEN
        ALTER TABLE threshold_events ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        -- Backfill created_at from fired_at if it exists
        UPDATE threshold_events SET created_at = fired_at WHERE created_at IS NULL;
    END IF;
END $$;

-- 5. System prompts for RM
CREATE TABLE IF NOT EXISTS system_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(200),
  message TEXT,
  prompt_type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_risks_source_cluster_id ON risks(source_cluster_id);
CREATE INDEX IF NOT EXISTS idx_threshold_events_created_at ON threshold_events(created_at);
