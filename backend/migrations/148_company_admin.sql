-- Company Admin ("Organisation Administration") workspace.
-- Adds an editable per-company security policy and a real access-review queue.
-- Recent admin activity reuses audit_logs; failed logins are recorded there too.
BEGIN;

-- One editable security policy per company (tenant-isolated).
CREATE TABLE IF NOT EXISTS company_security_settings (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  mfa_required BOOLEAN NOT NULL DEFAULT TRUE,
  session_timeout_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (session_timeout_minutes BETWEEN 5 AND 480),
  exports_restricted BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed a default policy for every existing company.
INSERT INTO company_security_settings (company_id)
SELECT id FROM companies
ON CONFLICT (company_id) DO NOTHING;

-- Access reviews: each active account should have its access confirmed periodically.
CREATE TABLE IF NOT EXISTS access_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subject_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'Periodic access review is due.',
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','COMPLETED')),
  due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  note TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_access_review
  ON access_reviews(company_id, subject_user_id) WHERE status='OPEN';
CREATE INDEX IF NOT EXISTS idx_access_reviews_company_status
  ON access_reviews(company_id, status, due_at);

-- Enqueue a review for every active account whose access has not been reviewed in the
-- last 90 days (never reviewed, or last review completed > 90 days ago). Idempotent.
CREATE OR REPLACE FUNCTION sync_due_access_reviews(target_company UUID DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE inserted_count INTEGER;
BEGIN
  INSERT INTO access_reviews (company_id, subject_user_id, reason, due_at)
  SELECT u.company_id, u.id, 'Periodic access review is due.', NOW()
    FROM users u
   WHERE (target_company IS NULL OR u.company_id = target_company)
     AND LOWER(COALESCE(u.status,'active')) = 'active'
     AND NOT EXISTS (
       SELECT 1 FROM access_reviews ar
        WHERE ar.company_id = u.company_id AND ar.subject_user_id = u.id AND ar.status = 'OPEN'
     )
     AND NOT EXISTS (
       SELECT 1 FROM access_reviews ar2
        WHERE ar2.company_id = u.company_id AND ar2.subject_user_id = u.id
          AND ar2.status = 'COMPLETED' AND ar2.completed_at > NOW() - INTERVAL '90 days'
     )
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END $$;

SELECT sync_due_access_reviews(NULL);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs(company_id, created_at DESC);

COMMIT;
