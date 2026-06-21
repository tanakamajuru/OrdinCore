-- Migration 060: Ensure a UNIQUE index on risk_candidates.cluster_id.
-- The pattern worker uses `INSERT ... ON CONFLICT (cluster_id) DO UPDATE`, which
-- requires a unique index on cluster_id or the whole evaluateRules() job crashes.
-- Existing databases were created with this unique index (auto-named
-- risk_candidates_cluster_id_key); this guard makes a fresh DB get it too.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'risk_candidates'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(cluster_id)%'
  ) THEN
    CREATE UNIQUE INDEX uq_risk_candidates_cluster_id ON risk_candidates (cluster_id);
  END IF;
END $$;
