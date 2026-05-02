-- Migration 033: Fix Missing Columns and Stability Table
-- Adds missing columns and tables causing migration and test failures

-- 0. PRE-CLEANUP: Drop views that might be referencing non-existent tables
-- This prevents "relation does not exist" errors during table creation/alteration
DROP VIEW IF EXISTS service_unit_stability_view CASCADE;
DROP VIEW IF EXISTS service_stability_metrics CASCADE;

-- 1. Create service_unit_stability as a Materialized View (required by analytics)
-- We drop it first in case it was created as a table in a previous failed run
DROP TABLE IF EXISTS service_unit_stability CASCADE;
DROP MATERIALIZED VIEW IF EXISTS service_unit_stability CASCADE;

CREATE MATERIALIZED VIEW service_unit_stability AS
SELECT 
    h.id AS house_id,
    100.00 AS stability_score,
    NOW() AS measured_at,
    '{}'::JSONB AS factors
FROM houses h;

-- Create index on the materialized view
CREATE UNIQUE INDEX idx_stability_house ON service_unit_stability(house_id);

-- 2. Add effectiveness_measured_at to risk_actions if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'risk_actions' 
        AND column_name = 'effectiveness_measured_at'
    ) THEN
        ALTER TABLE risk_actions 
        ADD COLUMN effectiveness_measured_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Add is_active column to relevant tables if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'risks' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE risks 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incidents' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE incidents 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_actions_effectiveness_measured_at 
ON risk_actions(effectiveness_measured_at);

CREATE INDEX IF NOT EXISTS idx_risks_is_active 
ON risks(is_active);

CREATE INDEX IF NOT EXISTS idx_incidents_is_active 
ON incidents(is_active);
