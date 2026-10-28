-- 27 Oct developer review, "Learning assessment / Improvement plan" section: "record the
-- specific change, owner, deadline, linked existing action, success criteria, review owner and
-- review date. Require this when change is needed." owner_id/review_date already exist (reused
-- here for the plan's review owner/date, previously captured only for deferred NOT_YET_ASSESSED
-- assessments); success_criteria and plan_deadline are new.
ALTER TABLE learning_records
  ADD COLUMN IF NOT EXISTS success_criteria text,
  ADD COLUMN IF NOT EXISTS plan_deadline date;
