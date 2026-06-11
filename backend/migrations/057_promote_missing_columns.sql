-- Migration 057: Add columns referenced by risk promotion that no prior migration created.
-- risks.linked_person and risk_candidates.{linked_person,source_signals,dismissal_reason}
-- exist in the original dev database but were never reproduced by a committed migration,
-- so production lacked them and "Promote to Risk" failed with
-- 'column "linked_person" of relation "risk_candidates" does not exist'.

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS linked_person VARCHAR(200);

ALTER TABLE risk_candidates
  ADD COLUMN IF NOT EXISTS linked_person VARCHAR(200),
  ADD COLUMN IF NOT EXISTS source_signals UUID[],
  ADD COLUMN IF NOT EXISTS dismissal_reason TEXT;
