-- Migration 022: OrdinCore Risk System Reconstruction (Consolidated)
-- This script wipes legacy risks and recreates the system to be defensible.

-- 1. DROP LEGACY (CASCADE handles dependent views/rules)
DROP TABLE IF EXISTS risk_attachments CASCADE;
DROP TABLE IF EXISTS risk_actions CASCADE;
DROP TABLE IF EXISTS risk_events CASCADE;
DROP TABLE IF EXISTS risks CASCADE;
DROP TABLE IF EXISTS risk_categories CASCADE;

-- 2. CREATE Standard OrdinCore Categories
CREATE TABLE risk_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#ef4444',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CREATE Standard OrdinCore Risks Table
CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES risk_categories(id) ON DELETE SET NULL,
  
  -- Signals & Clusters (Phase 2)
  source_cluster_id UUID REFERENCES signal_clusters(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity severity_level NOT NULL DEFAULT 'Moderate',
  trajectory trajectory_type NOT NULL DEFAULT 'Stable',
  status VARCHAR(50) NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Escalated', 'Closed', 'Under Review')),
  
  -- Ratings
  likelihood INTEGER DEFAULT 3 CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  risk_score INTEGER GENERATED ALWAYS AS (COALESCE(likelihood, 1) * COALESCE(impact, 1)) STORED,
  
  -- Governance & Ownership
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Timestamps & Review
  control_effectiveness VARCHAR(50) DEFAULT 'Partially',
  next_review_date DATE,
  review_due_date TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closure_reason TEXT,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CREATE Standard Support Tables
CREATE TABLE risk_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE risk_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Phase 3 Sequential logic will use these
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled', 'Ongoing')),
  
  -- Independent Verification (Phase 3)
  verified_by_rm UUID REFERENCES users(id),
  verified_at_rm TIMESTAMPTZ,
  verified_by_ri UUID REFERENCES users(id),
  verified_at_ri TIMESTAMPTZ,
  verification_notes TEXT,
  
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE risk_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. UPDATE signal_clusters foreign key
ALTER TABLE signal_clusters 
    ADD CONSTRAINT signal_clusters_linked_risk_id_fkey 
    FOREIGN KEY (linked_risk_id) REFERENCES risks(id) ON DELETE SET NULL;

-- 6. INDEXING
CREATE INDEX idx_risks_company_id ON risks(company_id);
CREATE INDEX idx_risks_house_id ON risks(house_id);
CREATE INDEX idx_risks_status ON risks(status);
CREATE INDEX idx_risks_severity ON risks(severity);
CREATE INDEX idx_risks_trajectory ON risks(trajectory);
CREATE INDEX idx_risks_source_cluster ON risks(source_cluster_id);
CREATE INDEX idx_risk_events_risk_id ON risk_events(risk_id);
CREATE INDEX idx_risk_actions_risk_id ON risk_actions(risk_id);
CREATE INDEX idx_risk_attachments_risk_id ON risk_attachments(risk_id);
