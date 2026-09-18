-- 154 · Phase 6 historical remediation — signal-cluster evidence reconciliation.
--
-- Invariant I5 (verify-canonical-invariants.sql) reported active signal_clusters whose denormalised
-- signal_count was set directly (seed / historical increment) WITHOUT the risk_signal_links rows that
-- pattern.worker normally writes when it clusters a pulse. Such a cluster counts signals it cannot
-- evidence — the exact P2-4 risk in the Canonical Violation Register.
--
-- Remediation is evidence-led, not cosmetic:
--   1. Backfill risk_signal_links from the governance_pulses that genuinely belong to the cluster
--      (same company, matching risk_domain, within the cluster's signal window; same house for
--      house-scoped clusters, company-wide for cross_service clusters).
--   2. Reconcile signal_count to the distinct linked-pulse evidence for the backfilled clusters.
--   3. Any active cluster still claiming a count with no addressable evidence is set to 0 (honest:
--      no evidence => no count).
-- Post-condition: no active cluster carries signal_count > 0 without a linked pulse (I5 == 0).

-- 1 · Backfill links from matching pulses (linked_by is NOT NULL, so attribute to a company user;
-- link_note tags the batch as auditable Phase-6 provenance).
INSERT INTO risk_signal_links (cluster_id, pulse_entry_id, linked_by, link_note)
SELECT sc.id, gp.id,
       (SELECT u.id FROM users u WHERE u.company_id = sc.company_id ORDER BY u.created_at LIMIT 1),
       'phase6-backfill-v1'
  FROM signal_clusters sc
  JOIN governance_pulses gp
    ON gp.company_id = sc.company_id
   AND sc.risk_domain = ANY(gp.risk_domain)
   AND gp.entry_date BETWEEN sc.first_signal_date AND sc.last_signal_date
   AND (sc.scope = 'cross_service' OR gp.house_id = sc.house_id)
 WHERE COALESCE(sc.signal_count,0) > 0
   AND LOWER(BTRIM(COALESCE(sc.cluster_status::text,''))) NOT IN ('resolved','closed','dismissed')
   AND NOT EXISTS (SELECT 1 FROM risk_signal_links l WHERE l.cluster_id = sc.id);

-- 2 · Reconcile signal_count to the distinct linked-pulse evidence for the backfilled clusters only.
UPDATE signal_clusters sc
   SET signal_count = (SELECT COUNT(DISTINCT l.pulse_entry_id) FROM risk_signal_links l WHERE l.cluster_id = sc.id)
 WHERE EXISTS (SELECT 1 FROM risk_signal_links l WHERE l.cluster_id = sc.id AND l.link_note = 'phase6-backfill-v1');

-- 3 · Zero any active cluster that still claims signals with no addressable evidence.
UPDATE signal_clusters sc
   SET signal_count = 0
 WHERE COALESCE(sc.signal_count,0) > 0
   AND LOWER(BTRIM(COALESCE(sc.cluster_status::text,''))) NOT IN ('resolved','closed','dismissed')
   AND NOT EXISTS (SELECT 1 FROM risk_signal_links l WHERE l.cluster_id = sc.id);

-- Post-condition guard: invariant I5 must now hold.
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n
    FROM signal_clusters sc
   WHERE COALESCE(sc.signal_count,0) > 0
     AND LOWER(BTRIM(COALESCE(sc.cluster_status::text,''))) NOT IN ('resolved','closed','dismissed')
     AND NOT EXISTS (SELECT 1 FROM risk_signal_links l WHERE l.cluster_id = sc.id);
  IF n > 0 THEN RAISE EXCEPTION 'I5 remediation incomplete: % active clusters still lack linked-pulse evidence', n; END IF;
END $$;
