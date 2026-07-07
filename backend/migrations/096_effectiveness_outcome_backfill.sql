-- 096_effectiveness_outcome_backfill.sql
-- Finding N (deeper fix) — consolidate effectiveness onto ONE canonical column.
-- effectiveness_outcome (TEXT) is what the rating flow writes and what trajectory /
-- directorInsights / the RM 5-screen read. Backfill it from the legacy `effectiveness`
-- enum for historical rows so every reader can rely on effectiveness_outcome alone.
-- Non-destructive (only fills NULLs); the enum column is retained as a fallback.

BEGIN;

UPDATE risk_actions
   SET effectiveness_outcome = CASE effectiveness::text
         WHEN 'Effective'   THEN 'Effective'
         WHEN 'Ineffective' THEN 'Not Effective'
         WHEN 'Neutral'     THEN 'Partially Effective'
         ELSE effectiveness::text
       END
 WHERE effectiveness_outcome IS NULL AND effectiveness IS NOT NULL;

COMMIT;
