-- Migration 016: Ensure System Standard Pulse Template
-- This seeds a permanent template and questions with fixed UUIDs to satisfy hardcoded UI requirements.

-- 1. Make company_id nullable in governance_templates
ALTER TABLE governance_templates ALTER COLUMN company_id DROP NOT NULL;

-- 2. Create the System Standard Pulse Template (Shared across all companies)
INSERT INTO governance_templates (id, company_id, name, description, frequency, is_active, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  NULL, 
  'System Standard Pulse', 
  'Hardcoded system-wide governance pulse template', 
  'daily', 
  true, 
  (SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1)
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = true;

-- 2. Create the 5 Hardcoded Questions
-- Emerging Risk Signals
INSERT INTO governance_questions (id, template_id, company_id, question, question_type, options, required, order_index)
VALUES (
  '00000000-0000-0000-0000-000000000011', 
  '00000000-0000-0000-0000-000000000001', 
  NULL, 
  'Have any new risks emerged since the last pulse?', 
  'yes_no', 
  '[]', 
  true, 
  0
)
ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question;

-- Risk Movement
INSERT INTO governance_questions (id, template_id, company_id, question, question_type, options, required, order_index)
VALUES (
  '00000000-0000-0000-0000-000000000012', 
  '00000000-0000-0000-0000-000000000001', 
  NULL, 
  'Are any existing risks increasing or deteriorating?', 
  'yes_no', 
  '[]', 
  true, 
  1
)
ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question;

-- Safeguarding Signals
INSERT INTO governance_questions (id, template_id, company_id, question, question_type, options, required, order_index)
VALUES (
  '00000000-0000-0000-0000-000000000013', 
  '00000000-0000-0000-0000-000000000001', 
  NULL, 
  'Any safeguarding concerns or indicators this week?', 
  'yes_no', 
  '[]', 
  true, 
  2
)
ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question;

-- Operational Pressure
INSERT INTO governance_questions (id, template_id, company_id, question, question_type, options, required, order_index)
VALUES (
  '00000000-0000-0000-0000-000000000014', 
  '00000000-0000-0000-0000-000000000001', 
  NULL, 
  'Any operational pressures affecting service stability?', 
  'multiple_choice', 
  '["Staffing pressure", "Behavioural support challenges", "Medication concerns", "Environmental issue", "None"]', 
  true, 
  3
)
ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question, options = EXCLUDED.options;

-- Escalation Required
INSERT INTO governance_questions (id, template_id, company_id, question, question_type, options, required, order_index)
VALUES (
  '00000000-0000-0000-0000-000000000015', 
  '00000000-0000-0000-0000-000000000001', 
  NULL, 
  'Does anything require leadership attention?', 
  'yes_no', 
  '[]', 
  true, 
  4
)
ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question;
