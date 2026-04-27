-- Migration 033: Add house_id to escalations
-- Aligns escalations table with the rest of the schema and fixes the 'service_unit_id' missing column error.

-- 1. Add house_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'escalations' AND column_name = 'house_id') THEN
        ALTER TABLE escalations ADD COLUMN house_id UUID REFERENCES houses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Backfill house_id from risks or incidents
UPDATE escalations e
SET house_id = COALESCE(
    (SELECT house_id FROM risks r WHERE r.id = e.risk_id),
    (SELECT house_id FROM incidents i WHERE i.id = e.incident_id)
)
WHERE house_id IS NULL;

-- 3. If still null (unlinked escalations), try to use the legacy service_unit_id if it existed in some backup or just leave for manual fix
-- (Optional) If we want to be safe and ensure no nulls if possible.

-- 4. Clean up: Ensure we don't use service_unit_id in any future queries
-- We don't drop it yet in case there are other tools using it, but it was already reported as MISSING in my psql check.
