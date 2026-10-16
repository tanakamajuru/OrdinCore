-- Refresh canonical_escalation_state_v so it exposes columns added to `escalations` after the
-- view was first created (16 Oct 2026 incident).
--
-- Problem: migration 147_canonical_read_side.sql created this view with `SELECT e.*`. Postgres
-- freezes a view's output column list at CREATE VIEW time — it does NOT pick up columns added to
-- the underlying table afterwards, even though the SQL text says `e.*`. Migration
-- 165_escalation_monitoring_review_persistence.sql later added escalations.next_review_at and
-- escalations.metadata, but nothing re-created the view, so on every environment that had already
-- run 147 before 165, the view silently kept exposing the OLD (pre-165) column set. This went
-- unnoticed until the Escalation Monitoring correction (guidedWork.service.ts) selected
-- e.next_review_at and e.metadata through the view for the first time, which then failed with
-- "column e.next_review_at does not exist" in production.
--
-- Fix: CREATE OR REPLACE VIEW re-expands `e.*` against the CURRENT table definition. Identical to
-- 147's definition — this changes no logic, only widens the exposed columns to match the table.
CREATE OR REPLACE VIEW canonical_escalation_state_v AS
SELECT e.*,
       CASE
         WHEN LOWER(BTRIM(COALESCE(e.lifecycle_status::text,e.status::text,''))) IN ('closed','resolved')
              OR COALESCE(e.resolved_at, e.closed_at) IS NOT NULL THEN 'CLOSED'
         WHEN LOWER(BTRIM(COALESCE(e.lifecycle_status::text,e.status::text,''))) IN ('under review','under_review') THEN 'UNDER_REVIEW'
         WHEN LOWER(BTRIM(COALESCE(e.lifecycle_status::text,e.status::text,''))) IN ('acknowledged','in progress','in_progress') THEN 'IN_PROGRESS'
         ELSE 'OPEN'
       END AS canonical_status,
       NOT (
         LOWER(BTRIM(COALESCE(e.lifecycle_status::text,e.status::text,''))) IN ('closed','resolved')
         OR COALESCE(e.resolved_at, e.closed_at) IS NOT NULL
       ) AS is_open,
       (
         LOWER(BTRIM(COALESCE(e.lifecycle_status::text,e.status::text,''))) IN ('closed','resolved')
         OR COALESCE(e.resolved_at, e.closed_at) IS NOT NULL
       ) AS is_closed,
       (
         NOT (LOWER(BTRIM(COALESCE(e.lifecycle_status::text,e.status::text,''))) IN ('closed','resolved') OR COALESCE(e.resolved_at,e.closed_at) IS NOT NULL)
         AND e.due_by IS NOT NULL AND e.due_by < NOW()
       ) AS is_overdue
  FROM escalations e;
