# Database Schema - CareSignal Governance SaaS Platform

## Overview

This document defines the database schema for the CareSignal Governance SaaS Platform. The schema supports multi-tenant architecture with provider-level data isolation, immutable audit trails, and comprehensive governance data management.

## Database Design Principles

### Multi-Tenant Architecture
- **Provider Isolation**: All data is scoped to a provider_id
- **Shared Schema**: Single database with logical separation
- **Row-Level Security**: Provider-based filtering at database level

### Data Integrity
- **Immutable Records**: Escalation logs and locked reviews cannot be modified
- **Audit Trails**: All changes tracked with timestamps and user attribution
- **Referential Integrity**: Foreign key constraints maintain data relationships

### Performance Considerations
- **Indexing Strategy**: Optimized indexes for common query patterns
- **Partitioning**: Time-based partitioning for large tables
- **Archiving**: Historical data archival policies

## Schema Definition

### 1. Provider Management

#### providers
Stores provider organization information and settings.

```sql
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_providers_name ON providers(name);
CREATE INDEX idx_providers_active ON providers(is_active);
```

**Settings JSON Schema:**
```json
{
  "reporting_frequency": "weekly|monthly",
  "custom_fields": [
    {
      "name": "custom_field_name",
      "type": "text|number|date|boolean",
      "required": true,
      "options": ["option1", "option2"]
    }
  ],
  "notification_settings": {
    "email_alerts": true,
    "escalation_notifications": true,
    "weekly_reminders": true
  },
  "compliance_settings": {
    "data_retention_months": 84,
    "audit_logging": true,
    "require_dual_approval": false
  }
}
```

#### users
Stores user accounts with role-based permissions.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    permissions JSONB DEFAULT '[]',
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email_provider ON users(email, provider_id);
CREATE INDEX idx_users_provider_id ON users(provider_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
```

**Permissions JSON Schema:**
```json
[
  "dashboard:view",
  "pulse:create",
  "pulse:view",
  "weekly:create",
  "weekly:view",
  "risk:create",
  "risk:view",
  "risk:edit",
  "escalation:view",
  "escalation:create",
  "trends:view",
  "reports:view",
  "profile:view",
  "profile:edit"
]
```

### 2. Governance Data

#### governance_pulses
Stores daily governance pulse submissions.

```sql
CREATE TABLE governance_pulses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    day_type VARCHAR(20) NOT NULL CHECK (day_type IN ('monday', 'wednesday', 'friday')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    data JSONB NOT NULL DEFAULT '{}',
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(provider_id, date)
);

CREATE INDEX idx_pulses_provider_date ON governance_pulses(provider_id, date);
CREATE INDEX idx_pulses_status ON governance_pulses(status);
CREATE INDEX idx_pulses_day_type ON governance_pulses(day_type);
CREATE INDEX idx_pulses_submitted_by ON governance_pulses(submitted_by);
```

**Data JSON Schema (Monday):**
```json
{
  "stability_checks": {
    "overnight_stability": true,
    "weekend_oversight": true,
    "staffing_adequacy": false,
    "critical_incidents": false,
    "safeguarding_concerns": false,
    "medication_administration": true
  },
  "escalation_subform": {
    "new_escalations": false,
    "escalation_details": "",
    "immediate_actions": ""
  },
  "house_snapshot": [
    {
      "house_name": "House A",
      "occupancy": 20,
      "staff_on_duty": 4,
      "overnight_staff": 2,
      "issues": "None"
    }
  ],
  "reflection": "Overall stable weekend with adequate staffing levels."
}
```

**Data JSON Schema (Wednesday):**
```json
{
  "escalation_review": {
    "new_escalations": false,
    "escalation_resolution": true,
    "provider_response": true,
    "mitigation_effectiveness": true,
    "follow_up_required": false
  },
  "reflection": "All escalations from this week have been resolved..."
}
```

**Data JSON Schema (Friday):**
```json
{
  "trajectory_review": {
    "overall_trajectory": "stable",
    "risk_trend": "decreasing",
    "staffing_outlook": "adequate"
  },
  "reflection": "Positive trajectory observed this week..."
}
```

#### weekly_reviews
Stores comprehensive weekly governance reviews.

```sql
CREATE TABLE weekly_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'locked')),
    data JSONB NOT NULL DEFAULT '{}',
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(provider_id, week_start)
);

CREATE INDEX idx_weekly_provider_week ON weekly_reviews(provider_id, week_start);
CREATE INDEX idx_weekly_status ON weekly_reviews(status);
CREATE INDEX idx_weekly_submitted_by ON weekly_reviews(submitted_by);
```

**Data JSON Schema:**
```json
{
  "executive_overview": "This week showed stable operations with 2 new risks identified...",
  "risk_register_review": [
    {
      "risk_id": "risk_123",
      "title": "Staffing Shortages",
      "status": "Open",
      "review_notes": "Continued monitoring required"
    }
  ],
  "safeguarding_activity": {
    "concerns_raised": 1,
    "investigations_completed": 1,
    "outcomes": "All concerns resolved satisfactorily",
    "expandable_concerns": [
      {
        "concern_id": "concern_123",
        "description": "Staffing levels during night shift",
        "investigation": "Review of rosters completed",
        "outcome": "Additional night staff approved"
      }
    ]
  },
  "incident_reflection": {
    "medication_errors": false,
    "falls": true,
    "safeguarding_concerns": false,
    "complaints": false,
    "infections": false,
    "critical_incidents": false,
    "staffing_issues": true,
    "maintenance_issues": false,
    "other_incidents": false,
    "incident_details": {
      "falls": "2 minor falls reported, no injuries"
    }
  },
  "staffing_assurance": {
    "commissioned_hours": 560,
    "actual_hours": 540,
    "variance": -20,
    "notes": "Shortage due to unexpected sick leave",
    "vacancy_details": {
      "total_positions": 25,
      "filled_positions": 23,
      "vacant_positions": 2
    }
  },
  "escalation_oversight": {
    "provider_escalations": 2,
    "resolution_times": ["2 days", "1 day"],
    "outcomes": "Both resolved satisfactorily",
    "escalation_details": [
      {
        "escalation_id": "escalation_123",
        "provider": "NHS England",
        "resolution_time": "2 days",
        "outcome": "Additional funding approved"
      }
    ]
  },
  "learning_actions": [
    {
      "id": "action_123",
      "description": "Review staffing contingency plans",
      "assigned_to": "user_456",
      "due_date": "2024-01-30",
      "status": "Open",
      "priority": "High"
    }
  ],
  "reflective_statement": "Overall governance remains strong with areas for improvement in staffing..."
}
```

### 3. Risk Management

#### risk_categories
Defines risk categories for classification.

```sql
CREATE TABLE risk_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#000000',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(provider_id, name)
);

CREATE INDEX idx_risk_categories_provider ON risk_categories(provider_id);
CREATE INDEX idx_risk_categories_active ON risk_categories(is_active);
```

#### risks
Stores risk register entries.

```sql
CREATE TABLE risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id UUID REFERENCES risk_categories(id),
    likelihood VARCHAR(20) NOT NULL CHECK (likelihood IN ('Low', 'Medium', 'High')),
    impact VARCHAR(20) NOT NULL CHECK (impact IN ('Low', 'Medium', 'High')),
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Under Review', 'Escalated', 'Closed')),
    assigned_to UUID REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES users(id)
);

CREATE INDEX idx_risks_provider_id ON risks(provider_id);
CREATE INDEX idx_risks_status ON risks(status);
CREATE INDEX idx_risks_category ON risks(category_id);
CREATE INDEX idx_risks_likelihood ON risks(likelihood);
CREATE INDEX idx_risks_impact ON risks(impact);
CREATE INDEX idx_risks_assigned_to ON risks(assigned_to);
CREATE INDEX idx_risks_created_by ON risks(created_by);
CREATE INDEX idx_risks_created_at ON risks(created_at);
```

#### risk_actions
Stores risk mitigation actions.

```sql
CREATE TABLE risk_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    assigned_to UUID REFERENCES users(id),
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Completed', 'Overdue')),
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id)
);

CREATE INDEX idx_risk_actions_risk_id ON risk_actions(risk_id);
CREATE INDEX idx_risk_actions_status ON risk_actions(status);
CREATE INDEX idx_risk_actions_assigned_to ON risk_actions(assigned_to);
CREATE INDEX idx_risk_actions_due_date ON risk_actions(due_date);
CREATE INDEX idx_risk_actions_priority ON risk_actions(priority);
```

#### risk_timeline
Stores risk timeline events for audit trail.

```sql
CREATE TABLE risk_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_risk_timeline_risk_id ON risk_timeline(risk_id);
CREATE INDEX idx_risk_timeline_event_type ON risk_timeline(event_type);
CREATE INDEX idx_risk_timeline_created_at ON risk_timeline(created_at);
CREATE INDEX idx_risk_timeline_created_by ON risk_timeline(created_by);
```

### 4. Escalation Management

#### escalations
Stores escalation records (immutable).

```sql
CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    risk_id UUID REFERENCES risks(id),
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    escalated_to VARCHAR(255) NOT NULL,
    escalated_by UUID NOT NULL REFERENCES users(id),
    escalated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Under Review', 'Resolved')),
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    urgency VARCHAR(20) DEFAULT 'Medium' CHECK (urgency IN ('Low', 'Medium', 'High', 'Critical')),
    reference_number VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_escalations_provider_id ON escalations(provider_id);
CREATE INDEX idx_escalations_risk_id ON escalations(risk_id);
CREATE INDEX idx_escalations_status ON escalations(status);
CREATE INDEX idx_escalations_type ON escalations(type);
CREATE INDEX idx_escalations_escalated_by ON escalations(escalated_by);
CREATE INDEX idx_escalations_escalated_at ON escalations(escalated_at);
CREATE INDEX idx_escalations_urgency ON escalations(urgency);
```

#### escalation_documents
Stores escalation-related documents.

```sql
CREATE TABLE escalation_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escalation_id UUID NOT NULL REFERENCES escalations(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_escalation_docs_escalation_id ON escalation_documents(escalation_id);
CREATE INDEX idx_escalation_docs_uploaded_by ON escalation_documents(uploaded_by);
```

### 5. Audit and Logging

#### audit_logs
Stores comprehensive audit trail.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_provider_id ON audit_logs(provider_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Partition audit_logs by month for performance
CREATE TABLE audit_logs_y2024m01 PARTITION OF audit_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### user_sessions
Stores user session information.

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

### 6. Reports and Analytics

#### generated_reports
Stores generated report metadata.

```sql
CREATE TABLE generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    parameters JSONB DEFAULT '{}',
    file_path VARCHAR(500),
    file_size BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generated_reports_provider_id ON generated_reports(provider_id);
CREATE INDEX idx_generated_reports_type ON generated_reports(report_type);
CREATE INDEX idx_generated_reports_status ON generated_reports(status);
CREATE INDEX idx_generated_reports_generated_by ON generated_reports(generated_by);
```

#### analytics_cache
Stores cached analytics data for performance.

```sql
CREATE TABLE analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    cache_key VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(provider_id, cache_key)
);

CREATE INDEX idx_analytics_cache_provider_key ON analytics_cache(provider_id, cache_key);
CREATE INDEX idx_analytics_cache_expires_at ON analytics_cache(expires_at);
```

## Constraints and Triggers

### Row-Level Security

```sql
-- Enable Row Level Security
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_pulses ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY provider_isolation ON providers
FOR ALL TO authenticated_user
USING (id = current_setting('app.current_provider_id')::UUID);

CREATE POLICY user_provider_isolation ON users
FOR ALL TO authenticated_user
USING (provider_id = current_setting('app.current_provider_id')::UUID);

-- Similar policies for all other tables...
```

### Immutable Record Constraints

```sql
-- Prevent modification of locked weekly reviews
CREATE OR REPLACE FUNCTION prevent_locked_review_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'locked' AND NEW.status = 'locked' THEN
        RAISE EXCEPTION 'Cannot modify locked weekly review';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_locked_review_modification
BEFORE UPDATE ON weekly_reviews
FOR EACH ROW EXECUTE FUNCTION prevent_locked_review_modification();

-- Prevent modification of escalation records (immutable)
CREATE OR REPLACE FUNCTION prevent_escalation_modification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow status changes and resolution updates
    IF OLD.status != NEW.status AND OLD.status != 'Resolved' THEN
        RETURN NEW;
    END IF;
    IF OLD.resolution IS NULL AND NEW.resolution IS NOT NULL THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cannot modify escalation record';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_escalation_modification
BEFORE UPDATE ON escalations
FOR EACH ROW EXECUTE FUNCTION prevent_escalation_modification();
```

### Audit Trail Triggers

```sql
-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (provider_id, user_id, action, table_name, record_id, new_values)
        VALUES (
            COALESCE(NEW.provider_id, current_setting('app.current_provider_id')::UUID),
            current_setting('app.current_user_id')::UUID,
            'INSERT',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (provider_id, user_id, action, table_name, record_id, old_values, new_values)
        VALUES (
            COALESCE(NEW.provider_id, OLD.provider_id, current_setting('app.current_provider_id')::UUID),
            current_setting('app.current_user_id')::UUID,
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (provider_id, user_id, action, table_name, record_id, old_values)
        VALUES (
            OLD.provider_id,
            current_setting('app.current_user_id')::UUID,
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            row_to_json(OLD)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_risks_trigger
AFTER INSERT OR UPDATE OR DELETE ON risks
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_weekly_reviews_trigger
AFTER INSERT OR UPDATE OR DELETE ON weekly_reviews
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Similar triggers for other important tables...
```

## Performance Optimization

### Indexing Strategy

```sql
-- Composite indexes for common queries
CREATE INDEX idx_risks_provider_status ON risks(provider_id, status);
CREATE INDEX idx_risks_provider_category ON risks(provider_id, category_id);
CREATE INDEX idx_escalations_provider_status ON escalations(provider_id, status);
CREATE INDEX idx_pulses_provider_date_status ON governance_pulses(provider_id, date, status);
CREATE INDEX idx_weekly_provider_week_status ON weekly_reviews(provider_id, week_start, status);

-- Partial indexes for filtered queries
CREATE INDEX idx_active_risks ON risks(provider_id) WHERE status != 'Closed';
CREATE INDEX idx_open_escalations ON escalations(provider_id) WHERE status = 'Open';
CREATE INDEX idx_pending_actions ON risk_actions(risk_id) WHERE status IN ('Open', 'In Progress');
```

### Partitioning Strategy

```sql
-- Partition large tables by date
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ... other columns ...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE audit_logs_y2024m01 PARTITION OF audit_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit_logs_y2024m02 PARTITION OF audit_logs
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Auto-partition creation function
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_y' || EXTRACT(YEAR FROM start_date) || 'm' || LPAD(EXTRACT(MONTH FROM start_date)::TEXT, 2, '0');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

## Data Retention and Archiving

### Archiving Policy

```sql
-- Archive old audit logs
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS VOID AS $$
BEGIN
    -- Move logs older than 2 years to archive table
    INSERT INTO audit_logs_archive
    SELECT * FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '2 years';
    
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule to run monthly
SELECT cron.schedule('archive-audit-logs', '0 2 1 * *', 'SELECT archive_old_audit_logs();');
```

### Data Cleanup

```sql
-- Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS VOID AS $$
BEGIN
    DELETE FROM user_sessions
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Clean up expired analytics cache
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS VOID AS $$
BEGIN
    DELETE FROM analytics_cache
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule to run daily
SELECT cron.schedule('cleanup-sessions', '0 3 * * *', 'SELECT cleanup_expired_sessions();');
SELECT cron.schedule('cleanup-cache', '0 4 * * *', 'SELECT cleanup_expired_cache();');
```

## Backup and Recovery

### Backup Strategy

```sql
-- Daily full backup
pg_dump -h localhost -U postgres -d caresignal_db -f /backups/caresignal_$(date +%Y%m%d).sql

-- Incremental backup using WAL archiving
archive_command = 'cp %p /backups/wal_archive/%f'
```

### Point-in-Time Recovery

```sql
-- Restore to specific point
pg_basebackup -h localhost -D /backups/base_backup -U postgres -v -P -W

-- Apply WAL logs to specific timestamp
pg_ctl start -D /backups/base_backup -o "-c recovery_target_time='2024-01-15 10:00:00'"
```

This database schema provides a robust foundation for the CareSignal Governance SaaS Platform, ensuring data integrity, security, performance, and scalability for multi-tenant governance management.
