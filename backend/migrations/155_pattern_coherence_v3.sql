-- 155 · Pattern coherence V3 (additive; frozen architecture preserved)
--
-- Keeps signal_clusters as the canonical parent pattern and risk_signal_links as
-- its evidence.  This read model separates lifetime evidence from the current
-- rolling window and counts the largest coherent canonical signal-label group.
-- Existing IDs, links, risks, actions, escalations and reports are untouched.

BEGIN;

CREATE OR REPLACE VIEW canonical_pattern_formation_v AS
SELECT sc.id AS cluster_id,
       COALESCE(tr.trigger_signal_count, 3)::int AS threshold,
       COALESCE(tr.window_days, 7)::int AS window_days,
       COALESCE(ev.historical_evidence_count, 0)::int AS historical_evidence_count,
       COALESCE(ev.current_window_count, 0)::int AS current_window_count,
       COALESCE(ev.qualifying_count, 0)::int AS qualifying_count,
       COALESCE(ev.subthemes, '[]'::jsonb) AS subthemes,
       CASE
         WHEN COALESCE(ev.qualifying_count,0) >= COALESCE(tr.trigger_signal_count,3)
           THEN 'COHERENT_SUBTHEME'
         WHEN COALESCE(ev.current_window_count,0) >= COALESCE(tr.trigger_signal_count,3)
           THEN 'MIXED_DOMAIN_REVIEW'
         ELSE 'FORMING'
       END AS formation_basis
  FROM signal_clusters sc
  LEFT JOIN houses h ON h.id=sc.house_id
  LEFT JOIN LATERAL (
    SELECT x.trigger_signal_count, x.window_days
      FROM threshold_rules x
     WHERE x.domain_name=sc.risk_domain AND x.is_active=true
       AND (h.sector IS NULL OR x.sector=h.sector)
     ORDER BY CASE WHEN h.sector IS NOT NULL AND x.sector=h.sector THEN 0 ELSE 1 END
     LIMIT 1
  ) tr ON true
  LEFT JOIN LATERAL (
    WITH evidence AS (
      SELECT gp.id, gp.entry_date,
             CASE
               WHEN gp.signal_label IS NULL OR BTRIM(gp.signal_label)='' OR LOWER(BTRIM(gp.signal_label))='other'
                 THEN '__unclassified__:' || gp.id::text
               ELSE LOWER(BTRIM(gp.signal_label))
             END AS coherence_key,
             COALESCE(NULLIF(BTRIM(gp.signal_label),''),'Unclassified') AS display_label
        FROM risk_signal_links rsl
        JOIN governance_pulses gp ON gp.id=rsl.pulse_entry_id AND gp.company_id=sc.company_id
       WHERE rsl.cluster_id=sc.id
    ), current_evidence AS (
      SELECT * FROM evidence
       WHERE entry_date >= CURRENT_DATE - (COALESCE(tr.window_days,7) * INTERVAL '1 day')
    ), grouped AS (
      SELECT coherence_key, MIN(display_label) AS label, COUNT(*)::int AS count
        FROM current_evidence GROUP BY coherence_key
    )
    SELECT (SELECT COUNT(*) FROM evidence)::int AS historical_evidence_count,
           (SELECT COUNT(*) FROM current_evidence)::int AS current_window_count,
           COALESCE((SELECT MAX(count) FROM grouped),0)::int AS qualifying_count,
           COALESCE((SELECT jsonb_agg(jsonb_build_object('label',label,'count',count)
                                      ORDER BY count DESC,label)
                       FROM grouped WHERE coherence_key NOT LIKE '__unclassified__:%'), '[]'::jsonb) AS subthemes
  ) ev ON true;

COMMENT ON VIEW canonical_pattern_formation_v IS
  'V3 read model: parent patterns remain domain-scoped; readiness uses coherent canonical signal labels in the current configured window.';

COMMIT;
