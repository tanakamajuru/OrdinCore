-- C2 correction (21 Oct 2026): "Persist warning-signals answer." The capture form asks "Were
-- warning signals present before this incident?" but the answer was never submitted to the
-- backend at all (no column, no field in the create payload) -- silently discarded on every
-- submission.
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS warning_signals TEXT;
