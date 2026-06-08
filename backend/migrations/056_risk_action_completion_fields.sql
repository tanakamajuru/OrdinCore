-- Migration 056: Add action-completion fields to risk_actions
-- actions.controller.complete() writes completion_note, completion_outcome and
-- completion_rationale, but no prior migration created them, so action completion
-- failed with 'column "completion_note" of relation "risk_actions" does not exist'
-- (after the status had already been flipped to Completed, leaving actions half-done).
-- completion_outcome is one of: 'No change','Partial improvement','Risk reduced','Risk escalated'.

ALTER TABLE risk_actions
  ADD COLUMN IF NOT EXISTS completion_note TEXT,
  ADD COLUMN IF NOT EXISTS completion_outcome TEXT,
  ADD COLUMN IF NOT EXISTS completion_rationale TEXT;
