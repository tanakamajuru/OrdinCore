-- Repair Migration V2: Add missing columns and handle type conflicts
-- This script is idempotent.

DO $$ 
BEGIN
    -- 1. Companies.is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'is_active') THEN
        ALTER TABLE companies ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- 2. Users.assigned_house_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'assigned_house_id') THEN
        ALTER TABLE users ADD COLUMN assigned_house_id UUID REFERENCES houses(id) ON DELETE SET NULL;
    END IF;

    -- 3. Risks.is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'is_active') THEN
        ALTER TABLE risks ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- 4. Incidents.is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'is_active') THEN
        ALTER TABLE incidents ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- 5. Action Effectiveness Enum (Use a unique name to avoid conflict with table name)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'effectiveness_outcome') THEN
        CREATE TYPE effectiveness_outcome AS ENUM ('Effective', 'Neutral', 'Ineffective');
    END IF;

    -- 6. Risk_actions columns (Use the new enum name or just varchar if needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'effectiveness') THEN
        ALTER TABLE risk_actions ADD COLUMN effectiveness effectiveness_outcome;
    END IF;

    -- 7. action_effectiveness table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'signals_before_count') THEN
        ALTER TABLE action_effectiveness ADD COLUMN signals_before_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'signals_after_count') THEN
        ALTER TABLE action_effectiveness ADD COLUMN signals_after_count INTEGER DEFAULT 0;
    END IF;

END $$;
