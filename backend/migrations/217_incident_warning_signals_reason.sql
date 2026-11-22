-- 22 Nov 2026 brief (Serious Incident workflow, Step 1): the "Were warning signals present"
-- question gets an explicit "Not known yet" option (migration 196's warning_signals column
-- already has yes/no/partial) plus a free-text reason -- without this column the reason the
-- reporter typed had nowhere to go and was silently dropped on submit.
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS warning_signals_reason TEXT;
