-- Migration 036: Responsible Individual (RI) Governance Alignment

-- Track statutory acknowledgements
CREATE TABLE ri_acknowledgements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    ri_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledgement_text TEXT,
    is_statutory_notification BOOLEAN DEFAULT FALSE,
    statutory_body_reference VARCHAR(100),
    requires_follow_up BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_ri_ack_incident ON ri_acknowledgements(incident_id);
CREATE INDEX idx_ri_ack_ri_user ON ri_acknowledgements(ri_user_id);
CREATE INDEX idx_ri_ack_created ON ri_acknowledgements(acknowledged_at);

-- Track RI queries to RM
CREATE TABLE ri_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    weekly_review_id UUID NOT NULL REFERENCES weekly_reviews(id) ON DELETE CASCADE,
    ri_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    rm_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    query_text TEXT NOT NULL,
    query_sent_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NULL,
    rm_response_text TEXT NULL,
    is_escalated_to_director BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_ri_queries_review ON ri_queries(weekly_review_id);
CREATE INDEX idx_ri_queries_resolved ON ri_queries(resolved_at) WHERE resolved_at IS NULL;

-- Track evidence pack requests
CREATE TABLE evidence_pack_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    generated_at TIMESTAMPTZ NULL,
    pdf_url VARCHAR(500) NULL,
    status VARCHAR(20) DEFAULT 'pending'
);

-- Update houses table for deputy metrics
ALTER TABLE houses ADD COLUMN deputy_cover_started_at TIMESTAMPTZ NULL;
ALTER TABLE houses ADD COLUMN deputy_cover_ended_at TIMESTAMPTZ NULL;
ALTER TABLE houses ADD COLUMN deputy_cover_total_seconds BIGINT DEFAULT 0;

-- Materialized View for Governance Heatmap
CREATE MATERIALIZED VIEW service_governance_compliance_mv AS
WITH last_7_days AS (
    SELECT generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day')::DATE AS review_date
)
SELECT 
    h.id AS house_id,
    h.name AS house_name,
    h.company_id,
    l7.review_date,
    CASE 
        WHEN dgl.id IS NOT NULL AND dgl.completed = true THEN 'completed'
        ELSE 'missed'
    END AS daily_status,
    COALESCE(wr.id IS NOT NULL, FALSE) AS weekly_completed_this_week
FROM houses h
CROSS JOIN last_7_days l7
LEFT JOIN daily_governance_log dgl ON dgl.house_id = h.id AND dgl.review_date = l7.review_date
LEFT JOIN weekly_reviews wr ON wr.house_id = h.id AND wr.week_ending >= l7.review_date AND wr.week_ending < l7.review_date + 7
WHERE h.status = 'active';

CREATE UNIQUE INDEX idx_sgc_mv_unique ON service_governance_compliance_mv (house_id, review_date);
