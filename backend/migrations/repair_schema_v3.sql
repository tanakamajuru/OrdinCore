-- Repair Migration V3: Handle Table/Type Name Conflict
-- This script resolves the conflict where 'action_effectiveness' is both a table and a type.

DO $$ 
BEGIN
    -- 1. Rename the table if it exists and hasn't been renamed yet
    -- This also renames the implicit composite type
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'action_effectiveness') THEN
        ALTER TABLE action_effectiveness RENAME TO action_effectiveness_metrics;
    END IF;

    -- 2. Create the ENUM type (now that the name is free)
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'action_effectiveness' AND t.typtype = 'e') THEN
        CREATE TYPE action_effectiveness AS ENUM ('Effective', 'Neutral', 'Ineffective');
    END IF;

    -- 3. Fix columns in risk_actions to use the Enum (if they were using the composite type)
    -- We convert them to text first to safely change the type
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'calculated_outcome') THEN
        ALTER TABLE risk_actions ALTER COLUMN calculated_outcome TYPE VARCHAR(50);
        ALTER TABLE risk_actions ALTER COLUMN calculated_outcome TYPE action_effectiveness USING calculated_outcome::action_effectiveness;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'rm_override_outcome') THEN
        ALTER TABLE risk_actions ALTER COLUMN rm_override_outcome TYPE VARCHAR(50);
        ALTER TABLE risk_actions ALTER COLUMN rm_override_outcome TYPE action_effectiveness USING rm_override_outcome::action_effectiveness;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'director_override_outcome') THEN
        ALTER TABLE risk_actions ALTER COLUMN director_override_outcome TYPE VARCHAR(50);
        ALTER TABLE risk_actions ALTER COLUMN director_override_outcome TYPE action_effectiveness USING director_override_outcome::action_effectiveness;
    END IF;

    -- 4. Add the 'effectiveness' column to risk_actions if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'effectiveness') THEN
        ALTER TABLE risk_actions ADD COLUMN effectiveness action_effectiveness;
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
