-- 162: Add incident lineage to the canonical action spine.
--
-- Serious-incident tasks were written to a separate `incident_actions` table (doctrine §8.2)
-- that does not even exist in production, so those INSERTs threw and the auto-created incident
-- tasks never reached My Work, the Action Tracker, effectiveness, closure or reports. Incident
-- tasks now become canonical risk_actions; this column carries the incident lineage so the
-- action can be traced back to (and reported against) its incident.
ALTER TABLE risk_actions ADD COLUMN IF NOT EXISTS incident_id uuid;
CREATE INDEX IF NOT EXISTS idx_risk_actions_incident_id ON risk_actions(incident_id) WHERE incident_id IS NOT NULL;
