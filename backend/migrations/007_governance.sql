-- Migration 007: Governance System
CREATE TABLE governance_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  frequency VARCHAR(50) DEFAULT 'monthly' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_governance_templates_company_id ON governance_templates(company_id);

CREATE TABLE governance_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES governance_templates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'yes_no' CHECK (question_type IN ('yes_no', 'scale', 'text', 'multiple_choice')),
  options JSONB DEFAULT '[]',
  required BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_governance_questions_template_id ON governance_questions(template_id);

CREATE TABLE governance_pulses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES governance_templates(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'skipped')),
  due_date TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  compliance_score NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_governance_pulses_company_id ON governance_pulses(company_id);
CREATE INDEX idx_governance_pulses_house_id ON governance_pulses(house_id);
CREATE INDEX idx_governance_pulses_status ON governance_pulses(status);
CREATE INDEX idx_governance_pulses_due_date ON governance_pulses(due_date);

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

CREATE INDEX idx_governance_answers_pulse_id ON governance_answers(pulse_id);
