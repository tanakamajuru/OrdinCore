-- Migration 208: advance-reminder dedup columns for assigned actions.
-- Nov 2026 brief ("Task visibility, advance reminders and monitoring", §4): a staged reminder
-- schedule (7 days before, 2 days before) supplementing the existing on-allocation notification
-- and the existing overdue worker. One timestamp per milestone, set once it's sent, is enough to
-- deduplicate by action+milestone without a separate reminders table.
ALTER TABLE risk_actions
  ADD COLUMN IF NOT EXISTS reminder_7d_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_2d_sent_at TIMESTAMPTZ;
