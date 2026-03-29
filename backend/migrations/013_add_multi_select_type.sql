-- Migration 013: Add multi_select to governance_questions check constraint
ALTER TABLE governance_questions DROP CONSTRAINT governance_questions_question_type_check;
ALTER TABLE governance_questions ADD CONSTRAINT governance_questions_question_type_check 
CHECK (question_type IN ('yes_no', 'scale', 'text', 'multiple_choice', 'multi_select'));
