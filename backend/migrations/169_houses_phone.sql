-- The Service Records admin form exposes a Phone field, but the houses table had no column to
-- store it, so editing Phone silently did nothing (save returned 200, nothing persisted).
-- Add the column so the field the UI already shows actually saves.
BEGIN;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
COMMIT;
