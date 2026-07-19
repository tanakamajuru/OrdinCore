-- Migration 101: record WHO completed an action, not just when.
-- The completion flow captured completion_note/outcome/rationale + completed_at but never
-- stamped the completer, so a completed action couldn't show "done by X". Add completed_by;
-- backfill existing completed rows to their assignee as the best available attribution.
ALTER TABLE risk_actions ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id) ON DELETE SET NULL;

UPDATE risk_actions
   SET completed_by = assigned_to
 WHERE completed_by IS NULL AND completed_at IS NOT NULL AND assigned_to IS NOT NULL;
