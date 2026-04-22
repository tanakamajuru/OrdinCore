-- Migration 024: Add medication_error_type to signals

-- 1. Create enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medication_error_type') THEN
        CREATE TYPE medication_error_type AS ENUM ('Near Miss', 'Administration Error', 'Serious Error');
    END IF;
END $$;

-- 2. Add column
ALTER TABLE governance_pulses 
ADD COLUMN medication_error_type medication_error_type;
