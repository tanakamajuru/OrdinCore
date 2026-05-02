-- Migration 039: Fix incidents severity constraint
-- Drop and recreate the severity constraint to accept proper values

-- Drop the old constraint
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_severity_check;

-- Add the corrected constraint with proper values
ALTER TABLE incidents ADD CONSTRAINT incidents_severity_check
CHECK (severity IN ('Low', 'Moderate', 'High', 'Critical'));

-- Also fix status constraint to match expected values
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_status_check
CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed'));
