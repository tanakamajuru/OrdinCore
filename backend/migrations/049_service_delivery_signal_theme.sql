-- Migration 049: Service Delivery signal category
-- Adds the domiciliary-care theme (missed/late/short visits, double-up failure,
-- continuity/capacity) so the platform fits home care (spec module 1 / 14.4).
-- (Renumbered from spec's 041. NOTE: risk_categories has no created_by column,
--  so it is omitted from the INSERT to avoid a failed migration.)

INSERT INTO risk_categories (id, company_id, name, description, color)
SELECT uuid_generate_v4(), c.id, 'Service Delivery',
       'Missed visits, late visits, short visits, double-up failures, continuity or capacity concerns',
       '#2563eb'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM risk_categories rc
  WHERE rc.company_id = c.id AND LOWER(rc.name) = 'service delivery'
);
