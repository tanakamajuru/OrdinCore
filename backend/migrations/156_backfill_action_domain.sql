-- 156 · Backfill governance_domain on legacy risk_actions (guardrail completion).
--
-- The canonical control-position derivation buckets completed actions by governance_domain. A NULL
-- domain becomes a phantom 'GENERAL' bucket that can neither supersede nor be superseded by the
-- linked risk's real-domain controls — the deadlock that previously blocked closing a risk/escalation
-- whose later Effective control had no domain. V2 already sets governance_domain on every NEW action
-- (canonicalActionDomainSql, defaulting to 'Uncategorised', never NULL). This migration remediates the
-- remaining legacy rows so no action is domainless, using the SAME source precedence as that helper:
-- risk domain -> strategic theme -> cluster domain -> pulse domain -> pulse risk_domain[1] -> Uncategorised.
-- Historical evidence is not rewritten; only the domain label is filled in.

UPDATE risk_actions ra
   SET governance_domain = d.derived,
       updated_at = NOW()
  FROM (
    SELECT a.id,
           COALESCE(
             NULLIF(TRIM(r.risk_domain), ''),
             NULLIF(TRIM(r.strategic_theme), ''),
             NULLIF(TRIM(sc.risk_domain), ''),
             NULLIF(TRIM(p.governance_domain), ''),
             NULLIF(TRIM((p.risk_domain)[1]), ''),
             'Uncategorised'
           ) AS derived
      FROM risk_actions a
      LEFT JOIN risks r            ON r.id  = a.risk_id
      LEFT JOIN signal_clusters sc ON sc.id = a.source_cluster_id
      LEFT JOIN governance_pulses p ON p.id = a.source_pulse_id
     WHERE a.governance_domain IS NULL OR BTRIM(a.governance_domain) = ''
  ) d
 WHERE ra.id = d.id;

-- Post-condition guard: no action may remain domainless.
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM risk_actions WHERE governance_domain IS NULL OR BTRIM(governance_domain) = '';
  IF n > 0 THEN RAISE EXCEPTION 'Action-domain backfill incomplete: % actions still have no governance_domain', n; END IF;
END $$;
