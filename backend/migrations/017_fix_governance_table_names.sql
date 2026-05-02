-- Migration 017: Fix Governance Table Names
-- Reconcile governance_pulse_answers and governance_answers.

-- 1. If governance_answers does not exist, rename governance_pulse_answers if it exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'governance_answers') THEN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'governance_pulse_answers') THEN
            ALTER TABLE governance_pulse_answers RENAME TO governance_answers;
        ELSE
            -- Create it if neither exists (should have been done in 007 but just in case)
            CREATE TABLE governance_answers (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                pulse_id UUID NOT NULL REFERENCES governance_pulses(id) ON DELETE CASCADE,
                question_id UUID NOT NULL REFERENCES governance_questions(id) ON DELETE RESTRICT,
                company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                answer TEXT,
                answer_value JSONB,
                flagged BOOLEAN DEFAULT FALSE,
                comment TEXT,
                answered_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(pulse_id, question_id)
            );
        END IF;
    END IF;
END $$;

-- 2. Ensure all columns exist in governance_answers
ALTER TABLE governance_answers ADD COLUMN IF NOT EXISTS answer_value JSONB;
ALTER TABLE governance_answers ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE governance_answers ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE governance_answers ADD COLUMN IF NOT EXISTS answered_by UUID REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE governance_answers ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Set answered_by if it was null (fallback to any user or leave null)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        UPDATE governance_answers
        SET answered_by = (SELECT id FROM users LIMIT 1)
        WHERE answered_by IS NULL;
    END IF;
END $$;

-- 4. Make answered_by nullable since we might not have a user
ALTER TABLE governance_answers ALTER COLUMN answered_by DROP NOT NULL;
