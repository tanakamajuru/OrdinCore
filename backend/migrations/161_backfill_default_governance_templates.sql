-- 161: Backfill the default governance template + questions for every company that has none.
--
-- The seed in company.service used a hardcoded created_by super-admin id that no longer
-- exists, so the FK on governance_templates rejected every insert (silently) and NO company
-- ever received its default template (fixed forward in #107). This backfills the existing
-- providers so their Governance Pulse / Risk Promotion flows work. Idempotent: only companies
-- with zero templates get one, and each question is guarded against duplicates.

DO $$
DECLARE
  c            RECORD;
  v_template   uuid;
  v_admin      uuid;
BEGIN
  SELECT id INTO v_admin FROM users WHERE role = 'SUPER_ADMIN' ORDER BY created_at LIMIT 1;

  FOR c IN
    SELECT co.id
      FROM companies co
     WHERE NOT EXISTS (SELECT 1 FROM governance_templates gt WHERE gt.company_id = co.id)
  LOOP
    v_template := uuid_generate_v4();

    INSERT INTO governance_templates (id, company_id, name, description, frequency, created_by, created_at, updated_at)
    VALUES (v_template, c.id, 'Standard Governance Pulse', 'Standard daily governance and risk check', 'daily', v_admin, NOW(), NOW());

    INSERT INTO governance_questions (id, template_id, company_id, question, question_type, required, order_index, created_at)
    SELECT uuid_generate_v4(), v_template, c.id, q.question, q.qtype, TRUE, q.ord, NOW()
      FROM (VALUES
        ('Have any new risks emerged since the last pulse?',       'yes_no',          0),
        ('Are any existing risks increasing or deteriorating?',    'yes_no',          1),
        ('Any safeguarding concerns or indicators this week?',     'yes_no',          2),
        ('Any operational pressures affecting service stability?', 'multiple_choice', 3),
        ('Does anything require leadership attention?',            'yes_no',          4)
      ) AS q(question, qtype, ord);
  END LOOP;
END $$;
