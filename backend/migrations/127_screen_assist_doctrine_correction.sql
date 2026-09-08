-- Corrective Screen Assist doctrine release.
-- Forward-compatible for databases where migrations 125/126 have already run.
-- This is additive to the frozen governance architecture and changes no case record.

ALTER TABLE screen_assist_guidance
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_note TEXT;

CREATE TABLE IF NOT EXISTS screen_assist_doctrine_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_version TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('PUBLISHED','RETIRED')),
  actor_user_id UUID NOT NULL REFERENCES users(id),
  note TEXT NOT NULL,
  effective_from TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screen_assist_doctrine_events_version
  ON screen_assist_doctrine_events (source_version, created_at DESC);

-- Earlier seeds were made visible without an approval record. Withdraw them and
-- preserve them as retired evidence; do not rewrite what may already have been served.
UPDATE screen_assist_guidance
   SET published=FALSE,
       effective_from=NULL,
       retired_at=COALESCE(retired_at, NOW())
 WHERE source_version IN ('1.0.0','1.1.0')
   AND approved_at IS NULL;

-- Create the corrected, complete doctrine as a new draft version. Cloning preserves
-- earlier wording except for the specific authority corrections below.
INSERT INTO screen_assist_guidance
  (screen_key,topic,title,answer,steps,example_questions,target_roles,
   source_name,source_version,published,effective_from,retired_at,
   approved_by,approved_at,approval_note)
SELECT screen_key,topic,title,
  CASE
    WHEN screen_key='director.effectiveness' AND topic='purpose' THEN
      'This screen gives the Director oversight of whether completed governance work achieved its intended organisation-level outcome. The Registered Manager retains the operational effectiveness decision.'
    WHEN screen_key='director.effectiveness' AND topic IN ('use','controls') THEN
      'Review the Registered Manager’s effectiveness conclusion and supporting evidence. Where assurance is insufficient, request clarification or initiate an authorised organisation-level intervention. Screen Assist cannot make or replace the operational effectiveness decision.'
    WHEN screen_key='director.risks' AND topic='purpose' THEN
      'This screen provides Director oversight of organisation-level risks, controls, owners, review dates, trajectory and leadership conclusions.'
    WHEN screen_key='director.risks' AND topic='controls' THEN
      'Open shows evidence and history. The Director may record an organisation-level control assessment or trajectory conclusion where those controls are displayed. Each requires evidence and rationale and does not replace the Registered Manager’s daily decision. Screen Assist cannot select a conclusion.'
    WHEN screen_key LIKE '%.reports' AND topic='purpose' THEN
      'This screen provides reports from the frozen Ordin Core catalogue. Screen Assist can explain each report’s intended purpose but cannot select a report for a live case or create missing evidence.'
    ELSE answer
  END,
  steps,example_questions,target_roles,source_name,'1.2.0',FALSE,NULL,NULL,NULL,NULL,NULL
  FROM screen_assist_guidance
 WHERE source_version='1.1.0'
ON CONFLICT (screen_key,topic,source_version) DO NOTHING;

-- RI routes present in navigation but absent from v1.1.0 receive full draft coverage.
WITH screens(screen_key,screen_title,purpose_text,controls_text) AS (
  VALUES
  ('responsible_individual.incidents','Serious Incident Assurance',
   'This screen gives the Responsible Individual independent visibility of serious-incident governance, escalation, follow-up and recorded learning.',
   'Open Evidence displays the governance trail. Acknowledge records that the incident was seen; it does not approve the operational response. The RI does not investigate clinically, manage the incident or replace operational ownership while acting as RI.'),
  ('responsible_individual.trends','Governance Trends',
   'This screen presents recorded movement across services and governance themes for independent assurance.',
   'Filters change the evidence view. Open Evidence shows contributing records. Trends are descriptive, not predictive; the RI may challenge leadership conclusions but does not determine operational action.')
), topics(topic,title_prefix,answer_text,steps_json,examples) AS (
  VALUES
  ('purpose','About',NULL,'[]'::jsonb,ARRAY['What is this screen?','What does this page show?']),
  ('role','RI role','Use this screen for independent assurance and challenge. While acting as Responsible Individual, review evidence and raise queries but do not perform operational governance actions.','[]'::jsonb,ARRAY['What is my role here?','What am I responsible for?']),
  ('use','How to use','Set the authorised scope, review the displayed information, open the source evidence and use only the read-only assurance functions permitted to the RI role.','["Confirm the active RI role.","Set the authorised scope.","Open and verify source evidence.","Record only an assurance acknowledgement or query where provided."]'::jsonb,ARRAY['How do I use this screen?','Where should I start?']),
  ('controls','Controls',NULL,'[]'::jsonb,ARRAY['Explain the controls','What does this button do?','How do the filters work?']),
  ('next','What happens next','The evidence remains in its existing governance workflow. An RI query requests a response but does not transfer operational ownership or close the underlying concern.','[]'::jsonb,ARRAY['What happens next?','Where does this information go?'])
)
INSERT INTO screen_assist_guidance
  (screen_key,topic,title,answer,steps,example_questions,target_roles,
   source_name,source_version,published,effective_from)
SELECT s.screen_key,t.topic,t.title_prefix || ' — ' || s.screen_title,
       COALESCE(t.answer_text,CASE t.topic WHEN 'purpose' THEN s.purpose_text ELSE s.controls_text END),
       t.steps_json,t.examples,ARRAY['RESPONSIBLE_INDIVIDUAL'],
       'Ordin Core Controlled Screen Doctrine','1.2.0',FALSE,NULL
  FROM screens s CROSS JOIN topics t
ON CONFLICT (screen_key,topic,source_version) DO NOTHING;

ALTER TABLE screen_assist_guidance
  DROP CONSTRAINT IF EXISTS screen_assist_guidance_publication_guard;
ALTER TABLE screen_assist_guidance
  ADD CONSTRAINT screen_assist_guidance_publication_guard CHECK (
    NOT published OR (
      approved_by IS NOT NULL AND approved_at IS NOT NULL
      AND approval_note IS NOT NULL AND length(trim(approval_note)) >= 20
      AND effective_from IS NOT NULL AND retired_at IS NULL
    )
  );

ALTER TABLE screen_assist_guidance
  DROP CONSTRAINT IF EXISTS screen_assist_guidance_semver_guard;
ALTER TABLE screen_assist_guidance
  ADD CONSTRAINT screen_assist_guidance_semver_guard
  CHECK (source_version ~ '^[0-9]+[.][0-9]+[.][0-9]+$');
