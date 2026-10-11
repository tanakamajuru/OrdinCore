-- Weekly review brief (Admin governance settings): assign a reviewer per service. Additive,
-- nullable — a service with no assigned reviewer falls back to whoever authors the review.
ALTER TABLE houses ADD COLUMN IF NOT EXISTS assigned_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL;
