-- C2 correction (21 Oct 2026): "Prevent duplicate submissions." A double-click, or a client retry
-- after a network timeout with no way to know whether the first attempt actually succeeded, could
-- create two incident records for the same report. Same retry-safe pattern already used for
-- signal_monitoring_updates (migration 187/188) -- a stable client-supplied reference means a
-- replayed submission returns the existing record instead of inserting a duplicate.
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS client_submission_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_client_submission
  ON incidents (company_id, client_submission_id) WHERE client_submission_id IS NOT NULL;
