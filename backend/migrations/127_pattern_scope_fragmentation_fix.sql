-- Migration 127: prevent one governance theme fragmenting into competing patterns.
BEGIN;
ALTER TABLE signal_clusters ADD COLUMN IF NOT EXISTS service_user_id UUID REFERENCES service_users(id) ON DELETE SET NULL;

-- Legacy null-person clusters were the old service-wide bucket. Reclassify them so
-- existing evidence appears immediately in the new default service-theme lens.
UPDATE signal_clusters SET scope='service'
WHERE scope='person' AND linked_person IS NULL AND service_user_id IS NULL;

UPDATE signal_clusters sc SET service_user_id=su.id FROM service_users su
WHERE sc.scope='person' AND sc.service_user_id IS NULL AND sc.linked_person IS NOT NULL
  AND su.company_id=sc.company_id AND su.house_id=sc.house_id
  AND LOWER(TRIM(su.display_name))=LOWER(TRIM(sc.linked_person));

CREATE TEMP TABLE pattern_cluster_merge (duplicate_id UUID PRIMARY KEY, keeper_id UUID NOT NULL) ON COMMIT DROP;
INSERT INTO pattern_cluster_merge(duplicate_id, keeper_id)
SELECT id, keeper_id FROM (
  SELECT id,
    FIRST_VALUE(id) OVER (PARTITION BY company_id,house_id,risk_domain,service_user_id ORDER BY created_at,id) keeper_id,
    ROW_NUMBER() OVER (PARTITION BY company_id,house_id,risk_domain,service_user_id ORDER BY created_at,id) rn
  FROM signal_clusters WHERE scope='person' AND service_user_id IS NOT NULL
    AND cluster_status IN ('Emerging','Confirmed','Escalated')
) x WHERE rn>1;
INSERT INTO pattern_cluster_merge(duplicate_id, keeper_id)
SELECT id, keeper_id FROM (
  SELECT id,
    FIRST_VALUE(id) OVER (PARTITION BY company_id,house_id,risk_domain ORDER BY created_at,id) keeper_id,
    ROW_NUMBER() OVER (PARTITION BY company_id,house_id,risk_domain ORDER BY created_at,id) rn
  FROM signal_clusters WHERE scope='service' AND cluster_status IN ('Emerging','Confirmed','Escalated')
) x WHERE rn>1 ON CONFLICT (duplicate_id) DO NOTHING;

INSERT INTO risk_signal_links(cluster_id,pulse_entry_id,linked_by,linked_at,link_note)
SELECT m.keeper_id,rsl.pulse_entry_id,rsl.linked_by,rsl.linked_at,
       COALESCE(rsl.link_note,'') || ' [merged from duplicate pattern]'
FROM risk_signal_links rsl JOIN pattern_cluster_merge m ON m.duplicate_id=rsl.cluster_id
ON CONFLICT DO NOTHING;

UPDATE signal_clusters sc SET cluster_status='Dismissed',dismiss_reason='Superseded by canonical pattern lens'
FROM pattern_cluster_merge m WHERE sc.id=m.duplicate_id;
UPDATE signal_clusters sc SET signal_count=x.n,first_signal_date=x.first_date,last_signal_date=x.last_date
FROM (SELECT rsl.cluster_id,COUNT(*)::int n,MIN(gp.entry_date) first_date,MAX(gp.entry_date) last_date
      FROM risk_signal_links rsl JOIN governance_pulses gp ON gp.id=rsl.pulse_entry_id GROUP BY rsl.cluster_id) x
WHERE sc.id=x.cluster_id;

CREATE INDEX IF NOT EXISTS idx_clusters_service_user ON signal_clusters(company_id,service_user_id) WHERE service_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_person_pattern
  ON signal_clusters(company_id,house_id,risk_domain,service_user_id)
  WHERE scope='person' AND service_user_id IS NOT NULL AND cluster_status IN ('Emerging','Confirmed','Escalated');
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_service_theme
  ON signal_clusters(company_id,house_id,risk_domain)
  WHERE scope='service' AND cluster_status IN ('Emerging','Confirmed','Escalated');
COMMIT;
