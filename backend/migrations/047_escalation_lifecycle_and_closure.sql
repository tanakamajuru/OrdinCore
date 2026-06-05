-- Migration 047: Escalation lifecycle + closure columns
-- Aligns escalations with the closed-loop governance model:
-- Open -> Under Review -> Actions Implemented -> Monitoring Effectiveness -> Closed / Reopened
-- (Spec module 4 "Time-Bound Escalations". Renumbered from spec's 039 because 039-046 already exist.)

DO $$ BEGIN
  CREATE TYPE escalation_lifecycle_status AS ENUM (
    'Open',
    'Under Review',
    'Actions Implemented',
    'Monitoring Effectiveness',
    'Closed',
    'Reopened'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE escalations
  ADD COLUMN IF NOT EXISTS lifecycle_status escalation_lifecycle_status DEFAULT 'Open',
  ADD COLUMN IF NOT EXISTS trigger_type TEXT,
  ADD COLUMN IF NOT EXISTS due_by TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actions_implemented_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS effectiveness_review_due TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS effectiveness_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closure_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS closure_reason TEXT,
  ADD COLUMN IF NOT EXISTS closure_evidence TEXT,
  ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopened_reason TEXT;

-- Backfill lifecycle_status from the legacy free-text status so existing rows are coherent.
UPDATE escalations
   SET lifecycle_status = CASE
        WHEN status IN ('Resolved', 'Closed') THEN 'Closed'::escalation_lifecycle_status
        WHEN status IN ('Acknowledged', 'In Progress') THEN 'Under Review'::escalation_lifecycle_status
        ELSE 'Open'::escalation_lifecycle_status
      END
 WHERE lifecycle_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_escalations_due_by ON escalations(company_id, due_by);
CREATE INDEX IF NOT EXISTS idx_escalations_lifecycle_status ON escalations(company_id, lifecycle_status);
