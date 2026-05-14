-- Repair Migration: Add missing columns causing worker failures
-- This script is idempotent and can be run multiple times.

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

    -- 5. Action Effectiveness Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_effectiveness') THEN
        CREATE TYPE action_effectiveness AS ENUM ('Effective', 'Neutral', 'Ineffective');
    END IF;

    -- 6. Risk_actions.effectiveness
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'effectiveness') THEN
        ALTER TABLE risk_actions ADD COLUMN effectiveness action_effectiveness;
    END IF;

    -- 7. action_effectiveness columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'action_effectiveness') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'signals_before_count') THEN
            ALTER TABLE action_effectiveness ADD COLUMN signals_before_count INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'signals_after_count') THEN
            ALTER TABLE action_effectiveness ADD COLUMN signals_after_count INTEGER DEFAULT 0;
        END IF;
    END IF;

END $$;
