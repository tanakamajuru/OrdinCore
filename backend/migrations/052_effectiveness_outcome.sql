-- Migration 052: Effectiveness review outcomes
-- Replaces the 3-value effectiveness (Effective/Neutral/Ineffective) with the
-- doctrine's 4 outcomes and adds evidence + due tracking (spec module 7).

ALTER TABLE risk_actions
  ADD COLUMN IF NOT EXISTS effectiveness_outcome TEXT,
  ADD COLUMN IF NOT EXISTS effectiveness_evidence TEXT,
  ADD COLUMN IF NOT EXISTS effectiveness_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS effectiveness_reviewed_by UUID REFERENCES users(id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'risk_actions' AND constraint_name = 'risk_actions_effectiveness_outcome_chk'
  ) THEN
    ALTER TABLE risk_actions
      ADD CONSTRAINT risk_actions_effectiveness_outcome_chk
      CHECK (effectiveness_outcome IS NULL OR effectiveness_outcome IN
        ('Effective', 'Partially Effective', 'Not Effective', 'Too Early To Assess'));
  END IF;
END $$;

-- Migrate legacy values into the new vocabulary where the old column exists.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'risk_actions' AND column_name = 'effectiveness') THEN
    UPDATE risk_actions SET effectiveness_outcome = CASE effectiveness
        WHEN 'Effective'   THEN 'Effective'
        WHEN 'Neutral'     THEN 'Partially Effective'
        WHEN 'Ineffective' THEN 'Not Effective'
        ELSE effectiveness_outcome
      END
     WHERE effectiveness IS NOT NULL AND effectiveness_outcome IS NULL;
  END IF;
END $$;
