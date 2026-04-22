-- Migration 027: Weekly Review Step Selection & Incident Reconstruction Schema
-- Enhances weekly reviews with step tracking and implements the flat 17-section reconstruction schema.

-- 1. Enhance weekly_reviews
ALTER TABLE weekly_reviews 
ADD COLUMN IF NOT EXISTS step_reached INT DEFAULT 1;

-- 2. Drop JSONB reconstruction and recreate with flat 17 sections
DROP TABLE IF EXISTS incident_reconstruction CASCADE;

CREATE TABLE incident_reconstruction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    
    -- Status & Governance
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Under Review', 'Completed', 'Approved')),
    reconstruction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    lead_investigator UUID NOT NULL REFERENCES users(id),
    
    -- 17 Mandatory Sections (Spec mapping)
    s1_metadata JSONB DEFAULT '{}',
    s2_incident_summary TEXT,
    s3_chronology JSONB DEFAULT '[]',
    s4_signal_chain JSONB DEFAULT '[]', -- Linked signals
    s5_trajectory_at_time trajectory_type,
    s6_contributing_factors TEXT,
    s7_control_weaknesses TEXT,
    s8_staffing_context TEXT,
    s9_governance_oversight TEXT,
    s10_resident_impact TEXT,
    s11_family_external_comms TEXT,
    s12_immediate_actions_taken TEXT,
    s13_systemic_lessons TEXT,
    s14_investigator_observations TEXT,
    s15_narrative_summary TEXT,
    s16_recommendations TEXT,
    s17_director_signoff BOOLEAN DEFAULT FALSE,
    
    -- Completion Metadata
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(incident_id)
);

-- Indexing
CREATE INDEX idx_incident_reconstruction_incident ON incident_reconstruction(incident_id);
CREATE INDEX idx_incident_reconstruction_status ON incident_reconstruction(status);
