-- Migration 117: Serious Incident upgrade — unique reference, learning capture.
-- Adds a human-readable per-company/year reference (SI-2026-0001), a lessons-learned
-- field, and a shared-learning flag. A small counters table makes reference
-- allocation atomic (no COUNT race). Idempotent.

BEGIN;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS reference       TEXT,
  ADD COLUMN IF NOT EXISTS lessons_learned TEXT,
  ADD COLUMN IF NOT EXISTS learning_shared BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_incidents_reference
  ON incidents(company_id, reference) WHERE reference IS NOT NULL;

-- Atomic per-(company, year) running number for the reference.
CREATE TABLE IF NOT EXISTS incident_counters (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year       INT  NOT NULL,
  last_no    INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, year)
);

COMMIT;
