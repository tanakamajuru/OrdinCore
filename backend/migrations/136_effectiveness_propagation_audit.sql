BEGIN;

ALTER TABLE intervention_oversight_events
  DROP CONSTRAINT IF EXISTS intervention_oversight_events_event_type_check;
ALTER TABLE intervention_oversight_events
  ADD CONSTRAINT intervention_oversight_events_event_type_check CHECK (event_type IN
    ('DIRECTOR_CHALLENGE','DIRECTOR_DIRECTION','RI_QUERY','RI_ASSURANCE_NOTE',
     'CLARIFICATION_RESPONSE','EFFECTIVENESS_REVIEWED'));

CREATE INDEX IF NOT EXISTS idx_interventions_company_linked_action
  ON interventions(company_id, linked_action_id) WHERE linked_action_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escalations_company_risk_source
  ON escalations(company_id, risk_id, source_cluster_id);

COMMIT;
