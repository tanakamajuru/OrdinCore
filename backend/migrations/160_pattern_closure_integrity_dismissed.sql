-- 160 · Pattern closure integrity — dismissal is terminal, not a closure.
--
-- Migration 159's integrity view treated every terminal cluster_status (Resolved AND Dismissed) as
-- one that must carry a closed_at, so single-signal watches an RM simply DISMISSED as "not a pattern"
-- were flagged RESOLVED_WITHOUT_CLOSED_AT. A dismissal is terminal but is not a closure decision, so it
-- legitimately has no closure timestamp. This refines the view so:
--   * Resolved without closed_at  -> flagged (a genuinely resolved pattern missing its timestamp);
--   * Dismissed without closed_at -> OK (dismissal is not a closure);
-- while the genuinely-important checks are preserved. No governance decision or record is changed.

CREATE OR REPLACE VIEW pattern_closure_integrity_v AS
SELECT sc.id,
       sc.company_id,
       sc.risk_domain,
       sc.cluster_status,
       sc.review_outcome,
       sc.last_reviewed_at,
       sc.closed_at,
       sc.closed_by,
       CASE
         -- A live pattern must never present as closed.
         WHEN sc.review_outcome = 'Close' AND sc.cluster_status NOT IN ('Resolved', 'Dismissed')
           THEN 'CLOSE_OUTCOME_ACTIVE_PATTERN'
         -- A genuine closure (Resolved) must carry its closure timestamp.
         WHEN sc.cluster_status = 'Resolved' AND sc.closed_at IS NULL
           THEN 'RESOLVED_WITHOUT_CLOSED_AT'
         -- An active pattern must not carry a closure timestamp.
         WHEN sc.cluster_status NOT IN ('Resolved', 'Dismissed') AND sc.closed_at IS NOT NULL
           THEN 'ACTIVE_WITH_CLOSED_AT'
         -- Dismissed clusters (terminal, not a closure) are OK with or without closed_at.
         ELSE 'OK'
       END AS integrity_state
  FROM signal_clusters sc;
