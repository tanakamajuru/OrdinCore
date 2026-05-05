-- Repair Migration V4: Final simple fix
-- This avoids all type conflicts by using standard types and keeping table names.

DO $$ 
BEGIN
    -- 1. Rename table back if it was renamed by V3
    -- First drop the view created by V3
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'action_effectiveness') THEN
        DROP VIEW action_effectiveness;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'action_effectiveness_metrics') THEN
        ALTER TABLE action_effectiveness_metrics RENAME TO action_effectiveness;
    END IF;

    -- 2. Companies.is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'is_active') THEN
        ALTER TABLE companies ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- 3. Users.assigned_house_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'assigned_house_id') THEN
        ALTER TABLE users ADD COLUMN assigned_house_id UUID REFERENCES houses(id) ON DELETE SET NULL;
    END IF;

    -- 4. Risks.is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'is_active') THEN
        ALTER TABLE risks ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- 5. Incidents.is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'is_active') THEN
        ALTER TABLE incidents ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- 6. Risk_actions columns (Using VARCHAR to avoid Enum conflict)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'effectiveness') THEN
        ALTER TABLE risk_actions ADD COLUMN effectiveness VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'calculated_outcome') THEN
        ALTER TABLE risk_actions ADD COLUMN calculated_outcome VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'rm_override_outcome') THEN
        ALTER TABLE risk_actions ADD COLUMN rm_override_outcome VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risk_actions' AND column_name = 'director_override_outcome') THEN
        ALTER TABLE risk_actions ADD COLUMN director_override_outcome VARCHAR(50);
    END IF;

    -- 7. action_effectiveness table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'signals_before_count') THEN
        ALTER TABLE action_effectiveness ADD COLUMN signals_before_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_effectiveness' AND column_name = 'signals_after_count') THEN
        ALTER TABLE action_effectiveness ADD COLUMN signals_after_count INTEGER DEFAULT 0;
    END IF;

END $$;
