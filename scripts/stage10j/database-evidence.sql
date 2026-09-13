\set ON_ERROR_STOP on
\pset pager off

\echo 'Stage 10J database evidence'
SELECT NOW() AT TIME ZONE 'UTC' AS captured_at_utc,
       current_database() AS database_name,
       current_user AS database_user;

SELECT set_config('stage10j.clean_tenant_id', :'clean_tenant_id', false);
SELECT set_config('stage10j.migrated_tenant_id', :'migrated_tenant_id', false);

DO $$
DECLARE
  clean_id uuid := current_setting('stage10j.clean_tenant_id')::uuid;
  migrated_id uuid := current_setting('stage10j.migrated_tenant_id')::uuid;
  failures bigint;
BEGIN
  IF clean_id = migrated_id THEN
    RAISE EXCEPTION 'Clean and migrated tenant IDs must differ.';
  END IF;
  SELECT COUNT(*) INTO failures FROM companies WHERE id IN (clean_id, migrated_id);
  IF failures <> 2 THEN RAISE EXCEPTION 'Both acceptance tenants must exist.'; END IF;

  SELECT COUNT(*) INTO failures FROM risk_actions
   WHERE company_id IN (clean_id,migrated_id)
     AND (status::text NOT IN ('Open','In Progress','Completed','Cancelled')
       OR effectiveness_outcome IS NOT NULL AND effectiveness_outcome NOT IN
          ('Effective','Partially Effective','Not Effective','Too Early To Assess'));
  IF failures > 0 THEN RAISE EXCEPTION '% non-canonical action rows found.', failures; END IF;

  SELECT COUNT(*) INTO failures FROM risks
   WHERE company_id IN (clean_id,migrated_id)
     AND status::text NOT IN ('Open','In Progress','Escalated','Under Review','Closed');
  IF failures > 0 THEN RAISE EXCEPTION '% non-canonical risk rows found.', failures; END IF;

  SELECT COUNT(*) INTO failures FROM risk_actions a
   WHERE a.company_id IN (clean_id,migrated_id) AND (
     (a.risk_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM risks r WHERE r.id=a.risk_id AND r.company_id=a.company_id)) OR
     (a.escalation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM escalations e WHERE e.id=a.escalation_id AND e.company_id=a.company_id)) OR
     (a.source_pulse_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM governance_pulses p WHERE p.id=a.source_pulse_id AND p.company_id=a.company_id)) OR
     (a.source_cluster_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM signal_clusters c WHERE c.id=a.source_cluster_id AND c.company_id=a.company_id)));
  IF failures > 0 THEN RAISE EXCEPTION '% cross-tenant/orphan action relationships found.', failures; END IF;

  SELECT COUNT(*) INTO failures
  FROM escalations a JOIN escalations b
    ON a.company_id=b.company_id AND a.id<b.id
   AND lower(coalesce(a.lifecycle_status::text,a.status::text,'open')) NOT IN ('closed','resolved')
   AND lower(coalesce(b.lifecycle_status::text,b.status::text,'open')) NOT IN ('closed','resolved')
   AND ((a.risk_id IS NOT NULL AND a.risk_id=b.risk_id)
     OR (a.source_pulse_id IS NOT NULL AND a.source_pulse_id=b.source_pulse_id)
     OR (a.source_cluster_id IS NOT NULL AND a.source_cluster_id=b.source_cluster_id)
     OR (a.source_governance_review_id IS NOT NULL AND a.source_governance_review_id=b.source_governance_review_id))
  WHERE a.company_id IN (clean_id,migrated_id);
  IF failures > 0 THEN RAISE EXCEPTION '% duplicate active escalation pair(s) found.', failures; END IF;

  SELECT COUNT(*) INTO failures FROM governance_remediation_open_items
   WHERE company_id=migrated_id AND disposition='HUMAN_REVIEW';
  IF failures > 0 THEN RAISE EXCEPTION '% migrated-tenant human-review remediation item(s) remain.', failures; END IF;
END $$;

SELECT conrelid::regclass AS table_name, conname, convalidated
FROM pg_constraint
WHERE conname IN (
  'risk_actions_status_canonical_chk',
  'risk_actions_effectiveness_canonical_chk',
  'risks_status_canonical_chk'
)
ORDER BY 1,2;

SELECT company_id, 'risks' AS record_type, COUNT(*) AS records FROM risks
 WHERE company_id IN (:'clean_tenant_id'::uuid, :'migrated_tenant_id'::uuid) GROUP BY company_id
UNION ALL
SELECT company_id, 'actions', COUNT(*) FROM risk_actions
 WHERE company_id IN (:'clean_tenant_id'::uuid, :'migrated_tenant_id'::uuid) GROUP BY company_id
UNION ALL
SELECT company_id, 'escalations', COUNT(*) FROM escalations
 WHERE company_id IN (:'clean_tenant_id'::uuid, :'migrated_tenant_id'::uuid) GROUP BY company_id
ORDER BY company_id, record_type;

\echo 'PASS: canonical vocabulary, tenant lineage, escalation uniqueness and remediation gates.'
