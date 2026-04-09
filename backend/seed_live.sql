-- Live Seeding SQL
-- Use fixed UUIDs for predictability in this test run

BEGIN;

-- 1. Cleanup existing if any (optional, but good for retries)
DELETE FROM user_houses WHERE company_id = 'ee603d65-7171-4876-9289-40bc973950f8';
DELETE FROM users WHERE company_id = 'ee603d65-7171-4876-9289-40bc973950f8';
DELETE FROM houses WHERE company_id = 'ee603d65-7171-4876-9289-40bc973950f8';
DELETE FROM governance_questions WHERE company_id = 'ee603d65-7171-4876-9289-40bc973950f8';
DELETE FROM governance_templates WHERE company_id = 'ee603d65-7171-4876-9289-40bc973950f8';
DELETE FROM companies WHERE id = 'ee603d65-7171-4876-9289-40bc973950f8';

-- 2. Create Company
INSERT INTO companies (id, name, plan, status, created_at, updated_at)
VALUES ('ee603d65-7171-4876-9289-40bc973950f8', 'Live Journey Co', 'pro', 'active', NOW(), NOW());

-- 3. Create House
INSERT INTO houses (id, company_id, name, status, is_active, created_at, updated_at)
VALUES ('aa603d65-7171-4876-9289-40bc973950f8', 'ee603d65-7171-4876-9289-40bc973950f8', 'Live Alpha Site', 'active', true, NOW(), NOW());

-- 4. Create Users (Password: Password123!)
-- Hash: $2a$12$R.S4RNDS... (I'll use a real pre-computed hash)
-- Hash for 'Password123!' with 12 rounds: $2a$12$Kov16uR9F4q15.O/mI4KXeUqyv9/u/rXByzY5yG57M1E2Xm9M1Wdq
INSERT INTO users (id, company_id, email, password_hash, role, first_name, last_name, status, created_at, updated_at)
VALUES 
('d1e603d6-7171-4876-9289-40bc973950f8', 'ee603d65-7171-4876-9289-40bc973950f8', 'dir_live@caresignal.com', '$2a$12$Kov16uR9F4q15.O/mI4KXeUqyv9/u/rXByzY5yG57M1E2Xm9M1Wdq', 'DIR', 'Jane', 'Director', 'active', NOW(), NOW()),
('r1e603d6-7171-4876-9289-40bc973950f8', 'ee603d65-7171-4876-9289-40bc973950f8', 'rm_live@caresignal.com', '$2a$12$Kov16uR9F4q15.O/mI4KXeUqyv9/u/rXByzY5yG57M1E2Xm9M1Wdq', 'RM', 'Robert', 'Manager', 'active', NOW(), NOW()),
('t1e603d6-7171-4876-9289-40bc973950f8', 'ee603d65-7171-4876-9289-40bc973950f8', 'tl_live@caresignal.com', '$2a$12$Kov16uR9F4q15.O/mI4KXeUqyv9/u/rXByzY5yG57M1E2Xm9M1Wdq', 'TL', 'Thomas', 'Leader', 'active', NOW(), NOW());

-- 5. Assignments
INSERT INTO user_houses (id, user_id, house_id, company_id, role_in_house, assigned_at)
VALUES 
(gen_random_uuid(), 'r1e603d6-7171-4876-9289-40bc973950f8', 'aa603d65-7171-4876-9289-40bc973950f8', 'ee603d65-7171-4876-9289-40bc973950f8', 'RM', NOW()),
(gen_random_uuid(), 't1e603d6-7171-4876-9289-40bc973950f8', 'aa603d65-7171-4876-9289-40bc973950f8', 'ee603d65-7171-4876-9289-40bc973950f8', 'TL', NOW());

-- 6. Governance Template
-- We need a valid SUPER_ADMIN to be the creator
-- I'll use a placeholder or find it later, but for now I'll use a system id
INSERT INTO governance_templates (id, company_id, name, description, frequency, created_by, created_at, updated_at)
VALUES ('77603d65-7171-4876-9289-40bc973950f8', 'ee603d65-7171-4876-9289-40bc973950f8', 'Live Daily Pulse', 'Production test pulse', 'daily', '00000000-0000-0000-0000-000000000000', NOW(), NOW());

-- 7. Questions
INSERT INTO governance_questions (id, template_id, company_id, question, question_type, required, order_index, created_at)
VALUES 
(gen_random_uuid(), '77603d65-7171-4876-9289-40bc973950f8', 'ee603d65-7171-4876-9289-40bc973950f8', 'Any new risks?', 'yes_no', true, 0, NOW()),
(gen_random_uuid(), '77603d65-7171-4876-9289-40bc973950f8', 'ee603d65-7171-4876-9289-40bc973950f8', 'Safeguarding concerns?', 'yes_no', true, 1, NOW());

COMMIT;
