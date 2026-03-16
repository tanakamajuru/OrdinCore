-- Migration 006b: Incident Timeline and Events
CREATE TABLE incident_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL
    CHECK (event_type IN ('created', 'updated', 'assigned', 'resolved', 'closed', 'attachment_added', 'comment_added', 'escalated')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_events_incident_id ON incident_events(incident_id);
CREATE INDEX idx_incident_events_company_id ON incident_events(company_id);
CREATE INDEX idx_incident_events_created_at ON incident_events(created_at);
CREATE INDEX idx_incident_events_event_type ON incident_events(event_type);

-- Insert some sample incident categories for existing companies
INSERT INTO incident_categories (id, company_id, name, description, reportable, created_at)
SELECT 
  uuid_generate_v4() as id,
  c.id as company_id,
  cat.name,
  cat.description,
  cat.reportable,
  NOW() as created_at
FROM companies c
CROSS JOIN (VALUES 
  ('Safeguarding', 'Safeguarding concerns and referrals', true),
  ('Medication', 'Medication errors and incidents', true),
  ('Behavioral', 'Behavioral incidents and interventions', false),
  ('Environmental', 'Environmental health and safety', false),
  ('Staff Conduct', 'Staff-related incidents', true),
  ('Resident Injury', 'Resident injuries and accidents', true),
  ('Absconding', 'Resident absconding incidents', true),
  ('Other', 'Other incident types', false)
) AS cat(name, description, reportable)
WHERE NOT EXISTS (
  SELECT 1 FROM incident_categories ic 
  WHERE ic.company_id = c.id AND ic.name = cat.name
);
