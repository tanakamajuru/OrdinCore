-- Migration 059: Configurable governance engine — domains, signal library, thresholds.
-- Implements the doctrine notes: the engine is sector-agnostic; only the signal
-- vocabulary and thresholds change. Seeds the Supported Living 12-domain clustering
-- model and a Domiciliary set (foundation only — no product switch). Additive/idempotent.

-- Sector on the organisation (drives which domain/signal library loads).
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS sector VARCHAR(40) DEFAULT 'SUPPORTED_LIVING';

-- The governance domain a signal belongs to (clustering key).
ALTER TABLE governance_pulses
  ADD COLUMN IF NOT EXISTS governance_domain VARCHAR(60);

-- 12 governance domains (clustering groups) per sector.
CREATE TABLE IF NOT EXISTS governance_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sector VARCHAR(40) NOT NULL,
  name VARCHAR(60) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sector, name)
);

-- The specific signals selectable under each domain (the per-domain dropdown).
CREATE TABLE IF NOT EXISTS signal_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sector VARCHAR(40) NOT NULL,
  domain_name VARCHAR(60) NOT NULL,
  signal_label VARCHAR(120) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sector, domain_name, signal_label)
);

-- Sector-specific pattern thresholds (no hard-coded rules).
CREATE TABLE IF NOT EXISTS threshold_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sector VARCHAR(40) NOT NULL,
  domain_name VARCHAR(60) NOT NULL,
  trigger_signal_count INTEGER NOT NULL DEFAULT 3,
  window_days INTEGER NOT NULL DEFAULT 14,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sector, domain_name)
);

-- ===== Seed: Supported Living 12 domains =====
INSERT INTO governance_domains (sector, name, description, sort_order) VALUES
  ('SUPPORTED_LIVING','Mental Health Stability','Deterioration, relapse indicators, increased symptoms, hospital contact',1),
  ('SUPPORTED_LIVING','Treatment Engagement','Medication refusal, missed depot, refusal of appointments or interventions',2),
  ('SUPPORTED_LIVING','Self-Neglect','Hygiene decline, nutrition concerns, property deterioration, refusal of support',3),
  ('SUPPORTED_LIVING','Safeguarding','Abuse, neglect, financial exploitation, vulnerability concerns',4),
  ('SUPPORTED_LIVING','Exploitation / Cuckooing','Unknown visitors, drug activity, missing money, coercion concerns',5),
  ('SUPPORTED_LIVING','Community Risk','Aggression, threats, police contact, anti-social behaviour',6),
  ('SUPPORTED_LIVING','Placement Stability','Placement breakdown risk, repeated complaints, house conflict, tenancy concerns',7),
  ('SUPPORTED_LIVING','Physical Health','Missed appointments, weight loss, deteriorating condition, refusal of treatment',8),
  ('SUPPORTED_LIVING','Medication Governance','Omissions, errors, refusals, supply issues',9),
  ('SUPPORTED_LIVING','Workforce Reliability','Missed checks, poor handovers, staffing concerns, competency concerns',10),
  ('SUPPORTED_LIVING','Environmental Safety','Fire risks, property damage, unsafe environment, health and safety concerns',11),
  ('SUPPORTED_LIVING','Quality & Experience','Complaints, family concerns, poor engagement, service dissatisfaction',12)
ON CONFLICT (sector, name) DO NOTHING;

-- ===== Seed: Supported Living signal library (per-domain dropdown options) =====
INSERT INTO signal_library (sector, domain_name, signal_label, sort_order) VALUES
  ('SUPPORTED_LIVING','Mental Health Stability','Mental state deterioration',1),
  ('SUPPORTED_LIVING','Mental Health Stability','Relapse indicators',2),
  ('SUPPORTED_LIVING','Mental Health Stability','Increased symptoms',3),
  ('SUPPORTED_LIVING','Mental Health Stability','Crisis / hospital contact',4),
  ('SUPPORTED_LIVING','Treatment Engagement','Medication refusal',1),
  ('SUPPORTED_LIVING','Treatment Engagement','Missed depot',2),
  ('SUPPORTED_LIVING','Treatment Engagement','Refused appointment',3),
  ('SUPPORTED_LIVING','Treatment Engagement','Refused intervention',4),
  ('SUPPORTED_LIVING','Self-Neglect','Hygiene decline',1),
  ('SUPPORTED_LIVING','Self-Neglect','Nutrition concern',2),
  ('SUPPORTED_LIVING','Self-Neglect','Property deterioration',3),
  ('SUPPORTED_LIVING','Self-Neglect','Refusal of support',4),
  ('SUPPORTED_LIVING','Safeguarding','Abuse concern',1),
  ('SUPPORTED_LIVING','Safeguarding','Neglect concern',2),
  ('SUPPORTED_LIVING','Safeguarding','Financial exploitation',3),
  ('SUPPORTED_LIVING','Safeguarding','Vulnerability concern',4),
  ('SUPPORTED_LIVING','Exploitation / Cuckooing','Unknown visitors',1),
  ('SUPPORTED_LIVING','Exploitation / Cuckooing','Drug activity',2),
  ('SUPPORTED_LIVING','Exploitation / Cuckooing','Missing money',3),
  ('SUPPORTED_LIVING','Exploitation / Cuckooing','Coercion concern',4),
  ('SUPPORTED_LIVING','Community Risk','Aggression',1),
  ('SUPPORTED_LIVING','Community Risk','Threats',2),
  ('SUPPORTED_LIVING','Community Risk','Police contact',3),
  ('SUPPORTED_LIVING','Community Risk','Anti-social behaviour',4),
  ('SUPPORTED_LIVING','Placement Stability','Placement breakdown risk',1),
  ('SUPPORTED_LIVING','Placement Stability','Repeated complaints',2),
  ('SUPPORTED_LIVING','Placement Stability','House conflict',3),
  ('SUPPORTED_LIVING','Placement Stability','Tenancy concern',4),
  ('SUPPORTED_LIVING','Physical Health','Missed appointment',1),
  ('SUPPORTED_LIVING','Physical Health','Weight loss',2),
  ('SUPPORTED_LIVING','Physical Health','Deteriorating condition',3),
  ('SUPPORTED_LIVING','Physical Health','Refused treatment',4),
  ('SUPPORTED_LIVING','Medication Governance','Medication omission',1),
  ('SUPPORTED_LIVING','Medication Governance','Medication error',2),
  ('SUPPORTED_LIVING','Medication Governance','Medication refusal',3),
  ('SUPPORTED_LIVING','Medication Governance','Supply issue',4),
  ('SUPPORTED_LIVING','Workforce Reliability','Missed check',1),
  ('SUPPORTED_LIVING','Workforce Reliability','Poor handover',2),
  ('SUPPORTED_LIVING','Workforce Reliability','Staffing concern',3),
  ('SUPPORTED_LIVING','Workforce Reliability','Competency concern',4),
  ('SUPPORTED_LIVING','Environmental Safety','Fire risk',1),
  ('SUPPORTED_LIVING','Environmental Safety','Property damage',2),
  ('SUPPORTED_LIVING','Environmental Safety','Unsafe environment',3),
  ('SUPPORTED_LIVING','Environmental Safety','Health & safety concern',4),
  ('SUPPORTED_LIVING','Quality & Experience','Complaint',1),
  ('SUPPORTED_LIVING','Quality & Experience','Family concern',2),
  ('SUPPORTED_LIVING','Quality & Experience','Poor engagement',3),
  ('SUPPORTED_LIVING','Quality & Experience','Service dissatisfaction',4)
ON CONFLICT (sector, domain_name, signal_label) DO NOTHING;

-- ===== Seed: Supported Living thresholds =====
INSERT INTO threshold_rules (sector, domain_name, trigger_signal_count, window_days, description) VALUES
  ('SUPPORTED_LIVING','Mental Health Stability',3,14,'3 signals in 14 days'),
  ('SUPPORTED_LIVING','Treatment Engagement',3,14,'3 signals in 14 days'),
  ('SUPPORTED_LIVING','Self-Neglect',3,21,'3 signals in 21 days'),
  ('SUPPORTED_LIVING','Safeguarding',1,1,'Any safeguarding signal'),
  ('SUPPORTED_LIVING','Exploitation / Cuckooing',2,14,'2 signals in 14 days'),
  ('SUPPORTED_LIVING','Community Risk',3,14,'3 signals in 14 days'),
  ('SUPPORTED_LIVING','Placement Stability',3,30,'3 signals in 30 days'),
  ('SUPPORTED_LIVING','Physical Health',3,21,'3 signals in 21 days'),
  ('SUPPORTED_LIVING','Medication Governance',3,14,'3 signals in 14 days'),
  ('SUPPORTED_LIVING','Workforce Reliability',3,14,'3 signals in 14 days'),
  ('SUPPORTED_LIVING','Environmental Safety',2,14,'2 signals in 14 days'),
  ('SUPPORTED_LIVING','Quality & Experience',3,30,'3 signals in 30 days')
ON CONFLICT (sector, domain_name) DO NOTHING;

-- ===== Seed: Domiciliary Care (foundation — loads only when a company sector = DOMICILIARY) =====
INSERT INTO governance_domains (sector, name, description, sort_order) VALUES
  ('DOMICILIARY','Visit Reliability','Missed calls, late calls, short visits, no-shows',1),
  ('DOMICILIARY','Medication Governance','Omissions, errors, refusals, supply issues',2),
  ('DOMICILIARY','Safeguarding','Abuse, neglect, financial exploitation, vulnerability concerns',3),
  ('DOMICILIARY','Client Safety','Falls, deterioration, hospital admission, pressure care',4),
  ('DOMICILIARY','Workforce Reliability','Staff no-shows, late arrivals, route failures, competency concerns',5),
  ('DOMICILIARY','Care Continuity','Care plan not followed, double-handed calls missed, handover gaps',6),
  ('DOMICILIARY','Quality & Experience','Complaints, family concerns, service dissatisfaction',7),
  ('DOMICILIARY','Community & Wellbeing','Social isolation, wellbeing decline, environment concerns',8)
ON CONFLICT (sector, name) DO NOTHING;

INSERT INTO signal_library (sector, domain_name, signal_label, sort_order) VALUES
  ('DOMICILIARY','Visit Reliability','Missed call',1),
  ('DOMICILIARY','Visit Reliability','Late call',2),
  ('DOMICILIARY','Visit Reliability','Short visit',3),
  ('DOMICILIARY','Visit Reliability','No-show',4),
  ('DOMICILIARY','Medication Governance','Medication omission',1),
  ('DOMICILIARY','Medication Governance','Medication error',2),
  ('DOMICILIARY','Medication Governance','Medication refusal',3),
  ('DOMICILIARY','Safeguarding','Abuse concern',1),
  ('DOMICILIARY','Safeguarding','Neglect concern',2),
  ('DOMICILIARY','Safeguarding','Financial exploitation',3),
  ('DOMICILIARY','Client Safety','Fall',1),
  ('DOMICILIARY','Client Safety','Deterioration',2),
  ('DOMICILIARY','Client Safety','Hospital admission',3),
  ('DOMICILIARY','Workforce Reliability','Staff no-show',1),
  ('DOMICILIARY','Workforce Reliability','Late arrival',2),
  ('DOMICILIARY','Workforce Reliability','Route failure',3),
  ('DOMICILIARY','Care Continuity','Care plan not followed',1),
  ('DOMICILIARY','Care Continuity','Double-handed call missed',2),
  ('DOMICILIARY','Quality & Experience','Complaint',1),
  ('DOMICILIARY','Quality & Experience','Family concern',2),
  ('DOMICILIARY','Community & Wellbeing','Social isolation',1),
  ('DOMICILIARY','Community & Wellbeing','Wellbeing decline',2)
ON CONFLICT (sector, domain_name, signal_label) DO NOTHING;

INSERT INTO threshold_rules (sector, domain_name, trigger_signal_count, window_days, description) VALUES
  ('DOMICILIARY','Visit Reliability',3,7,'3 missed/late visits in 7 days'),
  ('DOMICILIARY','Medication Governance',3,14,'3 signals in 14 days'),
  ('DOMICILIARY','Safeguarding',1,1,'Any safeguarding signal'),
  ('DOMICILIARY','Client Safety',2,14,'2 signals in 14 days'),
  ('DOMICILIARY','Workforce Reliability',5,14,'5 signals in 14 days'),
  ('DOMICILIARY','Care Continuity',3,14,'3 signals in 14 days'),
  ('DOMICILIARY','Quality & Experience',3,30,'3 signals in 30 days'),
  ('DOMICILIARY','Community & Wellbeing',3,30,'3 signals in 30 days')
ON CONFLICT (sector, domain_name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_governance_domains_sector ON governance_domains(sector, is_active);
CREATE INDEX IF NOT EXISTS idx_signal_library_sector_domain ON signal_library(sector, domain_name, is_active);
CREATE INDEX IF NOT EXISTS idx_gp_governance_domain ON governance_pulses(company_id, governance_domain);
