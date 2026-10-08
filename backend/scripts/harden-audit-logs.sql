-- Make audit_logs append-only / tamper-resistant (DSPT Standard 4).
--
-- OPERATOR SCRIPT — run as the postgres superuser, NOT via the app migration runner.
-- It changes ownership away from the application role (ordinuser), so the app runner (which
-- connects as ordinuser) cannot execute it and must never contain it. Apply with:
--
--     sudo -u postgres psql ordincore -f backend/scripts/harden-audit-logs.sql
--
-- Idempotent: safe to re-run. Verify afterwards that as ordinuser INSERT/SELECT succeed and
-- UPDATE/DELETE/TRUNCATE are denied.
BEGIN;

-- Ownership off the app role so it can never re-grant itself write/alter rights.
ALTER TABLE audit_logs OWNER TO postgres;

-- App role: append + read only. No UPDATE / DELETE / TRUNCATE.
REVOKE ALL ON audit_logs FROM ordinuser;
GRANT INSERT, SELECT ON audit_logs TO ordinuser;

-- Belt-and-braces: refuse any UPDATE/DELETE at the row level, so history cannot be rewritten
-- even if privileges were somehow restored. (Owned by postgres; the app cannot drop it.)
CREATE OR REPLACE FUNCTION audit_logs_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP;
END; $$;
DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;
CREATE TRIGGER trg_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();

COMMIT;

-- Verification (expect: ins=t sel=t upd=f del=f trunc=f):
-- SELECT has_table_privilege('ordinuser','audit_logs','INSERT')  AS ins,
--        has_table_privilege('ordinuser','audit_logs','SELECT')  AS sel,
--        has_table_privilege('ordinuser','audit_logs','UPDATE')  AS upd,
--        has_table_privilege('ordinuser','audit_logs','DELETE')  AS del,
--        has_table_privilege('ordinuser','audit_logs','TRUNCATE') AS trunc;
