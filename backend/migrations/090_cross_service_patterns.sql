-- 090_cross_service_patterns.sql
-- Finding D — a genuine systemic (cross-service) cluster tier alongside the existing
-- per-house/person clusters. Additive; person-level clustering is untouched.

BEGIN;

ALTER TABLE signal_clusters ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'person';
ALTER TABLE signal_clusters ADD COLUMN IF NOT EXISTS affected_house_ids UUID[];
-- Cross-service clusters span services, so they carry no single house_id.
ALTER TABLE signal_clusters ALTER COLUMN house_id DROP NOT NULL;

-- At most one active cross-service cluster per company + domain (upsert target).
CREATE UNIQUE INDEX IF NOT EXISTS uq_signal_clusters_cross_service
  ON signal_clusters (company_id, risk_domain)
  WHERE scope = 'cross_service';

COMMIT;

-- Existing per-service queries filter sc.house_id = ANY(...); cross_service rows have a
-- NULL house_id, so they are naturally excluded from RM/house-scoped views and surface
-- only to the leadership (Director/RI) lens — which is correct.
