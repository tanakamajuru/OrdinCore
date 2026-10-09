-- Dismissed concerns brief (8 Oct 2026): a stable, immutable dismissal timestamp.
-- Previously the archive showed updated_at as "dismissedAt", which later metadata edits could move.
-- Add dismissed_at and backfill it from the recorded dismissal/lapse audit event where one exists;
-- where no trustworthy event exists the column is left NULL (never invent a dismissal time).

ALTER TABLE signal_clusters ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

UPDATE signal_clusters c
   SET dismissed_at = a.at
  FROM (
    SELECT resource_id, MAX(created_at) AS at
      FROM audit_logs
     WHERE resource = 'signal_cluster'
       AND action IN ('PATTERN_DISMISSED','PATTERN_LAPSED')
     GROUP BY resource_id
  ) a
 WHERE c.id = a.resource_id::uuid
   AND c.cluster_status = 'Dismissed'
   AND c.dismissed_at IS NULL;
