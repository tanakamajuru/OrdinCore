-- 115_sector_services.sql
-- Give each care sector its own service so Domiciliary Care and Supported Living report
-- separately out of the box (the default single "Main Service" lumped them together). Providers
-- can still regroup sites via the admin UI later. Idempotent.

BEGIN;

-- A service per (company, sector) with a friendly name.
INSERT INTO services (company_id, name)
SELECT DISTINCT h.company_id,
       CASE UPPER(COALESCE(h.sector, 'SUPPORTED_LIVING'))
            WHEN 'DOMICILIARY' THEN 'Domiciliary Care' ELSE 'Supported Living' END
  FROM houses h
 WHERE h.status <> 'closed'
   AND NOT EXISTS (
     SELECT 1 FROM services s
      WHERE s.company_id = h.company_id
        AND s.name = CASE UPPER(COALESCE(h.sector, 'SUPPORTED_LIVING'))
                          WHEN 'DOMICILIARY' THEN 'Domiciliary Care' ELSE 'Supported Living' END);

-- Point each house at its sector service.
UPDATE houses h
   SET service_id = s.id
  FROM services s
 WHERE s.company_id = h.company_id
   AND s.name = CASE UPPER(COALESCE(h.sector, 'SUPPORTED_LIVING'))
                     WHEN 'DOMICILIARY' THEN 'Domiciliary Care' ELSE 'Supported Living' END;

-- Drop the now-empty default "Main Service" so the picker stays clean.
DELETE FROM services s
 WHERE s.name = 'Main Service'
   AND NOT EXISTS (SELECT 1 FROM houses h WHERE h.service_id = s.id);

COMMIT;
