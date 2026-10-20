-- TL closed-signal fix (19 Oct 2026 developer corrections): retire active Monitor decisions that
-- were left dangling when their source signal was closed/linked through a path that predates the
-- retirement logic in governanceDecisions.service.ts (makeDecision always retires prior Monitor
-- rows now, but existing data from before that logic was added was never corrected).
UPDATE governance_reviews gr
   SET decision_status = 'Completed'
  FROM governance_pulses gp
 WHERE gr.pulse_entry_id = gp.id
   AND gr.decision = 'Monitor'
   AND gr.decision_status = 'Monitoring'
   AND gp.review_status IN ('Closed','Linked');
