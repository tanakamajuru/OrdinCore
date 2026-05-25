-- Migration 046: Add source_pulse_id to incidents table
-- Links incidents back to their source pulse/signal for traceability

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS source_pulse_id UUID REFERENCES governance_pulses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_source_pulse_id ON incidents(source_pulse_id);

-- Commentary: This column enables tracing of incidents back to their originating signals
-- when promoted from "Serious Incident" status. Used by incident reconstruction and
-- governance context linking to answer: "Were warning signals present before this incident?"
