-- 112_users_role_support_worker.sql
-- The application has a first-class SUPPORT_WORKER role (mobile capture flows, scope middleware,
-- compliance roster, signal recording), but the users_role_check constraint never listed it — so a
-- Support Worker account could not be created at all. Add SUPPORT_WORKER (and its short alias SW)
-- to the allowed set.

BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  (role)::text = ANY (ARRAY[
    'SUPER_ADMIN','ADMIN','REGISTERED_MANAGER','RESPONSIBLE_INDIVIDUAL','DIRECTOR',
    'TEAM_LEADER','SUPPORT_WORKER','RM','TL','RI','DIR','SW'
  ]::text[])
);

COMMIT;
