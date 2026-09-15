-- Stage 10K: canonical read-side state.
-- Purpose: one authoritative interpretation of lifecycle/read state across Guided Work,
-- Risk Register, RM5, Actions, Escalations, Patterns and reporting scopes.
-- This migration does NOT change the frozen governance lifecycle or write pathways.
BEGIN;

-- Active service scope. Historical/closed services stay queryable, but operational readers
-- consume is_active instead of reinterpreting free-text status themselves.
CREATE OR REPLACE VIEW canonical_house_state_v AS
SELECT h.*,
       CASE
         WHEN LOWER(BTRIM(COALESCE(h.status::text,''))) IN ('closed','inactive','archived') THEN 'CLOSED'
         ELSE 'ACTIVE'
       END AS canonical_status,
       LOWER(BTRIM(COALESCE(h.status::text,''))) NOT IN ('closed','inactive','archived') AS is_active
  FROM houses h;

CREATE OR REPLACE VIEW canonical_action_state_v AS
SELECT ra.*,
       CASE
         WHEN ra.completed_at IS NOT NULL
           OR LOWER(BTRIM(COALESCE(ra.status::text,''))) IN ('complete','completed','closed','resolved') THEN 'COMPLETED'
         WHEN LOWER(BTRIM(COALESCE(ra.status::text,''))) IN ('cancelled','canceled') THEN 'CANCELLED'
         WHEN LOWER(BTRIM(COALESCE(ra.status::text,''))) IN ('in progress','in_progress','ongoing') THEN 'IN_PROGRESS'
         ELSE 'OPEN'
       END AS canonical_status,
       NOT (
         ra.completed_at IS NOT NULL
         OR LOWER(BTRIM(COALESCE(ra.status::text,''))) IN ('complete','completed','closed','resolved','cancelled','canceled')
       ) AS is_open,
       (
         ra.completed_at IS NOT NULL
         OR LOWER(BTRIM(COALESCE(ra.status::text,''))) IN ('complete','completed','closed','resolved')
       ) AS is_completed,
       (
         (ra.completed_at IS NOT NULL OR LOWER(BTRIM(COALESCE(ra.status::text,''))) IN ('complete','completed','closed','resolved'))
         AND (
           ra.effectiveness_outcome IS NULL
           OR LOWER(BTRIM(COALESCE(ra.effectiveness_outcome::text,''))) = 'too early to assess'
         )
       ) AS requires_effectiveness_review
  FROM risk_actions ra;

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

CREATE OR REPLACE VIEW canonical_pattern_state_v AS
SELECT sc.*,
       CASE
         WHEN LOWER(BTRIM(COALESCE(sc.cluster_status::text,''))) IN ('resolved','closed','dismissed') THEN 'CLOSED'
         WHEN LOWER(BTRIM(COALESCE(sc.cluster_status::text,''))) = 'escalated' THEN 'ESCALATED'
         WHEN LOWER(BTRIM(COALESCE(sc.cluster_status::text,''))) = 'confirmed' THEN 'CONFIRMED'
         ELSE 'EMERGING'
       END AS canonical_status,
       LOWER(BTRIM(COALESCE(sc.cluster_status::text,''))) NOT IN ('resolved','closed','dismissed') AS is_active,
       LOWER(BTRIM(COALESCE(sc.cluster_status::text,''))) IN ('resolved','closed','dismissed') AS is_closed,
       sc.next_review_date::timestamptz AS review_due_at,
       (sc.next_review_date IS NOT NULL AND sc.next_review_date <= CURRENT_DATE
         AND LOWER(BTRIM(COALESCE(sc.cluster_status::text,''))) NOT IN ('resolved','closed','dismissed')) AS review_due
  FROM signal_clusters sc;

-- Review obligations are the canonical scheduler. The view also confirms that the underlying
-- subject is still live before a read projection can surface the obligation as actionable.
CREATE OR REPLACE VIEW canonical_review_obligation_state_v AS
SELECT o.*,
       CASE
         WHEN o.status <> 'OPEN' THEN o.status
         WHEN o.subject_type='ACTION' AND EXISTS (
           SELECT 1 FROM canonical_action_state_v a
            WHERE a.company_id=o.company_id AND a.id=o.subject_id
              AND (o.obligation_type <> 'ACTION_EFFECTIVENESS' OR a.requires_effectiveness_review)
         ) THEN 'OPEN'
         WHEN o.subject_type='RISK' AND EXISTS (
           SELECT 1 FROM risks r
            WHERE r.company_id=o.company_id AND r.id=o.subject_id
              AND LOWER(BTRIM(COALESCE(r.status::text,''))) NOT IN ('closed','resolved')
         ) THEN 'OPEN'
         WHEN o.subject_type='PATTERN' AND EXISTS (
           SELECT 1 FROM canonical_pattern_state_v p
            WHERE p.company_id=o.company_id AND p.id=o.subject_id AND p.is_active
         ) THEN 'OPEN'
         WHEN o.subject_type='ESCALATION' AND EXISTS (
           SELECT 1 FROM canonical_escalation_state_v e
            WHERE e.company_id=o.company_id AND e.id=o.subject_id AND e.is_open
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

CREATE OR REPLACE VIEW canonical_risk_state_v AS
SELECT r.*,
       CASE
         WHEN LOWER(BTRIM(COALESCE(r.status::text,''))) IN ('closed','resolved')
              OR (COALESCE(r.closed_at,r.resolved_at) IS NOT NULL AND (r.reopened_at IS NULL OR r.reopened_at <= COALESCE(r.closed_at,r.resolved_at))) THEN 'CLOSED'
         WHEN LOWER(BTRIM(COALESCE(r.status::text,''))) = 'escalated' THEN 'ESCALATED'
         WHEN LOWER(BTRIM(COALESCE(r.status::text,''))) IN ('under review','under_review') THEN 'UNDER_REVIEW'
         WHEN LOWER(BTRIM(COALESCE(r.status::text,''))) IN ('in progress','in_progress') THEN 'IN_PROGRESS'
         ELSE 'OPEN'
       END AS canonical_status,
       NOT (
         LOWER(BTRIM(COALESCE(r.status::text,''))) IN ('closed','resolved')
         OR (COALESCE(r.closed_at,r.resolved_at) IS NOT NULL AND (r.reopened_at IS NULL OR r.reopened_at <= COALESCE(r.closed_at,r.resolved_at)))
       ) AS is_active,
       (
         LOWER(BTRIM(COALESCE(r.status::text,''))) IN ('closed','resolved')
         OR (COALESCE(r.closed_at,r.resolved_at) IS NOT NULL AND (r.reopened_at IS NULL OR r.reopened_at <= COALESCE(r.closed_at,r.resolved_at)))
       ) AS is_closed,
       COALESCE(r.next_review_date::timestamptz, r.review_due_date) AS review_due_at,
       EXISTS (
         SELECT 1 FROM canonical_review_obligation_state_v o
          WHERE o.company_id=r.company_id AND o.is_actionable AND o.is_due
            AND o.obligation_type IN ('RISK_SCHEDULED_REVIEW','RISK_POST_EFFECTIVENESS','POST_ESCALATION_RISK')
            AND (o.source_risk_id=r.id OR (o.subject_type='RISK' AND o.subject_id=r.id))
       ) AS needs_review,
       EXISTS (
         SELECT 1 FROM canonical_review_obligation_state_v o
          WHERE o.company_id=r.company_id AND o.is_actionable AND o.is_overdue
            AND o.obligation_type IN ('RISK_SCHEDULED_REVIEW','RISK_POST_EFFECTIVENESS','POST_ESCALATION_RISK')
            AND (o.source_risk_id=r.id OR (o.subject_type='RISK' AND o.subject_id=r.id))
       ) AS review_overdue,
       (SELECT COUNT(*)::int FROM canonical_action_state_v a WHERE a.company_id=r.company_id AND a.risk_id=r.id AND a.is_open) AS open_actions_count
  FROM risks r;

-- Reconcile stale open obligations against canonical subject state. This only closes superseded
-- scheduler rows; it never changes a risk/action/escalation/pattern lifecycle decision.
CREATE OR REPLACE FUNCTION reconcile_canonical_read_side(target_company UUID DEFAULT NULL)
RETURNS TABLE(cancelled_count INTEGER, completed_count INTEGER)
LANGUAGE plpgsql AS $$
DECLARE c1 INTEGER := 0; c2 INTEGER := 0; n INTEGER := 0;
BEGIN
  -- Closed/missing subjects cannot remain actionable.
  UPDATE governance_review_obligations o
     SET status='CANCELLED', completion_note=COALESCE(completion_note,'Canonical read reconciliation: subject no longer actionable.'), updated_at=NOW()
   WHERE o.status='OPEN' AND (target_company IS NULL OR o.company_id=target_company)
     AND NOT EXISTS (
       SELECT 1 FROM canonical_review_obligation_state_v cv
        WHERE cv.id=o.id AND cv.is_actionable
     );
  GET DIAGNOSTICS c1 = ROW_COUNT;

  -- A completed effectiveness review resolves its scheduler obligation.
  UPDATE governance_review_obligations o
     SET status='COMPLETED', completed_at=COALESCE(completed_at,NOW()), completion_note=COALESCE(completion_note,'Canonical read reconciliation: effectiveness already reviewed.'), updated_at=NOW()
   WHERE o.status='OPEN' AND o.obligation_type='ACTION_EFFECTIVENESS'
     AND (target_company IS NULL OR o.company_id=target_company)
     AND EXISTS (
       SELECT 1 FROM canonical_action_state_v a
        WHERE a.company_id=o.company_id AND a.id=COALESCE(o.source_action_id,o.subject_id)
          AND a.is_completed AND NOT a.requires_effectiveness_review
     );
  GET DIAGNOSTICS n = ROW_COUNT; c2 := c2 + n;

  -- A risk review recorded on/after the due point resolves all due risk obligations for that risk.
  UPDATE governance_review_obligations o
     SET status='COMPLETED', completed_at=COALESCE(completed_at,NOW()), completion_note=COALESCE(completion_note,'Canonical read reconciliation: risk review already recorded.'), updated_at=NOW()
   WHERE o.status='OPEN'
     AND o.obligation_type IN ('RISK_SCHEDULED_REVIEW','RISK_POST_EFFECTIVENESS','POST_ESCALATION_RISK')
     AND (target_company IS NULL OR o.company_id=target_company)
     AND EXISTS (
       SELECT 1 FROM risks r
        WHERE r.company_id=o.company_id AND r.id=COALESCE(o.source_risk_id,o.subject_id)
          AND r.last_governance_review_at IS NOT NULL AND r.last_governance_review_at >= o.due_at
     );
  GET DIAGNOSTICS n = ROW_COUNT; c2 := c2 + n;

  -- A pattern reviewed on/after its due point resolves the pattern review obligation.
  UPDATE governance_review_obligations o
     SET status='COMPLETED', completed_at=COALESCE(completed_at,NOW()), completion_note=COALESCE(completion_note,'Canonical read reconciliation: pattern review already recorded.'), updated_at=NOW()
   WHERE o.status='OPEN' AND o.obligation_type='PATTERN_REVIEW'
     AND (target_company IS NULL OR o.company_id=target_company)
     AND EXISTS (
       SELECT 1 FROM signal_clusters p
        WHERE p.company_id=o.company_id AND p.id=COALESCE(o.source_cluster_id,o.subject_id)
          AND p.last_reviewed_at IS NOT NULL AND p.last_reviewed_at >= o.due_at
     );
  GET DIAGNOSTICS n = ROW_COUNT; c2 := c2 + n;

  cancelled_count := c1; completed_count := c2; RETURN NEXT;
END $$;

CREATE INDEX IF NOT EXISTS idx_risks_company_status_lower ON risks(company_id, LOWER(status::text));
CREATE INDEX IF NOT EXISTS idx_actions_company_status_lower ON risk_actions(company_id, LOWER(status::text));
CREATE INDEX IF NOT EXISTS idx_escalations_company_due ON escalations(company_id, due_by);
CREATE INDEX IF NOT EXISTS idx_review_obligations_company_due_open ON governance_review_obligations(company_id, due_at) WHERE status='OPEN';

COMMIT;
