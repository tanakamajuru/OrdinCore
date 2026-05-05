-- Repair Migration V3: Handle Table/Type Name Conflict
-- This script resolves the conflict where 'action_effectiveness' is both a table and a type.

DO $$ 
BEGIN
    -- 1. Drop the view if it exists
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'action_effectiveness') THEN
        DROP VIEW action_effectiveness;
    END IF;

    -- 2. Rename the table if it exists as a base table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'action_effectiveness' AND table_type = 'BASE TABLE') THEN
        ALTER TABLE action_effectiveness RENAME TO action_effectiveness_metrics;
    END IF;

    -- 3. Fix columns in risk_actions to use VARCHAR
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'calculated_outcome') THEN
        ALTER TABLE risk_actions ALTER COLUMN calculated_outcome TYPE VARCHAR(50);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'rm_override_outcome') THEN
        ALTER TABLE risk_actions ALTER COLUMN rm_override_outcome TYPE VARCHAR(50);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'director_override_outcome') THEN
        ALTER TABLE risk_actions ALTER COLUMN director_override_outcome TYPE VARCHAR(50);
    END IF;

    -- 4. Add the 'effectiveness' column to risk_actions if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'effectiveness') THEN
        ALTER TABLE risk_actions ADD COLUMN effectiveness VARCHAR(50);
    END IF;

    -- 5. Add columns to the renamed metrics table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness_metrics' AND column_name = 'signals_before_count') THEN
        ALTER TABLE action_effectiveness_metrics ADD COLUMN signals_before_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness_metrics' AND column_name = 'signals_after_count') THEN
        ALTER TABLE action_effectiveness_metrics ADD COLUMN signals_after_count INTEGER DEFAULT 0;
    END IF;

    -- 6. Basic columns for other tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'is_active') THEN
        ALTER TABLE companies ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'assigned_house_id') THEN
        ALTER TABLE users ADD COLUMN assigned_house_id UUID REFERENCES houses(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'is_active') THEN
        ALTER TABLE risks ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'is_active') THEN
        ALTER TABLE incidents ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

END $$;

-- Create a view to maintain compatibility with code that expects 'action_effectiveness' table
CREATE OR REPLACE VIEW action_effectiveness AS SELECT * FROM action_effectiveness_metrics;
