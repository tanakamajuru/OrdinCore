-- Migration 099: finish aligning risk_score to severity. Migration 098 only rewrote rows
-- still on the legacy 3x3 default; a few risks carried other stray likelihood/impact values
-- (e.g. a High risk scoring 1) that still contradicted their severity badge. Numeric
-- likelihood/impact in this product are always system-derived (there is no user-facing
-- numeric scorer — the assessment editor edits impact TEXT), so it is safe to align every
-- risk whose score does not already match its severity band.
--
-- 5x5 matrix: Critical -> 25, High -> 16, Medium/Moderate -> 9, Low -> 4.
UPDATE risks
   SET likelihood = CASE lower(severity::text)
                      WHEN 'critical' THEN 5
                      WHEN 'high'     THEN 4
                      WHEN 'low'      THEN 2
                      ELSE 3
                    END,
       impact     = CASE lower(severity::text)
                      WHEN 'critical' THEN 5
                      WHEN 'high'     THEN 4
                      WHEN 'low'      THEN 2
                      ELSE 3
                    END
 WHERE COALESCE(likelihood,0) * COALESCE(impact,0) <> CASE lower(severity::text)
                      WHEN 'critical' THEN 25
                      WHEN 'high'     THEN 16
                      WHEN 'low'      THEN 4
                      ELSE 9
                    END;
