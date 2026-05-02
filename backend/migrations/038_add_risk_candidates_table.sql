-- Migration 038: Add risk_candidates table
-- This table stores potential risks identified from signal clusters before they become formal risks

CREATE TABLE IF NOT EXISTS risk_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES signal_clusters(id) ON DELETE SET NULL,
    risk_domain TEXT NOT NULL,
    candidate_type VARCHAR(100) NOT NULL DEFAULT 'Risk Review Required',
    status VARCHAR(50) NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Review', 'Accepted', 'Rejected', 'Converted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_risk_candidates_company_id ON risk_candidates(company_id);
CREATE INDEX idx_risk_candidates_house_id ON risk_candidates(house_id);
CREATE INDEX idx_risk_candidates_cluster_id ON risk_candidates(cluster_id);
CREATE INDEX idx_risk_candidates_status ON risk_candidates(status);
