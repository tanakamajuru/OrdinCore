-- Ordin Core Stage 12: canonical evidence & assurance hardening.
-- Read/provenance hardening only. No frozen lifecycle or decision semantics change.
BEGIN;

CREATE OR REPLACE VIEW canonical_material_count_v AS
SELECT company_id, 'RISK_REVIEW'::text AS count_type, id::text AS evidence_id, house_id,
       review_due_at AS due_at
  FROM canonical_risk_state_v WHERE needs_review
UNION ALL
SELECT company_id, 'ACTION_OPEN', id::text, house_id, due_date
  FROM canonical_action_state_v WHERE is_open
UNION ALL
SELECT company_id, 'EFFECTIVENESS_REVIEW', id::text, house_id, NULL::timestamptz
  FROM canonical_action_state_v WHERE requires_effectiveness_review
UNION ALL
SELECT company_id, 'ESCALATION_OPEN', id::text, house_id, due_by
  FROM canonical_escalation_state_v WHERE is_open
UNION ALL
SELECT company_id, 'PATTERN_REVIEW', id::text, house_id, NULL::timestamptz
  FROM canonical_pattern_state_v WHERE is_active;

COMMENT ON VIEW canonical_material_count_v IS
'Every material current-state count is evidence-addressable. Consumers count rows; evidence_id is the exact record behind the count.';

CREATE OR REPLACE VIEW canonical_derived_state_provenance_v AS
SELECT r.company_id, 'RISK'::text AS subject_type, r.id AS subject_id,
       'risk_status'::text AS derived_field, r.canonical_status::text AS derived_value,
       NOW() AS calculated_at, 'canonical_risk_state_v'::text AS calculation_source
  FROM canonical_risk_state_v r
UNION ALL
SELECT a.company_id, 'ACTION', a.id, 'action_status', a.canonical_status::text, NOW(), 'canonical_action_state_v'
  FROM canonical_action_state_v a
UNION ALL
SELECT e.company_id, 'ESCALATION', e.id, 'escalation_status', e.canonical_status::text, NOW(), 'canonical_escalation_state_v'
  FROM canonical_escalation_state_v e;

COMMENT ON VIEW canonical_derived_state_provenance_v IS
'Machine-readable provenance for material derived lifecycle positions. AI may narrate these facts but must not recalculate them.';

COMMIT;
