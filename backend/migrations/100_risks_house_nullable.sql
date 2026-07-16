-- Migration 100: allow strategic / cross-service risks to have no single house.
--
-- A systemic pattern spans several services, so the risk it promotes to belongs to the
-- organisation, not one house — house_id must be nullable for it to exist. Previously
-- house_id was NOT NULL, which made promoting a cross-service (systemic) pattern fail with
-- a not-null violation ("blockage" on the pattern board). The read paths already treat a
-- null house_id as a strategic/cross-service risk (risks.controller findById scope check),
-- so this simply removes the write-side blocker. Idempotent.
ALTER TABLE risks ALTER COLUMN house_id DROP NOT NULL;
