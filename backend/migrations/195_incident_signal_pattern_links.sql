-- C1 correction (21 Oct 2026): "Replace register-only linking with 'Link relevant records':
-- signals, monitoring, incidents, decisions, actions, escalations, patterns and risks." Risks and
-- escalations (incident_risks/incident_escalations) already have junction tables; signals and
-- patterns did not. Same shape as incident_risks.
CREATE TABLE IF NOT EXISTS incident_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  pulse_id UUID NOT NULL REFERENCES governance_pulses(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (incident_id, pulse_id)
);
CREATE INDEX IF NOT EXISTS idx_incident_signals_incident ON incident_signals(incident_id);

CREATE TABLE IF NOT EXISTS incident_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES signal_clusters(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (incident_id, cluster_id)
);
CREATE INDEX IF NOT EXISTS idx_incident_patterns_incident ON incident_patterns(incident_id);
