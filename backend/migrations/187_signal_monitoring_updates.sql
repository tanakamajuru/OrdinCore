-- Signal Monitoring correction (16 Oct 2026 field report): the "Record Monitoring Update" item
-- in a Team Leader's My Work had no actual place to record anything — there was no storage and no
-- endpoint. This closes the loop the doctrine describes: TL records a factual update on the
-- monitored signal; it is appended to that signal's monitoring history; an urgent flag surfaces
-- the RM immediately (mirrors escalations.metadata.rm_attention from the Escalation Monitoring
-- correction, 14 Oct 2026) instead of waiting for the scheduled review point.

CREATE TABLE IF NOT EXISTS signal_monitoring_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  governance_review_id uuid NOT NULL REFERENCES governance_reviews(id),
  pulse_entry_id uuid NOT NULL REFERENCES governance_pulses(id),
  author_id uuid NOT NULL REFERENCES users(id),
  note text NOT NULL,
  urgent boolean NOT NULL DEFAULT false,
  urgent_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signal_monitoring_updates_review
  ON signal_monitoring_updates(governance_review_id, created_at);
CREATE INDEX IF NOT EXISTS idx_signal_monitoring_updates_pulse
  ON signal_monitoring_updates(pulse_entry_id, created_at);

-- Urgent-attention flag on the active monitoring decision, read the same way
-- escalations.metadata->>'rm_attention' is: surfaces the RM immediately, before due_at.
ALTER TABLE governance_reviews
  ADD COLUMN IF NOT EXISTS rm_attention boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rm_attention_at timestamptz;
