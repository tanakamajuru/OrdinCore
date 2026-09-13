BEGIN;

-- Database-level normaliser used by reporting/reconciliation SQL that cannot import TypeScript.
CREATE OR REPLACE FUNCTION canonical_effectiveness_outcome(canonical_value TEXT, legacy_value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE LOWER(TRIM(COALESCE(canonical_value, legacy_value, '')))
    WHEN 'effective' THEN 'Effective'
    WHEN 'neutral' THEN 'Partially Effective'
    WHEN 'partial' THEN 'Partially Effective'
    WHEN 'partially' THEN 'Partially Effective'
    WHEN 'partially effective' THEN 'Partially Effective'
    WHEN 'ineffective' THEN 'Not Effective'
    WHEN 'not effective' THEN 'Not Effective'
    WHEN 'too early' THEN 'Too Early To Assess'
    WHEN 'too early to assess' THEN 'Too Early To Assess'
    ELSE NULL END
$$;

-- Read-only canonical contract. Consumers receive one resolved domain and one resolved outcome.
CREATE OR REPLACE VIEW canonical_action_governance AS
SELECT ra.id, ra.company_id, ra.house_id, ra.risk_id, ra.source_cluster_id,
       ra.source_pulse_id, ra.escalation_id, ra.governance_review_id,
       ra.source_type, ra.source_id, ra.title, ra.description, ra.status,
       ra.completed_at, ra.effectiveness_reviewed_at, ra.effectiveness_evidence,
       COALESCE(NULLIF(TRIM(r.risk_domain), ''), NULLIF(TRIM(r.strategic_theme), ''),
                NULLIF(TRIM(sc.risk_domain), ''), NULLIF(TRIM(ra.governance_domain), ''),
                NULLIF(TRIM(gp.governance_domain), ''), NULLIF(TRIM((gp.risk_domain)[1]), ''),
                'Uncategorised') AS governance_domain,
       canonical_effectiveness_outcome(ra.effectiveness_outcome::text, ra.effectiveness::text)
         AS effectiveness_outcome,
       CASE WHEN canonical_effectiveness_outcome(ra.effectiveness_outcome::text, ra.effectiveness::text)
                  IN ('Effective','Partially Effective','Not Effective')
            THEN true ELSE false END AS effectiveness_final
FROM risk_actions ra
LEFT JOIN risks r ON r.id=ra.risk_id AND r.company_id=ra.company_id
LEFT JOIN signal_clusters sc ON sc.id=ra.source_cluster_id AND sc.company_id=ra.company_id
LEFT JOIN governance_pulses gp ON gp.id=ra.source_pulse_id AND gp.company_id=ra.company_id;

COMMIT;
