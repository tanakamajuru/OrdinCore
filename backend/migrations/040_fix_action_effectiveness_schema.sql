-- Migration 040: Fix Action Effectiveness Schema
-- Adds missing columns required by actionEffectiveness.worker.ts

DO $$ 
BEGIN
    -- 1. Ensure action_effectiveness table exists (it should, but safety first)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'action_effectiveness') THEN
        
        -- Add missing columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'signals_before_count') THEN
            ALTER TABLE action_effectiveness ADD COLUMN signals_before_count INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'signals_after_count') THEN
            ALTER TABLE action_effectiveness ADD COLUMN signals_after_count INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'severity_before_max') THEN
            ALTER TABLE action_effectiveness ADD COLUMN severity_before_max VARCHAR(20);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'severity_after_max') THEN
            ALTER TABLE action_effectiveness ADD COLUMN severity_after_max VARCHAR(20);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'measurement_date') THEN
            ALTER TABLE action_effectiveness ADD COLUMN measurement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;

        -- Check for calculated_at and rename or keep
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'calculated_at') THEN
            -- Some previous versions used calculated_at
            NULL; 
        END IF;

        -- Ensure house_id exists (some scripts used service_id)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'house_id') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'service_id') THEN
                ALTER TABLE action_effectiveness RENAME COLUMN service_id TO house_id;
            ELSE
                ALTER TABLE action_effectiveness ADD COLUMN house_id UUID REFERENCES houses(id) ON DELETE CASCADE;
            END IF;
        END IF;

    END IF;

    -- 2. Ensure risk_actions has effectiveness_measured_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'effectiveness_measured_at') THEN
        ALTER TABLE risk_actions ADD COLUMN effectiveness_measured_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
