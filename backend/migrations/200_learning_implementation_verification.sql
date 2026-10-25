-- 24 Oct developer brief, "Learning Workflow Developer Fixes": the progress buttons
-- currently submit only a stage value with no implementation or verification evidence.
-- Adds the evidence columns the two new workflow steps (record implementation,
-- verify improvement) need, plus an "already recorded" short-circuit for a lesson
-- that duplicates one already captured.

ALTER TABLE learning_records
  ADD COLUMN IF NOT EXISTS implementation_evidence text,
  ADD COLUMN IF NOT EXISTS implemented_at timestamptz,
  ADD COLUMN IF NOT EXISTS implemented_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_outcome text,
  ADD COLUMN IF NOT EXISTS verification_evidence text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_of_id uuid REFERENCES learning_records(id) ON DELETE SET NULL;

ALTER TABLE learning_records
  ADD CONSTRAINT learning_records_verification_outcome_check
  CHECK (verification_outcome IS NULL OR verification_outcome = ANY (ARRAY[
    'Effective', 'Partly Effective', 'Not Effective', 'Too Early', 'Insufficient Evidence'
  ]));
