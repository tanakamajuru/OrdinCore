-- Migration 006: Incident System
CREATE TABLE incident_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  reportable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_categories_company_id ON incident_categories(company_id);

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES incident_categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'moderate'
    CHECK (severity IN ('minor', 'moderate', 'serious', 'critical')),
  status VARCHAR(50) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
  occurred_at TIMESTAMPTZ NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location VARCHAR(255),
  persons_involved JSONB DEFAULT '[]',
  witnesses JSONB DEFAULT '[]',
  immediate_action TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  reportable_to_authority BOOLEAN DEFAULT FALSE,
  authority_notified_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_company_id ON incidents(company_id);
CREATE INDEX idx_incidents_house_id ON incidents(house_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_created_by ON incidents(created_by);
CREATE INDEX idx_incidents_occurred_at ON incidents(occurred_at);

CREATE TABLE incident_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_attachments_incident_id ON incident_attachments(incident_id);
