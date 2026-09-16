\set ON_ERROR_STOP on
-- Final truth-chain boundary release checks.

-- 1. Provider timezone/cadence must be explicit and valid.
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM companies WHERE governance_timezone IS NULL OR BTRIM(governance_timezone)='') THEN
   RAISE EXCEPTION 'Missing governance timezone';
 END IF;
 IF EXISTS (SELECT 1 FROM companies WHERE weekly_governance_review_dow NOT BETWEEN 0 AND 6) THEN
   RAISE EXCEPTION 'Invalid weekly governance review day';
 END IF;
END $$;

-- 2. Signed Daily Governance snapshot must declare the same governance date as the log.
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM daily_governance_log dgl
    WHERE dgl.completed
      AND dgl.evidence_snapshot IS NOT NULL
      AND dgl.evidence_snapshot ? 'provenance'
      AND NULLIF(dgl.evidence_snapshot->'provenance'->>'governance_date','') IS NOT NULL
      AND (dgl.evidence_snapshot->'provenance'->>'governance_date')::date <> dgl.review_date
 ) THEN RAISE EXCEPTION 'Daily Governance snapshot date differs from review_date'; END IF;
END $$;

-- 3. Snapshot signal IDs must be genuine governance_pulses and belong to the signed service/date.
DO $$
DECLARE bad bigint;
BEGIN
 SELECT count(*) INTO bad
 FROM daily_governance_log dgl
 CROSS JOIN LATERAL jsonb_array_elements(COALESCE(dgl.evidence_snapshot->'signals','[]'::jsonb)) s
 LEFT JOIN governance_pulses gp ON gp.id=(s->>'id')::uuid
 WHERE dgl.completed AND (gp.id IS NULL OR gp.house_id<>dgl.house_id OR gp.entry_date<>dgl.review_date);
 IF bad>0 THEN RAISE EXCEPTION 'Daily snapshot contains % signal(s) outside signed service/date',bad; END IF;
END $$;

-- 4. Historical frozen reports deliberately remain point-in-time and are not asserted against current-state views here.
SELECT 'PASS: truth-chain release boundary checks' AS result;
