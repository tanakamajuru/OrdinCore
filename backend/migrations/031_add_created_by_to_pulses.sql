-- Migration 031: Add missing created_by column to governance_pulses
-- This column was added locally but never migrated to production.
-- It tracks which user submitted/created the governance pulse entry.

ALTER TABLE governance_pulses 
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for performance when querying by creator
CREATE INDEX IF NOT EXISTS idx_governance_pulses_created_by ON governance_pulses(created_by);
