-- Migration 034: Incident Links to Risks and Escalations
-- Junction tables for manual linking of incidents to existing risks/escalations.

CREATE TABLE IF NOT EXISTS incident_risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(incident_id, risk_id)
);

CREATE TABLE IF NOT EXISTS incident_escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    escalation_id UUID NOT NULL REFERENCES escalations(id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(incident_id, escalation_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_risks_incident ON incident_risks(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_escalations_incident ON incident_escalations(incident_id);
