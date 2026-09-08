-- Controlled Screen Assist: additive, read-only guidance layer.
-- It does not alter any frozen governance table, status, route or workflow.

CREATE TABLE IF NOT EXISTS screen_assist_guidance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_key TEXT NOT NULL,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  answer TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  example_questions TEXT[] NOT NULL DEFAULT '{}',
  target_roles TEXT[] NOT NULL,
  source_name TEXT NOT NULL DEFAULT 'Ordin Core Governance Doctrine',
  source_version TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  effective_from TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (screen_key, topic, source_version)
);

CREATE INDEX IF NOT EXISTS idx_screen_assist_guidance_lookup
  ON screen_assist_guidance (screen_key, published, effective_from)
  WHERE retired_at IS NULL;

CREATE TABLE IF NOT EXISTS screen_assist_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  active_role TEXT NOT NULL,
  screen_key TEXT NOT NULL,
  question_hash CHAR(64) NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('ALLOWED','PROHIBITED','UNSUPPORTED','INVALID')),
  guidance_id UUID REFERENCES screen_assist_guidance(id),
  source_version TEXT,
  response_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screen_assist_audit_tenant_time
  ON screen_assist_audit_events (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screen_assist_audit_user_time
  ON screen_assist_audit_events (user_id, created_at DESC);

-- Seed platform-owned Director doctrine candidates. They remain unavailable until
-- a SUPER_ADMIN records formal governance-owner approval through the doctrine API;
-- customer records and person narratives are never included in this knowledge set.
INSERT INTO screen_assist_guidance
  (screen_key, topic, title, answer, steps, example_questions, target_roles, source_version, published, effective_from)
VALUES
('director.dashboard','purpose','Strategic Dashboard','This is the Director organisation-level oversight screen. It shows strategic risks, escalations, overdue reviews, action effectiveness and services requiring attention. It does not replace Registered Manager daily oversight.','[]',ARRAY['What is this screen?','What does the dashboard show?'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.dashboard','role','Director role','Use this screen to identify where organisation-level attention or assurance is required. Review the linked evidence before recording any leadership conclusion.','[]',ARRAY['What is my role here?','What should the Director do?'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.dashboard','use','How to use the Strategic Dashboard','Open the panels requiring attention and follow them to their source records. Review risk movement, escalation deadlines, overdue work and effectiveness evidence before deciding whether wider oversight is required.','["Review the organisation-level indicators.","Open the linked source evidence.","Check ownership, deadlines and earlier decisions.","Record only an authorised Director-level conclusion."]',ARRAY['How do I use this screen?','Where should I start?'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.dashboard','controls','Dashboard controls','Download Reports opens the approved report catalogue. Selecting a heat-map cell or service opens the relevant underlying register where implemented. Screen Assist can explain these controls but cannot activate them or change a record.','[]',ARRAY['How does Download Reports work?','What does the heat map do?','Explain the cards'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.dashboard','next','What happens next','The Director may request assurance, monitor organisation-level follow-up, commission a permitted action or move a substantiated wider concern into strategic risk oversight. The authorised user makes and records that decision.','[]',ARRAY['What happens next?','Where does this information go?'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.patterns','purpose','Systemic Patterns','This screen shows repeated themes supported by linked signals within or across services. A proposed pattern is a prompt for human review, not proof of systemic failure.','[]',ARRAY['What is a systemic pattern?','Why is this pattern here?'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.patterns','use','How to review patterns','Review every contributing signal, service, date, earlier decision and recurrence link. Record the evidence supporting monitoring, wider action, escalation or closure. Age alone is not a reason to close a stable but unresolved pattern.','["Open the contributing evidence.","Check the recurrence and cross-site scope.","Record the Director rationale.","Select only an action permitted by the frozen workflow."]',ARRAY['How do I review a pattern?','Can I close an old stable pattern?'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.risks','purpose','Oversight Register','This screen holds organisation-level governance risks and their supporting evidence, ownership, controls, review dates, trajectory and leadership conclusions.','[]',ARRAY['What is this register?','Why is a risk shown here?'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.risks','controls','Risk controls','Open displays the linked evidence and history. Review Controls records a human assessment of the documented controls. Update Trajectory requires evidence and a rationale; Screen Assist never chooses the trajectory.','[]',ARRAY['What does trajectory mean?','How do I review controls?'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.effectiveness','purpose','Action Effectiveness','This screen separates task completion from evidence that the intended governance outcome was achieved. Completion alone is not assurance.','[]',ARRAY['What is effectiveness?','Why is a completed action here?'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.effectiveness','use','How to review effectiveness','Review the Registered Manager’s effectiveness conclusion and its supporting evidence. Where assurance is insufficient, request clarification or initiate an authorised organisation-level intervention. Screen Assist cannot make or replace the operational effectiveness decision.','["Open the source action.","Review the intended outcome and evidence.","Check whether the concern repeated.","Record only an authorised oversight response."]',ARRAY['How do I review effectiveness?','What happens if assurance is insufficient?'],ARRAY['DIRECTOR'],'1.0.0',FALSE,NULL),
('director.interventions','purpose','Intervention Action','This screen records organisation-level interventions responding to supported patterns or control failures. It keeps the intervention linked to the evidence, owner, review point and intended outcome.','[]',ARRAY['What is an intervention?','How is this different from an action?'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.rollup','purpose','Service Review Roll-up','This is a read-only organisation-level consolidation of published service reviews. It supports leadership interpretation but does not rewrite the Registered Managers’ source reviews.','[]',ARRAY['What is the roll-up?','Can I edit a service review here?'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.escalations','purpose','Escalations','This screen shows concerns under time-bound higher oversight, including their source, owner, deadline, response and outcome.','[]',ARRAY['What is this screen?','Why is an escalation overdue?'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.escalations','controls','Escalation controls','Open shows the source and governance history. Escalate Further follows the accountability ladder and requires a recorded reason. Close requires the applicable review and evidence; Screen Assist cannot perform either action.','[]',ARRAY['How does escalate further work?','How is an escalation closed?'],ARRAY['DIRECTOR'],'1.0.0',TRUE,NOW()),
('director.reports','purpose','Reports','This screen provides governance and assurance reports from the frozen report catalogue. Screen Assist can explain each report’s intended purpose but cannot select one for a live case. Report output reflects recorded evidence; it does not create new clinical conclusions.','[]',ARRAY['What does each report contain?','What is this screen?'],ARRAY['DIRECTOR'],'1.0.0',FALSE,NULL)
ON CONFLICT (screen_key, topic, source_version) DO NOTHING;

-- Fresh installations must not treat seeded wording as governance-approved.
UPDATE screen_assist_guidance
   SET published=FALSE, effective_from=NULL
 WHERE source_version='1.0.0'
   AND source_name='Ordin Core Governance Doctrine';

-- Complete baseline coverage for every Director route currently exposed by
-- RoleBasedNavigation. More specific rows above win through the unique key.
WITH screens(screen_key, screen_title, purpose_text, controls_text) AS (
  VALUES
  ('director.dashboard','Strategic Dashboard','This screen provides organisation-level oversight of risks, escalations, actions, effectiveness and services needing attention.','Open panels navigate to their source register. Filters change only the displayed scope. Download Reports opens the frozen report catalogue.'),
  ('director.patterns','Systemic Patterns','This screen presents evidence-linked recurring themes for authorised human review.','View Evidence opens contributing signals. Review records a rationale. Promote follows the existing strategic-risk workflow and remains a human decision.'),
  ('director.risks','Oversight Register','This screen provides Director oversight of organisation-level risks, controls, owners, review dates, trajectory and conclusions.','Open shows history. The Director may record an organisation-level control assessment or trajectory conclusion where those controls are displayed. Each requires evidence and rationale and does not replace the Registered Manager’s daily decision. The assistant cannot select a conclusion.'),
  ('director.effectiveness','Effectiveness','This screen gives the Director oversight of whether completed governance work achieved its intended outcome.','View Evidence opens the source action and the Registered Manager’s effectiveness conclusion. The Director may challenge insufficient assurance or initiate an authorised organisation-level intervention, but cannot replace the operational effectiveness decision.'),
  ('director.interventions','Intervention Action','This screen manages organisation-level interventions linked to patterns or control failures.','Open Evidence shows the source. Create or update intervention uses the existing intervention workflow, owner, review date and intended outcome.'),
  ('director.rollup','Service Review Roll-up','This screen consolidates published service reviews without changing their source records.','Service and period filters change the view. Open Review displays the signed source. The roll-up itself is read-only.'),
  ('director.reconstruction','Governance Reconstruction','This screen reconstructs the recorded governance sequence for an authorised scope and period.','Scope and date filters define the reconstruction. Generate assembles existing records; it does not create missing events or clinical conclusions.'),
  ('director.escalations','Escalations','This screen tracks concerns under higher, time-bound oversight.','Open shows source and history. Escalate Further requires a reason. Closure requires the existing review and evidence gates.'),
  ('director.actions','Action Tracker','This screen provides Director oversight of governance actions, ownership, due dates, status and evidence.','Filters narrow the register. Open shows the linked source. Review Evidence does not itself mark the action effective.'),
  ('director.trends','Governance Trends','This screen describes recorded movement across services and governance themes.','Filters change period, service or theme. Open Evidence shows contributing records. Trend displays are descriptive and do not predict harm.'),
  ('director.incidents','Serious Incidents','This screen provides authorised oversight of serious-incident governance records and follow-up.','Open displays the incident governance record. Linked actions and escalation controls follow their existing workflows; Screen Assist cannot assess the incident clinically.'),
  ('director.reports','Reports','This screen provides the frozen catalogue of approved governance and assurance reports.','Select Report chooses a defined report. Scope and period control the included evidence. Generate creates the report from records and does not add new conclusions.')
), topics(topic, title_prefix, template) AS (
  VALUES
  ('purpose','About','PURPOSE'),
  ('role','Director role','Use this screen for organisation-level oversight within Director permissions. Review source evidence and leave operational or independent-assurance decisions with the roles assigned by the frozen architecture.'),
  ('use','How to use','Set the permitted scope, review the displayed governance information, open the source evidence, and record only the conclusion or follow-up authorised for the Director on this screen.'),
  ('controls','Controls','CONTROLS'),
  ('next','What happens next','Any permitted follow-up continues through the existing Ordin Core workflow. Screen Assist remains read-only and cannot submit, approve, close, escalate or alter a governance record.')
)
INSERT INTO screen_assist_guidance
  (screen_key, topic, title, answer, steps, example_questions, target_roles, source_version, published, effective_from)
SELECT s.screen_key, t.topic, t.title_prefix || ' — ' || s.screen_title,
       CASE t.template WHEN 'PURPOSE' THEN s.purpose_text WHEN 'CONTROLS' THEN s.controls_text ELSE t.template END,
       CASE t.topic WHEN 'use' THEN '["Set the authorised screen scope.","Review the displayed information.","Open and verify the source evidence.","Record only a permitted Director-level conclusion."]'::jsonb ELSE '[]'::jsonb END,
       CASE t.topic
         WHEN 'purpose' THEN ARRAY['What is this screen?','What does this page show?']
         WHEN 'role' THEN ARRAY['What is my role here?','What is the Director responsible for?']
         WHEN 'use' THEN ARRAY['How do I use this screen?','Where do I start?']
         WHEN 'controls' THEN ARRAY['Explain the controls','What does this button do?','How do the filters work?']
         ELSE ARRAY['What happens next?','Where does this go?']
       END,
       ARRAY['DIRECTOR'], '1.0.0', FALSE, NULL
  FROM screens s CROSS JOIN topics t
ON CONFLICT (screen_key, topic, source_version) DO NOTHING;
