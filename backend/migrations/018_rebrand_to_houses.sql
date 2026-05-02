-- Migration 018: Rebrand to Houses and Align Schema
-- Renames service_unit_id to house_id to match code expectations and Ordin Core standard.

-- 1. Rename columns in incidents table
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'service_unit_id') THEN
        ALTER TABLE incidents RENAME COLUMN service_unit_id TO house_id;
    END IF;
END $$;

-- 2. Rename columns in risks table
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'service_unit_id') THEN
        ALTER TABLE risks RENAME COLUMN service_unit_id TO house_id;
    END IF;
END $$;

-- 3. Migrate data from user_service_units to user_houses (only if table exists)
-- user_service_units: (id, user_id, service_unit_id, created_at)
-- user_houses: (id, user_id, house_id, company_id, role_in_house, assigned_at)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_service_units') THEN
        INSERT INTO user_houses (id, user_id, house_id, company_id, assigned_at)
        SELECT
            usu.id,
            usu.user_id,
            usu.service_unit_id,
            u.company_id,
            COALESCE(usu.created_at, NOW())
        FROM user_service_units usu
        JOIN users u ON u.id = usu.user_id
        ON CONFLICT (id) DO NOTHING;

        -- Also try to match by user_id/house_id if ID is different
        INSERT INTO user_houses (user_id, house_id, company_id, assigned_at)
        SELECT
            usu.user_id,
            usu.service_unit_id,
            u.company_id,
            COALESCE(usu.created_at, NOW())
        FROM user_service_units usu
        JOIN users u ON u.id = usu.user_id
        ON CONFLICT (user_id, house_id) DO NOTHING;
    END IF;
END $$;

-- 4. Re-confirm table names for consistency
-- We keep service_units and user_service_units as-is for now to avoid breaking other legacy tools,
-- but the main app will now run on houses and user_houses.
