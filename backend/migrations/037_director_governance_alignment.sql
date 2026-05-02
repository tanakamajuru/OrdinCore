-- Migration 037: Director Role Governance Alignment
-- This migration closes the gaps in the Director role by adding forensic control measurement,
-- automated reporting, and intervention tracking tables.

-- 1. Create control_failure_flags table
CREATE TABLE IF NOT EXISTS control_failure_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,
    failure_type VARCHAR(50) NOT NULL, -- 'ineffective_actions', 'neutral_outcomes', 'recurrence'
    threshold_trigger TEXT NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NULL,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_note TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_control_failure_service ON control_failure_flags(service_id);
CREATE INDEX IF NOT EXISTS idx_control_failure_unresolved ON control_failure_flags(resolved_at) WHERE resolved_at IS NULL;

-- 2. Create director_interventions table
CREATE TABLE IF NOT EXISTS director_interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    director_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    intervention_type VARCHAR(50) NOT NULL, -- 'alert_rm', 'flag_for_audit', 'escalate_to_ri', 'request_weekly_review'
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    actioned_at TIMESTAMPTZ NULL,
    actioned_response TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_director_int_service ON director_interventions(service_id);
CREATE INDEX IF NOT EXISTS idx_director_int_director ON director_interventions(director_user_id);

-- 3. Create monthly_board_reports table
CREATE TABLE IF NOT EXISTS monthly_board_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    generated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    draft_narrative TEXT NOT NULL,
    final_narrative TEXT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'finalised'
    pdf_url VARCHAR(500) NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_period ON monthly_board_reports(report_period_start, report_period_end);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_company ON monthly_board_reports(company_id);

-- 4. Add director_alert_flags to houses
ALTER TABLE houses ADD COLUMN IF NOT EXISTS director_alert_flags JSONB DEFAULT '{}';

-- 5. Support action effectiveness outcomes (Ref: Implementation Plan 2.1, 3.1)
-- These columns allow for both automated and manual override of action outcomes
ALTER TABLE risk_actions ADD COLUMN IF NOT EXISTS calculated_outcome action_effectiveness NULL;
ALTER TABLE risk_actions ADD COLUMN IF NOT EXISTS rm_override_outcome action_effectiveness NULL;
ALTER TABLE risk_actions ADD COLUMN IF NOT EXISTS director_override_outcome action_effectiveness NULL;
