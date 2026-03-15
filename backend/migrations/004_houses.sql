-- Migration 004: Houses
CREATE TABLE houses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  postcode VARCHAR(20),
  city VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
  capacity INTEGER DEFAULT 0,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  registration_number VARCHAR(100),
  ofsted_rating VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_houses_company_id ON houses(company_id);
CREATE INDEX idx_houses_status ON houses(status);
CREATE INDEX idx_houses_manager_id ON houses(manager_id);

CREATE TABLE house_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID NOT NULL UNIQUE REFERENCES houses(id) ON DELETE CASCADE,
  governance_frequency VARCHAR(50) DEFAULT 'monthly',
  risk_review_days INTEGER DEFAULT 7,
  escalation_timeout_hours INTEGER DEFAULT 24,
  notification_email VARCHAR(255),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_houses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_in_house VARCHAR(100),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, house_id)
);

CREATE INDEX idx_user_houses_user_id ON user_houses(user_id);
CREATE INDEX idx_user_houses_house_id ON user_houses(house_id);
CREATE INDEX idx_user_houses_company_id ON user_houses(company_id);
