-- Migration 102: keep the severity a risk was PROMOTED at (initial_severity) distinct from
-- its live severity (severity), which leadership can now change as the picture evolves.
-- The current severity still drives likelihood/impact/risk_score; the initial one is a fixed
-- reference point. Backfill initial_severity from the current value for existing risks.
ALTER TABLE risks ADD COLUMN IF NOT EXISTS initial_severity VARCHAR(20);
UPDATE risks SET initial_severity = severity WHERE initial_severity IS NULL;
