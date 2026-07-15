-- Migration 098: align existing risks' likelihood/impact (and therefore the generated
-- risk_score = likelihood * impact) with their severity band, so the SCORE shown on a risk
-- can never contradict its severity badge. Historically every promotion hard-coded
-- likelihood = impact = 3 (score 9) regardless of severity, so a Critical and a Low risk
-- both scored 9. New promotions now derive the score from severity (severityToScore); this
-- backfills the risks that already exist.
--
-- 5x5 matrix: Critical -> 5x5 (25), High -> 4x4 (16), Medium/Moderate -> 3x3 (9), Low -> 2x2 (4).
-- Idempotent: only rewrites rows still sitting on the legacy default (likelihood = impact = 3)
-- so any risk that was manually scored is left untouched.
UPDATE risks
   SET likelihood = CASE lower(severity)
                      WHEN 'critical' THEN 5
                      WHEN 'high'     THEN 4
                      WHEN 'low'      THEN 2
                      ELSE 3
                    END,
       impact     = CASE lower(severity)
                      WHEN 'critical' THEN 5
                      WHEN 'high'     THEN 4
                      WHEN 'low'      THEN 2
                      ELSE 3
                    END
 WHERE likelihood = 3 AND impact = 3
   AND lower(severity) IN ('critical','high','low');
