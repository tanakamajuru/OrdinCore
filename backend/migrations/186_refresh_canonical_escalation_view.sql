-- Refresh canonical_escalation_state_v so it exposes columns added to `escalations` after the
-- view was first created (16 Oct 2026 production incident).
--
-- Problem: migration 147_canonical_read_side.sql created this view with `SELECT e.*`. Postgres
-- freezes a view's output column list at CREATE VIEW time — it does NOT pick up columns added to
-- the underlying table afterwards, even though the SQL text still says `e.*`. Migration
-- 165_escalation_monitoring_review_persistence.sql later added escalations.next_review_at and
-- escalations.metadata, but nothing re-created the view, so the view silently kept exposing the
-- OLD (pre-165) column set in any environment that had already run 147 before 165. This went
-- unnoticed until the Escalation Monitoring correction (guidedWork.service.ts) selected
-- e.next_review_at and e.metadata through the view for the first time, which then failed with
-- "column e.next_review_at does not exist" in production.
--
-- CREATE OR REPLACE VIEW cannot fix this on its own: Postgres additionally requires every
-- EXISTING output column to keep the same name at the same ordinal position, and the new
-- escalations columns land in the middle of e.*'s expansion relative to the view's previously
-- frozen positions, which CREATE OR REPLACE refuses ("cannot change name of view column
-- ... to ..."). Three other views are built directly on top of this one
-- (canonical_material_count_v, canonical_review_obligation_state_v,
-- canonical_derived_state_provenance_v) — none of them select specific escalation columns beyond
-- company_id/id/house_id/due_by/is_open/canonical_status, so dropping and recreating all four in
-- dependency order is safe and changes no logic, only widens the exposed columns to match the
-- table.
DROP VIEW IF EXISTS canonical_material_count_v;
DROP VIEW IF EXISTS canonical_review_obligation_state_v;
DROP VIEW IF EXISTS canonical_derived_state_provenance_v;
DROP VIEW IF EXISTS canonical_escalation_state_v;

CREATE VIEW canonical_escalation_state_v AS
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

-- Re-create canonical_review_obligation_state_v (147_canonical_read_side.sql) unchanged.
CREATE VIEW canonical_review_obligation_state_v AS
SELECT o.id, o.company_id, o.obligation_type, o.subject_type, o.subject_id,
       o.source_action_id, o.source_risk_id, o.source_escalation_id, o.source_cluster_id,
       o.owner_id, o.owner_role, o.due_at, o.reason, o.status,
       o.completed_at, o.completed_by, o.completion_note, o.created_at, o.updated_at,
       CASE
         WHEN o.status <> 'OPEN' THEN o.status
         WHEN o.subject_type='ACTION' AND EXISTS (
           SELECT 1 FROM canonical_action_state_v a
            WHERE a.company_id=o.company_id AND a.id=o.subject_id
              AND (o.obligation_type <> 'ACTION_EFFECTIVENESS' OR a.requires_effectiveness_review)
         ) THEN 'OPEN'
         WHEN o.subject_type='RISK' AND EXISTS (
           SELECT 1 FROM risks r WHERE r.company_id=o.company_id AND r.id=o.subject_id
             AND LOWER(BTRIM(COALESCE(r.status::text,''))) NOT IN ('closed','resolved')
         ) THEN 'OPEN'
         WHEN o.subject_type='PATTERN' AND EXISTS (
           SELECT 1 FROM canonical_pattern_state_v p WHERE p.company_id=o.company_id AND p.id=o.subject_id AND p.is_active
         ) THEN 'OPEN'
         WHEN o.subject_type='ESCALATION' AND EXISTS (
           SELECT 1 FROM canonical_escalation_state_v e WHERE e.company_id=o.company_id AND e.id=o.subject_id AND e.is_open
         ) THEN 'OPEN'
         ELSE 'CANCELLED'
       END AS canonical_status,
       (
         o.status='OPEN' AND (
           (o.subject_type='ACTION' AND EXISTS (SELECT 1 FROM canonical_action_state_v a WHERE a.company_id=o.company_id AND a.id=o.subject_id AND (o.obligation_type <> 'ACTION_EFFECTIVENESS' OR a.requires_effectiveness_review)))
           OR (o.subject_type='RISK' AND EXISTS (SELECT 1 FROM risks r WHERE r.company_id=o.company_id AND r.id=o.subject_id AND LOWER(BTRIM(COALESCE(r.status::text,''))) NOT IN ('closed','resolved')))
           OR (o.subject_type='PATTERN' AND EXISTS (SELECT 1 FROM canonical_pattern_state_v p WHERE p.company_id=o.company_id AND p.id=o.subject_id AND p.is_active))
           OR (o.subject_type='ESCALATION' AND EXISTS (SELECT 1 FROM canonical_escalation_state_v e WHERE e.company_id=o.company_id AND e.id=o.subject_id AND e.is_open))
         )
       ) AS is_actionable,
       (o.status='OPEN' AND o.due_at <= NOW()) AS is_due,
       (o.status='OPEN' AND o.due_at < NOW()) AS is_overdue
  FROM governance_review_obligations o;

-- Re-create canonical_material_count_v unchanged.
CREATE VIEW canonical_material_count_v AS
 SELECT canonical_risk_state_v.company_id,
    'RISK_REVIEW'::text AS count_type,
    canonical_risk_state_v.id::text AS evidence_id,
    canonical_risk_state_v.house_id,
    canonical_risk_state_v.review_due_at AS due_at
   FROM canonical_risk_state_v
  WHERE canonical_risk_state_v.needs_review
UNION ALL
 SELECT canonical_action_state_v.company_id,
    'ACTION_OPEN'::text AS count_type,
    canonical_action_state_v.id::text AS evidence_id,
    canonical_action_state_v.house_id,
    canonical_action_state_v.due_date AS due_at
   FROM canonical_action_state_v
  WHERE canonical_action_state_v.is_open
UNION ALL
 SELECT ra.company_id,
    'EFFECTIVENESS_REVIEW'::text AS count_type,
    ra.id::text AS evidence_id,
    ra.house_id,
    ra.effectiveness_due_at AS due_at
   FROM canonical_action_state_v ra
  WHERE ra.review_requirement::text = 'EFFECTIVENESS_REQUIRED'::text AND ra.is_completed AND (ra.effectiveness_outcome IS NULL OR (EXISTS ( SELECT 1
           FROM canonical_review_obligation_state_v g
          WHERE g.company_id = ra.company_id AND g.subject_id = ra.id AND g.obligation_type::text = 'ACTION_EFFECTIVENESS'::text AND g.is_due)) OR lower(btrim(COALESCE(ra.effectiveness_outcome, ''::text))) = 'too early to assess'::text AND NOT (EXISTS ( SELECT 1
           FROM canonical_review_obligation_state_v g2
          WHERE g2.company_id = ra.company_id AND g2.subject_id = ra.id AND g2.obligation_type::text = 'ACTION_EFFECTIVENESS'::text AND g2.status::text = 'OPEN'::text)))
UNION ALL
 SELECT canonical_escalation_state_v.company_id,
    'ESCALATION_OPEN'::text AS count_type,
    canonical_escalation_state_v.id::text AS evidence_id,
    canonical_escalation_state_v.house_id,
    canonical_escalation_state_v.due_by AS due_at
   FROM canonical_escalation_state_v
  WHERE canonical_escalation_state_v.is_open
UNION ALL
 SELECT sc.company_id,
    'PATTERN_REVIEW'::text AS count_type,
    sc.id::text AS evidence_id,
    sc.house_id,
    sc.next_review_date::timestamp with time zone AS due_at
   FROM signal_clusters sc
     LEFT JOIN canonical_pattern_formation_v pf ON pf.cluster_id = sc.id
  WHERE (sc.cluster_status = ANY (ARRAY['Emerging'::cluster_status, 'Escalated'::cluster_status, 'Confirmed'::cluster_status])) AND sc.linked_risk_id IS NULL AND ((sc.cluster_status = ANY (ARRAY['Confirmed'::cluster_status, 'Escalated'::cluster_status])) OR COALESCE(pf.qualifying_count, sc.signal_count, 0) >= 2);

-- Re-create canonical_derived_state_provenance_v unchanged.
CREATE VIEW canonical_derived_state_provenance_v AS
 SELECT r.company_id,
    'RISK'::text AS subject_type,
    r.id AS subject_id,
    'risk_status'::text AS derived_field,
    r.canonical_status AS derived_value,
    now() AS calculated_at,
    'canonical_risk_state_v'::text AS calculation_source
   FROM canonical_risk_state_v r
UNION ALL
 SELECT a.company_id,
    'ACTION'::text AS subject_type,
    a.id AS subject_id,
    'action_status'::text AS derived_field,
    a.canonical_status AS derived_value,
    now() AS calculated_at,
    'canonical_action_state_v'::text AS calculation_source
   FROM canonical_action_state_v a
UNION ALL
 SELECT e.company_id,
    'ESCALATION'::text AS subject_type,
    e.id AS subject_id,
    'escalation_status'::text AS derived_field,
    e.canonical_status AS derived_value,
    now() AS calculated_at,
    'canonical_escalation_state_v'::text AS calculation_source
   FROM canonical_escalation_state_v e;
