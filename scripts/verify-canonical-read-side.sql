\set ON_ERROR_STOP on

-- Canonical views must exist.
SELECT to_regclass('canonical_house_state_v') IS NOT NULL AS house_view_ok,
       to_regclass('canonical_risk_state_v') IS NOT NULL AS risk_view_ok,
       to_regclass('canonical_action_state_v') IS NOT NULL AS action_view_ok,
       to_regclass('canonical_escalation_state_v') IS NOT NULL AS escalation_view_ok,
       to_regclass('canonical_pattern_state_v') IS NOT NULL AS pattern_view_ok,
       to_regclass('canonical_review_obligation_state_v') IS NOT NULL AS obligation_view_ok;

-- Stale OPEN obligations whose subject is no longer actionable should be zero after reconcile.
SELECT COUNT(*) AS stale_open_obligations
  FROM canonical_review_obligation_state_v
 WHERE status='OPEN' AND NOT is_actionable;

-- One canonical risk is counted once as review-due no matter how many triggers exist.
SELECT COUNT(*) AS risks_due_for_review
  FROM canonical_risk_state_v
 WHERE is_active AND needs_review;

-- These figures are the values all current-state readers should reconcile to.
SELECT company_id,
       COUNT(*) FILTER (WHERE is_active)::int AS active_risks,
       COUNT(*) FILTER (WHERE needs_review)::int AS risk_reviews_due,
       COUNT(*) FILTER (WHERE review_overdue)::int AS risk_reviews_overdue
  FROM canonical_risk_state_v GROUP BY company_id ORDER BY company_id;

SELECT company_id,
       COUNT(*) FILTER (WHERE is_open)::int AS open_actions,
       COUNT(*) FILTER (WHERE requires_effectiveness_review)::int AS effectiveness_reviews_due
  FROM canonical_action_state_v GROUP BY company_id ORDER BY company_id;

SELECT company_id,
       COUNT(*) FILTER (WHERE is_open)::int AS open_escalations,
       COUNT(*) FILTER (WHERE is_overdue)::int AS overdue_escalations
  FROM canonical_escalation_state_v GROUP BY company_id ORDER BY company_id;
