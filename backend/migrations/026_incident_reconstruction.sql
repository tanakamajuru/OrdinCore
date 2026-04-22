-- Migration 026: Incident Reconstruction Module
-- Implements the 17-section reconstruction template as per Incident Reconstruction spec.

CREATE TABLE incident_reconstruction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    
    -- Status & Governance
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Under Review', 'Completed', 'Approved')),
    reconstruction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    lead_investigator UUID NOT NULL REFERENCES users(id),
    
    -- 17 Sections (stored in JSONB for flexible template evolution)
    -- Sections mapping:
    -- 1. Metadata, 2. Summary, 3. Timeline, 4. Signal Analysis, 5. Trajectory, 
    -- 6. Factors, 7. Control Failures, 8-14. Detail Sections, 15. Narrative, 
    -- 16. Actions, 17. Governance Approval.
    sections JSONB NOT NULL DEFAULT '{}',
    
    -- Completion Metadata
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(incident_id) -- Only one reconstruction per incident
);

-- Indexing
CREATE INDEX idx_incident_reconstruction_incident ON incident_reconstruction(incident_id);
CREATE INDEX idx_incident_reconstruction_status ON incident_reconstruction(status);
