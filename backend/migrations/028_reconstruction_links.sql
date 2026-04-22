-- Migration 028: Incident Reconstruction Junction Table
-- Links pulse entries to reconstructions for timeline generation.

CREATE TABLE incident_reconstruction_pulses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reconstruction_id UUID NOT NULL REFERENCES incident_reconstruction(id) ON DELETE CASCADE,
    pulse_id UUID NOT NULL REFERENCES governance_pulses(id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reconstruction_id, pulse_id)
);

CREATE INDEX idx_reconstruction_pulses_link ON incident_reconstruction_pulses(reconstruction_id, pulse_id);
