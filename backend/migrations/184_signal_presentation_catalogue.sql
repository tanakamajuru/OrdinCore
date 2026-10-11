-- Signal theme simplification — PLUMBING ONLY (display-only presentation catalogue).
--
-- This table is a versioned *presentation* layer over the canonical signal taxonomy.
-- It NEVER changes what is stored or submitted: canonical_theme / canonical_signal_label
-- remain the single source of truth (governance_domains.name / signal_library.signal_label).
-- Each row carries optional plain-language display attributes that the capture form may
-- show INSTEAD of the canonical wording — but ONLY once review_status = 'APPROVED'.
--
-- Phase one (now): mechanism + a small seed, all left as 'DRAFT' so nothing changes in
-- production. Full 306-mapping wording is gated on leadership Stage-B sign-off, after which
-- rows are promoted to 'APPROVED' (SUPER_ADMIN only, audited) and the display wording goes live.

CREATE TABLE IF NOT EXISTS signal_presentation_catalogue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version INTEGER NOT NULL DEFAULT 1,
  sector TEXT NOT NULL,
  -- Canonical keys (match governance_domains.name / signal_library.signal_label).
  -- A NULL canonical_signal_label is a THEME-level mapping (applies to the whole theme).
  canonical_theme TEXT NOT NULL,
  canonical_signal_label TEXT,
  -- Display-only attributes. Any left NULL falls back to the canonical wording.
  display_theme TEXT,
  display_signal TEXT,
  navigation_group TEXT,          -- one of the 8 plain-language browse groups
  help_text TEXT,
  search_aliases TEXT[] NOT NULL DEFAULT '{}',
  recommended_route TEXT,
  review_status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (review_status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One presentation row per (version, sector, theme, signal). COALESCE keeps theme-level
-- rows (NULL signal) from colliding and lets a theme + its signals coexist.
CREATE UNIQUE INDEX IF NOT EXISTS uq_signal_presentation
  ON signal_presentation_catalogue (version, sector, canonical_theme, COALESCE(canonical_signal_label, ''));

CREATE INDEX IF NOT EXISTS idx_signal_presentation_lookup
  ON signal_presentation_catalogue (sector, review_status, is_active);

-- Seed: version 1, a representative set of People & Safety themes, left as DRAFT so the
-- plumbing is proven without altering any production wording. These are theme-level rows
-- (NULL signal label) demonstrating display_theme + navigation_group + help_text.
INSERT INTO signal_presentation_catalogue
  (version, sector, canonical_theme, display_theme, navigation_group, help_text, search_aliases, review_status)
VALUES
  (1, 'SUPPORTED_LIVING', 'Safeguarding & Protection', 'Keeping people safe from harm',
     'Safety & protection', 'Abuse, exploitation or any concern that someone is at risk of harm.',
     ARRAY['abuse','exploitation','protection','harm','risk to person'], 'DRAFT'),
  (1, 'SUPPORTED_LIVING', 'Medication', 'Medication',
     'Health & medication', 'Missed doses, errors, discrepancies or anything wrong with medicines.',
     ARRAY['meds','medicine','dose','prescription','mar chart'], 'DRAFT'),
  (1, 'SUPPORTED_LIVING', 'Physical Health', 'Physical health & wellbeing',
     'Health & medication', 'Illness, falls, deterioration or a medical emergency.',
     ARRAY['illness','falls','injury','deterioration','medical'], 'DRAFT'),
  (1, 'SUPPORTED_LIVING', 'Mental Health & Wellbeing', 'Mental health & wellbeing',
     'Health & medication', 'Low mood, self-harm, suicide risk, psychosis or relapse.',
     ARRAY['mood','self harm','suicide','psychosis','relapse','wellbeing'], 'DRAFT'),
  (1, 'SUPPORTED_LIVING', 'Behaviour & Risk', 'Behaviour that challenges',
     'Behaviour & relationships', 'Aggression, violence, threats or damage to property.',
     ARRAY['aggression','violence','threats','property damage','behaviour'], 'DRAFT'),
  (1, 'SUPPORTED_LIVING', 'Substance Misuse', 'Alcohol & drugs',
     'Behaviour & relationships', 'Alcohol or drug use, dealing or overdose.',
     ARRAY['alcohol','drugs','substances','overdose','dealing'], 'DRAFT'),
  (1, 'SUPPORTED_LIVING', 'Environment & Property', 'The home & environment',
     'Home & environment', 'Cleanliness, fire, flood, gas or building safety.',
     ARRAY['fire','flood','gas','cleanliness','building','maintenance'], 'DRAFT')
ON CONFLICT (version, sector, canonical_theme, COALESCE(canonical_signal_label, '')) DO NOTHING;
