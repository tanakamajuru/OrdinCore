-- Stage 6: one read definition for "control failure" across registers and reports.
BEGIN;

CREATE OR REPLACE VIEW canonical_control_failures AS
SELECT 'flag:' || cff.id::text AS source_key,
       h.company_id, cff.service_id, cff.risk_id,
       cff.failure_type, cff.threshold_trigger AS evidence,
       cff.detected_at
  FROM control_failure_flags cff
  JOIN houses h ON h.id=cff.service_id
 WHERE cff.resolved_at IS NULL
UNION ALL
SELECT 'action:' || ra.id::text AS source_key,
       ra.company_id, COALESCE(ra.house_id,r.house_id) AS service_id, ra.risk_id,
       'ineffective_action'::varchar(50) AS failure_type,
       COALESCE(ra.effectiveness_evidence,ra.completion_evidence,'Effectiveness rated Not Effective') AS evidence,
       COALESCE(ra.effectiveness_reviewed_at,ra.updated_at,ra.completed_at,ra.created_at) AS detected_at
  FROM risk_actions ra
  LEFT JOIN risks r ON r.id=ra.risk_id AND r.company_id=ra.company_id
 WHERE LOWER(COALESCE(ra.effectiveness_outcome::text,ra.effectiveness::text,'')) IN ('not effective','ineffective')
   AND NOT EXISTS (
     SELECT 1 FROM control_failure_flags cff
      WHERE cff.risk_id=ra.risk_id AND cff.resolved_at IS NULL
        AND cff.failure_type IN ('ineffective_actions','ineffective_action')
   );

COMMIT;
