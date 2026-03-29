-- Migration 005: Risk System
CREATE TABLE risk_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#ef4444',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_categories_company_id ON risk_categories(company_id);

CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES risk_categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(50) NOT NULL DEFAULT 'Medium'
    CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  status VARCHAR(50) NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Escalated', 'Closed')),
  likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER CHECK (impact BETWEEN 1 AND 5),
  risk_score INTEGER GENERATED ALWAYS AS (COALESCE(likelihood, 1) * COALESCE(impact, 1)) STORED,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ,
  review_due_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risks_company_id ON risks(company_id);
CREATE INDEX idx_risks_house_id ON risks(house_id);
CREATE INDEX idx_risks_status ON risks(status);
CREATE INDEX idx_risks_severity ON risks(severity);
CREATE INDEX idx_risks_assigned_to ON risks(assigned_to);
CREATE INDEX idx_risks_created_by ON risks(created_by);

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

CREATE INDEX idx_risk_events_risk_id ON risk_events(risk_id);
CREATE INDEX idx_risk_events_company_id ON risk_events(company_id);

CREATE TABLE risk_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled', 'Ongoing')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_actions_risk_id ON risk_actions(risk_id);
CREATE INDEX idx_risk_actions_company_id ON risk_actions(company_id);

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

CREATE INDEX idx_risk_attachments_risk_id ON risk_attachments(risk_id);
