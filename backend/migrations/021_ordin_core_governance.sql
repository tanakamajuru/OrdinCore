-- Migration 021: OrdinCore Signal Stack Transformation
-- This migration upgrades the template-based governance to the Signal/Pattern stack.

-- 1. CLEANUP: Remove old governance records as requested by user
DELETE FROM governance_answers;
DELETE FROM governance_pulses;

-- 2. CREATE ENUMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signal_type') THEN
        CREATE TYPE signal_type AS ENUM ('Incident', 'Concern', 'Observation', 'Safeguarding', 'Medication', 'Staffing', 'Environment', 'Positive');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severity_level') THEN
        CREATE TYPE severity_level AS ENUM ('Low', 'Moderate', 'High', 'Critical');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'happened_before') THEN
        CREATE TYPE happened_before AS ENUM ('Yes', 'No', 'Unsure');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pattern_concern') THEN
        CREATE TYPE pattern_concern AS ENUM ('None', 'Possible', 'Clear', 'Escalating');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escalation_level') THEN
        CREATE TYPE escalation_level AS ENUM ('None', 'Manager Review', 'Urgent Review', 'Immediate Escalation');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE review_status AS ENUM ('New', 'Reviewed', 'Closed', 'Monitoring', 'Linked');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cluster_status') THEN
        CREATE TYPE cluster_status AS ENUM ('Emerging', 'Confirmed', 'Resolved', 'Escalated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trajectory_type') THEN
        CREATE TYPE trajectory_type AS ENUM ('Improving', 'Stable', 'Deteriorating', 'Critical');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'threshold_output_type') THEN
        CREATE TYPE threshold_output_type AS ENUM ('Signal Flag', 'Risk Proposal', 'Mandatory Review');
    END IF;
END $$;

-- 3. EXTEND governance_pulses table
ALTER TABLE governance_pulses 
  DROP COLUMN template_id,
  DROP COLUMN status,
  DROP COLUMN due_date,
  DROP COLUMN compliance_score,
  ADD COLUMN entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN entry_time TIME NOT NULL DEFAULT CURRENT_TIME,
  ADD COLUMN related_person VARCHAR(200),
  ADD COLUMN signal_type signal_type NOT NULL DEFAULT 'Observation',
  ADD COLUMN risk_domain TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN immediate_action TEXT,
  ADD COLUMN severity severity_level NOT NULL DEFAULT 'Low',
  ADD COLUMN has_happened_before happened_before NOT NULL DEFAULT 'No',
  ADD COLUMN pattern_concern pattern_concern NOT NULL DEFAULT 'None',
  ADD COLUMN escalation_required escalation_level NOT NULL DEFAULT 'None',
  ADD COLUMN evidence_url TEXT,
  ADD COLUMN review_status review_status DEFAULT 'New',
  ADD COLUMN reviewed_by UUID REFERENCES users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ;

-- Rename description if needed (it already exists as 'notes', let's repurpose or keep)
-- The spec says 'description'. Let's rename 'notes' to 'description'.
ALTER TABLE governance_pulses RENAME COLUMN notes TO description;
ALTER TABLE governance_pulses ALTER COLUMN description SET NOT NULL;

-- 4. CREATE signal_clusters table
CREATE TABLE signal_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    risk_domain TEXT NOT NULL,
    cluster_label VARCHAR(300) NOT NULL,
    cluster_status cluster_status NOT NULL DEFAULT 'Emerging',
    signal_count INT DEFAULT 0,
    first_signal_date DATE NOT NULL,
    last_signal_date DATE NOT NULL,
    trajectory trajectory_type NOT NULL DEFAULT 'Stable',
    linked_risk_id UUID, -- Will link to risks table in Phase 2
    created_by_system BOOLEAN DEFAULT TRUE,
    dismissed_by UUID REFERENCES users(id),
    dismiss_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE threshold_events table
CREATE TABLE threshold_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    rule_number INT NOT NULL,
    rule_name TEXT NOT NULL,
    cluster_id UUID REFERENCES signal_clusters(id) ON DELETE CASCADE,
    output_type threshold_output_type NOT NULL,
    fired_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    dismissed BOOLEAN DEFAULT FALSE,
    dismiss_reason TEXT
);

-- 6. CREATE risk_signal_links table
CREATE TABLE risk_signal_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_id UUID NOT NULL, -- Will link to risks table in Phase 2
    pulse_entry_id UUID NOT NULL REFERENCES governance_pulses(id) ON DELETE CASCADE,
    linked_by UUID NOT NULL REFERENCES users(id),
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    link_note TEXT,
    UNIQUE(risk_id, pulse_entry_id)
);

-- 7. INDEXING
CREATE INDEX idx_governance_pulses_house_date ON governance_pulses(house_id, entry_date);
CREATE INDEX idx_governance_pulses_review_status ON governance_pulses(review_status, created_at);
CREATE INDEX idx_signal_clusters_house_status ON signal_clusters(house_id, cluster_status);
CREATE INDEX idx_threshold_events_house_fired ON threshold_events(house_id, fired_at);
