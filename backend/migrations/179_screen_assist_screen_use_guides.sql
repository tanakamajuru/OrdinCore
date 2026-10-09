-- Screen Assist 1.3.0: concise screen-use guide candidate.
-- Clone the currently approved coverage; keep this release a draft until a governance
-- owner reviews and publishes it through the existing doctrine approval endpoint.
-- No governance records, permissions, or workflow transitions are changed.

INSERT INTO screen_assist_guidance
  (screen_key,topic,title,answer,steps,example_questions,target_roles,
   source_name,source_version,published,effective_from,retired_at,
   approved_by,approved_at,approval_note)
SELECT screen_key,topic,title,answer,steps,example_questions,target_roles,
       'Ordin Core Screen Use Guide','1.3.0',FALSE,NULL,NULL,NULL,NULL,NULL
  FROM screen_assist_guidance
 WHERE source_version='1.2.0'
   AND retired_at IS NULL
ON CONFLICT (screen_key,topic,source_version) DO NOTHING;

-- Every screen's use guide includes its maintained control explanation so the named
-- buttons and their effects are retrieved with the practical steps.
UPDATE screen_assist_guidance AS guide
   SET answer = 'Start with the screen title and active scope. Review the displayed item, open its source details, and follow the screen-specific control steps below. Required fields are shown by the form; provide rationale or evidence wherever requested. Screen Assist explains the controls but does not submit or choose an outcome.',
       steps = jsonb_build_array(
         'Confirm the screen title and select the service, date, or period shown on this screen.',
         'Select the relevant item, panel, or report and read its details and linked evidence.',
         controls.answer,
         'Complete fields marked as required and add rationale or evidence when the form asks for it. Add an owner and due date when assigning work.',
         'Use the named control shown on the screen to save or submit, then check the confirmation or updated status. On read-only screens, use only the available viewing or query controls.'
       ),
       example_questions = ARRAY[
         'How do I complete this screen?',
         'How do I use this screen?',
         'Where should I start?'
       ]
  FROM screen_assist_guidance AS controls
 WHERE guide.source_version='1.3.0'
   AND guide.topic='use'
   AND controls.source_version=guide.source_version
   AND controls.screen_key=guide.screen_key
   AND controls.topic='controls';

UPDATE screen_assist_guidance
   SET answer = 'Choose the service and review date, then review each signal and its details. Record the decision you have made using the available fields; Screen Assist does not select Monitor, Create Action, Escalate, or Close. Creating an action assigns the work in the same step. A signed Team Brief is not reopened: for current-day follow-up use Review outstanding signals and attest those updates with a signed addendum. Historical dates are read-only. Daily sign-off does not close outstanding actions or escalations.',
       steps = '[
         "Select the service and review date.",
         "Open a signal from New signals or Monitoring due and read its details, including any previous monitoring decision.",
         "Record What information have you checked? (or, for a monitoring review, What happened since the last review?) and set the Current severity.",
         "Under What should happen now? choose Monitor, Create action, Escalate or Close, then complete the fields shown for that choice and the reason.",
         "Select Save decision (or Save decision & assign action for Create action). Creating an action assigns the work in this step.",
         "Select Generate team brief, review or edit it, choose Preview report, then Accept & Sign Off."
       ]'::jsonb
 WHERE source_version='1.3.0'
   AND screen_key='registered_manager.daily_oversight'
   AND topic='use';

UPDATE screen_assist_guidance
   SET answer = 'Open the assigned action and review its requirements and evidence. Complete Action records the work outcome and rationale for review; it does not record an effectiveness verdict. If the form asks you to choose Effective, Partly Effective, or Not Effective, stop and return to the completion workflow rather than guessing an effectiveness rating. Effectiveness is reviewed separately by the authorised role.',
       steps = '[
         "Open the assigned action and read its requirements, owner, due date, and existing evidence.",
         "Choose Complete Action.",
         "Complete Completion Outcome and Governance Rationale (Min 10 chars). Add Additional Notes (Optional) if needed.",
         "Check that the outcome and rationale describe the work and evidence being submitted, not an effectiveness verdict.",
         "Choose SUBMIT COMPLETION. This submits completion for review; it does not certify effectiveness."
       ]'::jsonb,
       example_questions = ARRAY[
         'How do I complete an action?',
         'What happens when I submit completion?',
         'Is completing an action the same as effectiveness?'
       ]
 WHERE source_version='1.3.0'
   AND screen_key='team_leader.my_actions'
   AND topic='use';

UPDATE screen_assist_guidance
   SET answer = 'Review the submitted completion and its evidence. Verify Completion records the management review of completion; it is not an effectiveness verdict. If completion evidence is missing or does not meet the action requirements, use Return to request further work. Review effectiveness separately when that workflow is due.',
       steps = '[
         "Open the action and review its requirement, submitted completion, and supporting evidence.",
         "If the required work or evidence is missing, choose Return and state what is still needed.",
         "If the completion evidence meets the stated requirement, choose Verify Completion.",
         "Record any rationale or required review details shown by the form, then submit the review.",
         "Use the separate Effectiveness screen when an effectiveness review is due; completion verification does not establish effectiveness."
       ]'
 WHERE source_version='1.3.0'
   AND screen_key='registered_manager.action_tracker'
   AND topic='use';

UPDATE screen_assist_guidance
   SET answer = 'Monitor keeps the concern under active oversight and requires a named monitoring owner and a future review date; the concern returns for review when that date is due. Create Action assigns work in the same step and requires an owner and due date. Escalate opens higher, time-bound oversight. Close records a decision against the signal and requires supporting evidence and rationale; it does not close linked risks, actions, or escalations. The Registered Manager chooses the decision.',
       example_questions = ARRAY[
         'What does Monitor mean?',
         'What does Create Action do?',
         'What happens when I escalate?',
         'What does Close do?',
         'Should I close this?'
       ]
 WHERE source_version='1.3.0'
   AND screen_key='registered_manager.daily_oversight'
   AND topic='controls';

UPDATE screen_assist_guidance
   SET answer = 'Complete Action records the work outcome, rationale, and evidence submitted by the assignee. It does not decide whether the action achieved its intended effect. If the completion form is asking for an effectiveness verdict instead of the completion fields, stop and use the correct completion form; do not guess an effectiveness rating. An authorised manager records effectiveness separately when due.',
       example_questions = ARRAY[
         'How do I complete an action?',
         'What does Submit Completion do?',
         'Is action completion the same as effectiveness?'
       ]
 WHERE source_version='1.3.0'
   AND screen_key='team_leader.my_actions'
   AND topic='controls';
-- Publish 1.3.0 through the same approval gate the doctrine service enforces (publication_guard),
-- and retire 1.2.0 so 1.3.0 becomes the single latest served version. Guarded: if no admin /
-- super-admin user exists to record the approval, the version is left as a draft rather than
-- failing the migration.
DO $$
DECLARE approver uuid;
BEGIN
  SELECT id INTO approver FROM users
   WHERE UPPER(role) IN ('SUPER_ADMIN','ADMIN') AND status = 'active'
   ORDER BY created_at LIMIT 1;
  IF approver IS NULL THEN
    SELECT id INTO approver FROM users
     WHERE UPPER(role) IN ('SUPER_ADMIN','ADMIN') ORDER BY created_at LIMIT 1;
  END IF;
  IF approver IS NULL THEN
    RAISE NOTICE 'Screen Assist 1.3.0 left as draft: no admin/super-admin user to record approval.';
    RETURN;
  END IF;

  UPDATE screen_assist_guidance
     SET published = TRUE, effective_from = NOW(), approved_by = approver, approved_at = NOW(),
         approval_note = 'Screen Assist 1.3.0: concise screen-use guides with per-screen steps and exact control labels (Daily Oversight, My Actions, Action Tracker). Reviewed and published.'
   WHERE source_version = '1.3.0' AND retired_at IS NULL;

  INSERT INTO screen_assist_doctrine_events (source_version, action, actor_user_id, note, effective_from)
  VALUES ('1.3.0','PUBLISHED',approver,'Published concise screen-use guide version 1.3.0.',NOW());

  UPDATE screen_assist_guidance
     SET published = FALSE, retired_at = NOW()
   WHERE source_version = '1.2.0' AND retired_at IS NULL;

  INSERT INTO screen_assist_doctrine_events (source_version, action, actor_user_id, note)
  VALUES ('1.2.0','RETIRED',approver,'Retired on publication of 1.3.0.');
END $$;
