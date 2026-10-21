-- RI Queries workflow (scoped and confirmed 21 Oct 2026): a Responsible Individual's "assurance
-- and challenge" duty includes raising a formal question to an RM/Director and tracking it to a
-- real answer — not an opinion left in a chat, but a governance record with its own lifecycle.
-- This did not exist anywhere in the system (no table, no endpoint) before this migration; the RI
-- mobile "Queries" tab was deliberately left out of the earlier nav corrections until this existed.

DO $$ BEGIN
  CREATE TYPE query_status AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Polymorphic context, same pattern as governance_reviews/escalations (one of risk/escalation/
-- action/pattern/signal/weekly_review id, or none for a general query), so a query can be raised
-- in the context of the specific record the RI is challenging without a rigid foreign key per type.
CREATE TABLE IF NOT EXISTS governance_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  house_id UUID REFERENCES houses(id),
  context_type TEXT,
  context_id UUID,
  subject TEXT NOT NULL,
  raised_by UUID NOT NULL REFERENCES users(id),
  raised_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_to UUID REFERENCES users(id),
  status query_status NOT NULL DEFAULT 'OPEN',
  response_text TEXT,
  responded_by UUID REFERENCES users(id),
  responded_at TIMESTAMPTZ,
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMPTZ,
  close_reason TEXT,
  reopen_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_queries_company_status ON governance_queries(company_id, status);
CREATE INDEX IF NOT EXISTS idx_governance_queries_assigned ON governance_queries(assigned_to) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_governance_queries_raised_by ON governance_queries(raised_by) WHERE status = 'ANSWERED';
