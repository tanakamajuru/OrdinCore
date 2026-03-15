-- Migration 008: Escalations
CREATE TABLE escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  escalated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  escalated_to UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'acknowledged', 'in_progress', 'resolved', 'closed')),
  priority VARCHAR(50) DEFAULT 'high' CHECK (priority IN ('medium', 'high', 'urgent', 'critical')),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escalations_company_id ON escalations(company_id);
CREATE INDEX idx_escalations_risk_id ON escalations(risk_id);
CREATE INDEX idx_escalations_incident_id ON escalations(incident_id);
CREATE INDEX idx_escalations_status ON escalations(status);
CREATE INDEX idx_escalations_escalated_to ON escalations(escalated_to);

CREATE TABLE escalation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escalation_id UUID NOT NULL REFERENCES escalations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  taken_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escalation_actions_escalation_id ON escalation_actions(escalation_id);
