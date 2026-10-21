-- canonical_pattern_state_v lists its columns explicitly (not sc.*), so migration 193's new
-- signal_clusters.reassessed_from_id column is invisible through it until added here. Appending a
-- new trailing column is a valid CREATE OR REPLACE (no existing column renamed or reordered).
CREATE OR REPLACE VIEW canonical_pattern_state_v AS
SELECT sc.id,
       sc.company_id,
       sc.house_id,
       sc.risk_domain,
       sc.cluster_label,
       sc.cluster_status,
       sc.signal_count,
       sc.first_signal_date,
       sc.last_signal_date,
       sc.trajectory,
       sc.linked_risk_id,
       sc.created_by_system,
       sc.dismissed_by,
       sc.dismiss_reason,
       sc.created_at,
       sc.updated_at,
       sc.linked_person,
       sc.promoted_at,
       sc.scope,
       sc.affected_house_ids,
       sc.last_reviewed_at,
       sc.last_reviewed_by,
       sc.next_review_date,
       sc.review_outcome,
       sc.closure_reason,
       sc.closed_at,
       sc.closed_by,
       sc.service_user_id,
       CASE
           WHEN lower(btrim(COALESCE(sc.cluster_status::text, ''::text))) = ANY (ARRAY['resolved'::text, 'closed'::text, 'dismissed'::text]) THEN 'CLOSED'::text
           WHEN lower(btrim(COALESCE(sc.cluster_status::text, ''::text))) = 'escalated'::text THEN 'ESCALATED'::text
           WHEN lower(btrim(COALESCE(sc.cluster_status::text, ''::text))) = 'confirmed'::text THEN 'CONFIRMED'::text
           ELSE 'EMERGING'::text
       END AS canonical_status,
       lower(btrim(COALESCE(sc.cluster_status::text, ''::text))) <> ALL (ARRAY['resolved'::text, 'closed'::text, 'dismissed'::text]) AS is_active,
       lower(btrim(COALESCE(sc.cluster_status::text, ''::text))) = ANY (ARRAY['resolved'::text, 'closed'::text, 'dismissed'::text]) AS is_closed,
       sc.next_review_date::timestamp with time zone AS review_due_at,
       sc.next_review_date IS NOT NULL AND sc.next_review_date <= CURRENT_DATE AND (lower(btrim(COALESCE(sc.cluster_status::text, ''::text))) <> ALL (ARRAY['resolved'::text, 'closed'::text, 'dismissed'::text])) AS review_due,
       sc.reassessed_from_id
  FROM signal_clusters sc;
