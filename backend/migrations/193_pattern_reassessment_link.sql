-- Reassessment of a dismissed pattern (17 Oct v3 findings, fixed 21 Oct 2026): commit 3159af8
-- stopped a dismissed/resolved cluster being silently revived, but the per-house/person path's own
-- lookup already excludes Dismissed/Resolved clusters (cluster_status IN ('Emerging','Escalated',
-- 'Confirmed')), so new evidence against a previously-dismissed concern just starts a brand new
-- cluster with no link back to the dismissal decision -- the reviewer sees "new pattern", not
-- "new evidence against something we already closed". This column lets the worker record that link
-- explicitly instead of either silently reviving the old record or silently losing the connection.
ALTER TABLE signal_clusters
  ADD COLUMN IF NOT EXISTS reassessed_from_id UUID REFERENCES signal_clusters(id);

CREATE INDEX IF NOT EXISTS idx_signal_clusters_reassessed_from ON signal_clusters(reassessed_from_id) WHERE reassessed_from_id IS NOT NULL;
