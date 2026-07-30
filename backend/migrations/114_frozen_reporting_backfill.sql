-- 114_frozen_reporting_backfill.sql
-- Populate the new hierarchy + person linkage from existing data. Idempotent.

BEGIN;

-- ---- Default service + region per company, all sites assigned --------------------
-- Gives a working hierarchy on day one; admins can rename/regroup sites afterwards.
INSERT INTO services (company_id, name)
  SELECT c.id, 'Main Service' FROM companies c
   WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.company_id = c.id);
INSERT INTO regions (company_id, name)
  SELECT c.id, 'Main Region' FROM companies c
   WHERE NOT EXISTS (SELECT 1 FROM regions r WHERE r.company_id = c.id);

UPDATE houses h
   SET service_id = (SELECT s.id FROM services s WHERE s.company_id = h.company_id ORDER BY s.created_at LIMIT 1)
 WHERE h.service_id IS NULL;
UPDATE houses h
   SET region_id = (SELECT r.id FROM regions r WHERE r.company_id = h.company_id ORDER BY r.created_at LIMIT 1)
 WHERE h.region_id IS NULL;

-- ---- Person linkage: match the free-text name to a service_user on the same site --
UPDATE governance_pulses gp
   SET service_user_id = su.id
  FROM service_users su
 WHERE gp.service_user_id IS NULL
   AND gp.related_person IS NOT NULL AND TRIM(gp.related_person) <> ''
   AND su.house_id = gp.house_id
   AND LOWER(TRIM(su.display_name)) = LOWER(TRIM(gp.related_person));

UPDATE risks r
   SET service_user_id = su.id
  FROM service_users su
 WHERE r.service_user_id IS NULL
   AND r.linked_person IS NOT NULL AND TRIM(r.linked_person) <> ''
   AND su.house_id = r.house_id
   AND LOWER(TRIM(su.display_name)) = LOWER(TRIM(r.linked_person));

-- Escalations and actions inherit the person from the risk/signal they belong to.
UPDATE escalations e
   SET service_user_id = COALESCE(
         (SELECT r.service_user_id  FROM risks r              WHERE r.id  = e.risk_id),
         (SELECT gp.service_user_id FROM governance_pulses gp WHERE gp.id = e.source_pulse_id))
 WHERE e.service_user_id IS NULL;

UPDATE risk_actions ra
   SET service_user_id = (SELECT r.service_user_id FROM risks r WHERE r.id = ra.risk_id)
 WHERE ra.service_user_id IS NULL;

COMMIT;
