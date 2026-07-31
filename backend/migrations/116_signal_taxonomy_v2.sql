-- Migration 116: Signal Taxonomy v2 — the full Supported Living governance taxonomy.
-- ---------------------------------------------------------------------------------
-- Replaces the original 12 Supported Living themes/signals with the 26-theme model
-- organised under six governance pillars, each signal carrying a per-signal
-- escalation flag: IMMEDIATE (escalate on capture, any severity), CONDITIONAL
-- ("Depends" — escalate now only when High/Critical), or NONE (cluster only).
--
-- Old rows are DEACTIVATED, never deleted, so historical signals keep their labels
-- and trend history stays intact. Themes are fixed (software/admin only); signal
-- subcategories are admin-expandable. Idempotent.

BEGIN;

-- 1) Schema additions -------------------------------------------------------------

-- Persist the specific signal chosen (was captured + sent but never stored).
ALTER TABLE governance_pulses
  ADD COLUMN IF NOT EXISTS signal_label VARCHAR(120);

-- Group each theme under one of the six governance pillars.
ALTER TABLE governance_domains
  ADD COLUMN IF NOT EXISTS pillar VARCHAR(60);

-- Per-signal escalation behaviour.
ALTER TABLE signal_library
  ADD COLUMN IF NOT EXISTS escalation VARCHAR(12) NOT NULL DEFAULT 'NONE';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signal_library_escalation_chk') THEN
    ALTER TABLE signal_library
      ADD CONSTRAINT signal_library_escalation_chk
      CHECK (escalation IN ('IMMEDIATE','CONDITIONAL','NONE'));
  END IF;
END $$;

-- 2) Retire the old Supported Living taxonomy (keep rows for history) --------------
UPDATE governance_domains SET is_active = false WHERE sector = 'SUPPORTED_LIVING';
UPDATE signal_library     SET is_active = false WHERE sector = 'SUPPORTED_LIVING';
UPDATE threshold_rules    SET is_active = false WHERE sector = 'SUPPORTED_LIVING';
-- The blanket domain-level fast-path rules are superseded by per-signal flags +
-- the Critical-signal handler in pulse.service. Deactivate the platform defaults
-- so they don't double-fire (company-specific overrides are left untouched).
UPDATE immediate_detection_rules SET is_active = false
  WHERE sector = 'SUPPORTED_LIVING' AND company_id IS NULL;

-- 3) Themes (26) ------------------------------------------------------------------
INSERT INTO governance_domains (sector, name, description, pillar, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Safeguarding & Protection','Abuse, exploitation, trafficking and safeguarding disclosures','People & Safety',1,true),
  ('SUPPORTED_LIVING','Mental Health & Wellbeing','Mood, psychosis, self-harm, suicide risk and relapse','People & Safety',2,true),
  ('SUPPORTED_LIVING','Physical Health','Illness, falls, deterioration and medical emergencies','People & Safety',3,true),
  ('SUPPORTED_LIVING','Medication','Omissions, errors, discrepancies and overdose','People & Safety',4,true),
  ('SUPPORTED_LIVING','Behaviour & Risk','Aggression, violence, threats and property damage','People & Safety',5,true),
  ('SUPPORTED_LIVING','Substance Misuse','Alcohol and drug use, dealing and overdose','People & Safety',6,true),
  ('SUPPORTED_LIVING','Environment & Property','Cleanliness, fire, flood, gas and building safety','People & Safety',7,true),
  ('SUPPORTED_LIVING','Workforce & Staffing','Staffing levels, misconduct and lone-worker safety','Workforce & Capability',8,true),
  ('SUPPORTED_LIVING','Workforce Assurance','Supervisions, appraisals, capability and disciplinary','Workforce & Capability',9,true),
  ('SUPPORTED_LIVING','Learning & Development','Mandatory training, competency and certification','Workforce & Capability',10,true),
  ('SUPPORTED_LIVING','HR Compliance','DBS, right to work, registration and licences','Workforce & Capability',11,true),
  ('SUPPORTED_LIVING','Governance & Compliance','Audits, actions, documentation and SLAs','Governance & Compliance',12,true),
  ('SUPPORTED_LIVING','Quality Assurance & Audits','Audit outcomes and improvement plans','Governance & Compliance',13,true),
  ('SUPPORTED_LIVING','Policies & Procedures','Policy review, acknowledgement and withdrawal','Governance & Compliance',14,true),
  ('SUPPORTED_LIVING','Professional & External Agencies','GP, CMHT, police, CQC and external contacts','Governance & Compliance',15,true),
  ('SUPPORTED_LIVING','Finance & Tenancy','Rent, benefits, debt, theft and eviction risk','Quality of Life & Outcomes',16,true),
  ('SUPPORTED_LIVING','Recovery & Independence','Progress, milestones and independent living','Quality of Life & Outcomes',17,true),
  ('SUPPORTED_LIVING','Serious Incidents & Emergencies','Deaths, missing persons and emergency service attendance','People & Safety',18,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Activities, participation, integration and inclusion','Quality of Life & Outcomes',19,true),
  ('SUPPORTED_LIVING','Community Living Skills','Independent shopping, transport, finances and daily living','Quality of Life & Outcomes',20,true),
  ('SUPPORTED_LIVING','Relationships & Natural Support Networks','Family, peers and support-network changes','Quality of Life & Outcomes',21,true),
  ('SUPPORTED_LIVING','Citizenship & Rights','Choice, advocacy, human rights and restrictive practice','Quality of Life & Outcomes',22,true),
  ('SUPPORTED_LIVING','Organisational Culture','Staff voice, morale, speaking up and reflective practice','Culture & Leadership',23,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Complaints, compliments, client voice and co-production','Culture & Leadership',24,true),
  ('SUPPORTED_LIVING','Organisational Learning','Lessons, repeats and shared good practice','Governance & Compliance',25,true),
  ('SUPPORTED_LIVING','Strategic Governance','Strategic risk, regulatory, financial and business continuity','Strategic Assurance',26,true)
ON CONFLICT (sector, name) DO UPDATE
  SET description = EXCLUDED.description, pillar = EXCLUDED.pillar,
      sort_order = EXCLUDED.sort_order, is_active = true;

-- 4) Signal library (per-signal escalation flag) ----------------------------------
-- escalation: IMMEDIATE = escalate now (any severity); CONDITIONAL = escalate now if
-- High/Critical; NONE = cluster only.

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Safeguarding & Protection','Physical abuse','IMMEDIATE',1,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Emotional abuse','NONE',2,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Sexual abuse','IMMEDIATE',3,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Financial abuse','IMMEDIATE',4,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Neglect','CONDITIONAL',5,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Self-neglect','NONE',6,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Cuckooing','IMMEDIATE',7,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','County Lines','IMMEDIATE',8,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Grooming','IMMEDIATE',9,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Modern Slavery','IMMEDIATE',10,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Human Trafficking','IMMEDIATE',11,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Domestic Abuse','IMMEDIATE',12,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Hate Crime','IMMEDIATE',13,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Mate Crime','IMMEDIATE',14,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Safeguarding Disclosure','IMMEDIATE',15,true),
  ('SUPPORTED_LIVING','Safeguarding & Protection','Police Safeguarding Referral','IMMEDIATE',16,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Mental Health & Wellbeing','Low Mood','NONE',1,true),
  ('SUPPORTED_LIVING','Mental Health & Wellbeing','Anxiety','NONE',2,true),
  ('SUPPORTED_LIVING','Mental Health & Wellbeing','Withdrawal','NONE',3,true),
  ('SUPPORTED_LIVING','Mental Health & Wellbeing','Sleep Deterioration','NONE',4,true),
  ('SUPPORTED_LIVING','Mental Health & Wellbeing','Hallucinations','CONDITIONAL',5,true),
  ('SUPPORTED_LIVING','Mental Health & Wellbeing','Delusions','CONDITIONAL',6,true),
  ('SUPPORTED_LIVING','Mental Health & Wellbeing','Self Harm','CONDITIONAL',7,true),
  ('SUPPORTED_LIVING','Mental Health & Wellbeing','Serious Self Harm','IMMEDIATE',8,true),
  ('SUPPORTED_LIVING','Mental Health & Wellbeing','Suicide Attempt','IMMEDIATE',9,true),
  ('SUPPORTED_LIVING','Mental Health & Wellbeing','Active Suicidal Thoughts','IMMEDIATE',10,true),
  ('SUPPORTED_LIVING','Mental Health & Wellbeing','Relapse','IMMEDIATE',11,true),
  ('SUPPORTED_LIVING','Mental Health & Wellbeing','Crisis Assessment Required','IMMEDIATE',12,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Physical Health','Minor Illness','NONE',1,true),
  ('SUPPORTED_LIVING','Physical Health','Falls','CONDITIONAL',2,true),
  ('SUPPORTED_LIVING','Physical Health','Weight Loss','NONE',3,true),
  ('SUPPORTED_LIVING','Physical Health','Dehydration','CONDITIONAL',4,true),
  ('SUPPORTED_LIVING','Physical Health','Infection','CONDITIONAL',5,true),
  ('SUPPORTED_LIVING','Physical Health','Chest Pain','IMMEDIATE',6,true),
  ('SUPPORTED_LIVING','Physical Health','Stroke Symptoms','IMMEDIATE',7,true),
  ('SUPPORTED_LIVING','Physical Health','Collapse','IMMEDIATE',8,true),
  ('SUPPORTED_LIVING','Physical Health','Seizure','IMMEDIATE',9,true),
  ('SUPPORTED_LIVING','Physical Health','Emergency Admission','IMMEDIATE',10,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Medication','Missed Medication','NONE',1,true),
  ('SUPPORTED_LIVING','Medication','Refused Medication','NONE',2,true),
  ('SUPPORTED_LIVING','Medication','Medication Delay','NONE',3,true),
  ('SUPPORTED_LIVING','Medication','Medication Side Effects','CONDITIONAL',4,true),
  ('SUPPORTED_LIVING','Medication','Medication Error','CONDITIONAL',5,true),
  ('SUPPORTED_LIVING','Medication','Wrong Medication','IMMEDIATE',6,true),
  ('SUPPORTED_LIVING','Medication','Controlled Drug Discrepancy','IMMEDIATE',7,true),
  ('SUPPORTED_LIVING','Medication','Overdose','IMMEDIATE',8,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Behaviour & Risk','Verbal Aggression','NONE',1,true),
  ('SUPPORTED_LIVING','Behaviour & Risk','Physical Aggression','IMMEDIATE',2,true),
  ('SUPPORTED_LIVING','Behaviour & Risk','Threats','CONDITIONAL',3,true),
  ('SUPPORTED_LIVING','Behaviour & Risk','Violence','IMMEDIATE',4,true),
  ('SUPPORTED_LIVING','Behaviour & Risk','Property Damage','CONDITIONAL',5,true),
  ('SUPPORTED_LIVING','Behaviour & Risk','Boundary Issues','NONE',6,true),
  ('SUPPORTED_LIVING','Behaviour & Risk','Weapon Found','IMMEDIATE',7,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Substance Misuse','Alcohol Misuse','CONDITIONAL',1,true),
  ('SUPPORTED_LIVING','Substance Misuse','Drug Use','NONE',2,true),
  ('SUPPORTED_LIVING','Substance Misuse','Cannabis Use','NONE',3,true),
  ('SUPPORTED_LIVING','Substance Misuse','Drug Dealing','IMMEDIATE',4,true),
  ('SUPPORTED_LIVING','Substance Misuse','Needle Found','CONDITIONAL',5,true),
  ('SUPPORTED_LIVING','Substance Misuse','Suspected Overdose','IMMEDIATE',6,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Environment & Property','Poor Cleanliness','NONE',1,true),
  ('SUPPORTED_LIVING','Environment & Property','Hoarding','NONE',2,true),
  ('SUPPORTED_LIVING','Environment & Property','Fire Hazard','CONDITIONAL',3,true),
  ('SUPPORTED_LIVING','Environment & Property','Flood','IMMEDIATE',4,true),
  ('SUPPORTED_LIVING','Environment & Property','Gas Leak','IMMEDIATE',5,true),
  ('SUPPORTED_LIVING','Environment & Property','Fire','IMMEDIATE',6,true),
  ('SUPPORTED_LIVING','Environment & Property','Fire Alarm Failure','IMMEDIATE',7,true),
  ('SUPPORTED_LIVING','Environment & Property','Unsafe Building','IMMEDIATE',8,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Workforce & Staffing','Staff Absence','NONE',1,true),
  ('SUPPORTED_LIVING','Workforce & Staffing','Unsafe Staffing Levels','IMMEDIATE',2,true),
  ('SUPPORTED_LIVING','Workforce & Staffing','Staff Misconduct','CONDITIONAL',3,true),
  ('SUPPORTED_LIVING','Workforce & Staffing','Staff Sleeping','CONDITIONAL',4,true),
  ('SUPPORTED_LIVING','Workforce & Staffing','Staff Arrested','IMMEDIATE',5,true),
  ('SUPPORTED_LIVING','Workforce & Staffing','Serious Competency Concern','CONDITIONAL',6,true),
  ('SUPPORTED_LIVING','Workforce & Staffing','Lone Worker Incident','IMMEDIATE',7,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Workforce Assurance','Supervision Overdue','NONE',1,true),
  ('SUPPORTED_LIVING','Workforce Assurance','Supervision Completed','NONE',2,true),
  ('SUPPORTED_LIVING','Workforce Assurance','Appraisal Overdue','NONE',3,true),
  ('SUPPORTED_LIVING','Workforce Assurance','Appraisal Completed','NONE',4,true),
  ('SUPPORTED_LIVING','Workforce Assurance','Probation Review Overdue','NONE',5,true),
  ('SUPPORTED_LIVING','Workforce Assurance','Return to Work Review Overdue','NONE',6,true),
  ('SUPPORTED_LIVING','Workforce Assurance','Performance Concern Identified','CONDITIONAL',7,true),
  ('SUPPORTED_LIVING','Workforce Assurance','Capability Concern','CONDITIONAL',8,true),
  ('SUPPORTED_LIVING','Workforce Assurance','Disciplinary Started','CONDITIONAL',9,true),
  ('SUPPORTED_LIVING','Workforce Assurance','Suspension of Staff','IMMEDIATE',10,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Learning & Development','Mandatory Training Due','NONE',1,true),
  ('SUPPORTED_LIVING','Learning & Development','Mandatory Training Overdue','NONE',2,true),
  ('SUPPORTED_LIVING','Learning & Development','Safeguarding Training Expired','CONDITIONAL',3,true),
  ('SUPPORTED_LIVING','Learning & Development','Medication Training Expired','CONDITIONAL',4,true),
  ('SUPPORTED_LIVING','Learning & Development','Mandatory Training Expired','NONE',5,true),
  ('SUPPORTED_LIVING','Learning & Development','MCA/DoLS Training Expired','NONE',6,true),
  ('SUPPORTED_LIVING','Learning & Development','Competency Assessment Failed','CONDITIONAL',7,true),
  ('SUPPORTED_LIVING','Learning & Development','Clinical Competency Failed','IMMEDIATE',8,true),
  ('SUPPORTED_LIVING','Learning & Development','Bespoke Training Assigned','NONE',9,true),
  ('SUPPORTED_LIVING','Learning & Development','Certificate Uploaded','NONE',10,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','HR Compliance','DBS Due to Renew','NONE',1,true),
  ('SUPPORTED_LIVING','HR Compliance','DBS Expired','IMMEDIATE',2,true),
  ('SUPPORTED_LIVING','HR Compliance','DBS Not Obtained','IMMEDIATE',3,true),
  ('SUPPORTED_LIVING','HR Compliance','Right to Work Due','NONE',4,true),
  ('SUPPORTED_LIVING','HR Compliance','Right to Work Expired','IMMEDIATE',5,true),
  ('SUPPORTED_LIVING','HR Compliance','Visa Expiring Soon','CONDITIONAL',6,true),
  ('SUPPORTED_LIVING','HR Compliance','Professional Registration Expired','IMMEDIATE',7,true),
  ('SUPPORTED_LIVING','HR Compliance','Driving Licence Expired','CONDITIONAL',8,true),
  ('SUPPORTED_LIVING','HR Compliance','Insurance Expired','CONDITIONAL',9,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Governance & Compliance','Audit Due','NONE',1,true),
  ('SUPPORTED_LIVING','Governance & Compliance','Audit Overdue','NONE',2,true),
  ('SUPPORTED_LIVING','Governance & Compliance','Audit Failed','CONDITIONAL',3,true),
  ('SUPPORTED_LIVING','Governance & Compliance','Action Overdue','NONE',4,true),
  ('SUPPORTED_LIVING','Governance & Compliance','Escalation Overdue','NONE',5,true),
  ('SUPPORTED_LIVING','Governance & Compliance','High Risk Review Overdue','IMMEDIATE',6,true),
  ('SUPPORTED_LIVING','Governance & Compliance','Missing Risk Assessment','CONDITIONAL',7,true),
  ('SUPPORTED_LIVING','Governance & Compliance','Missing Support Plan','CONDITIONAL',8,true),
  ('SUPPORTED_LIVING','Governance & Compliance','Missing MAR','IMMEDIATE',9,true),
  ('SUPPORTED_LIVING','Governance & Compliance','Missing Daily Notes','NONE',10,true),
  ('SUPPORTED_LIVING','Governance & Compliance','SLA Breached','CONDITIONAL',11,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Quality Assurance & Audits','Medication Audit Failed','CONDITIONAL',1,true),
  ('SUPPORTED_LIVING','Quality Assurance & Audits','Infection Control Audit Failed','CONDITIONAL',2,true),
  ('SUPPORTED_LIVING','Quality Assurance & Audits','Health & Safety Audit Failed','CONDITIONAL',3,true),
  ('SUPPORTED_LIVING','Quality Assurance & Audits','Fire Audit Failed','CONDITIONAL',4,true),
  ('SUPPORTED_LIVING','Quality Assurance & Audits','Environmental Audit Failed','CONDITIONAL',5,true),
  ('SUPPORTED_LIVING','Quality Assurance & Audits','Finance Audit Failed','CONDITIONAL',6,true),
  ('SUPPORTED_LIVING','Quality Assurance & Audits','Governance Audit Failed','CONDITIONAL',7,true),
  ('SUPPORTED_LIVING','Quality Assurance & Audits','Repeated Audit Failure','IMMEDIATE',8,true),
  ('SUPPORTED_LIVING','Quality Assurance & Audits','Improvement Plan Created','NONE',9,true),
  ('SUPPORTED_LIVING','Quality Assurance & Audits','Improvement Completed','NONE',10,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Policies & Procedures','Policy Due for Review','NONE',1,true),
  ('SUPPORTED_LIVING','Policies & Procedures','Policy Review Overdue','NONE',2,true),
  ('SUPPORTED_LIVING','Policies & Procedures','Policy Updated','NONE',3,true),
  ('SUPPORTED_LIVING','Policies & Procedures','Staff Acknowledgement Outstanding','NONE',4,true),
  ('SUPPORTED_LIVING','Policies & Procedures','Mandatory Policy Not Read','NONE',5,true),
  ('SUPPORTED_LIVING','Policies & Procedures','Critical Policy Withdrawn','IMMEDIATE',6,true),
  ('SUPPORTED_LIVING','Policies & Procedures','Regulatory Guidance Updated','NONE',7,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Professional & External Agencies','GP Appointment Missed','NONE',1,true),
  ('SUPPORTED_LIVING','Professional & External Agencies','CPA Missed','NONE',2,true),
  ('SUPPORTED_LIVING','Professional & External Agencies','Psychiatric Review Missed','NONE',3,true),
  ('SUPPORTED_LIVING','Professional & External Agencies','Treatment Appointment','NONE',4,true),
  ('SUPPORTED_LIVING','Professional & External Agencies','Hospital Discharge','NONE',5,true),
  ('SUPPORTED_LIVING','Professional & External Agencies','CMHT Concern','NONE',6,true),
  ('SUPPORTED_LIVING','Professional & External Agencies','Care Coordinator Concern','CONDITIONAL',7,true),
  ('SUPPORTED_LIVING','Professional & External Agencies','Police Involvement','IMMEDIATE',8,true),
  ('SUPPORTED_LIVING','Professional & External Agencies','Safeguarding Referral','IMMEDIATE',9,true),
  ('SUPPORTED_LIVING','Professional & External Agencies','CQC Notification Required','IMMEDIATE',10,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Finance & Tenancy','Rent Arrears','NONE',1,true),
  ('SUPPORTED_LIVING','Finance & Tenancy','Benefit Issue','NONE',2,true),
  ('SUPPORTED_LIVING','Finance & Tenancy','Financial Abuse','IMMEDIATE',3,true),
  ('SUPPORTED_LIVING','Finance & Tenancy','Debts','NONE',4,true),
  ('SUPPORTED_LIVING','Finance & Tenancy','Poor Money Management','NONE',5,true),
  ('SUPPORTED_LIVING','Finance & Tenancy','Theft','IMMEDIATE',6,true),
  ('SUPPORTED_LIVING','Finance & Tenancy','Risk of Eviction','CONDITIONAL',7,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Recovery & Independence','Positive Engagement','NONE',1,true),
  ('SUPPORTED_LIVING','Recovery & Independence','Education Progress','NONE',2,true),
  ('SUPPORTED_LIVING','Recovery & Independence','Employment Progress','NONE',3,true),
  ('SUPPORTED_LIVING','Recovery & Independence','Community Participation','NONE',4,true),
  ('SUPPORTED_LIVING','Recovery & Independence','Independent Cooking','NONE',5,true),
  ('SUPPORTED_LIVING','Recovery & Independence','Independent Budgeting','NONE',6,true),
  ('SUPPORTED_LIVING','Recovery & Independence','Tenancy Maintained','NONE',7,true),
  ('SUPPORTED_LIVING','Recovery & Independence','Recovery Milestone','NONE',8,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Serious Incidents & Emergencies','Missing Person','IMMEDIATE',1,true),
  ('SUPPORTED_LIVING','Serious Incidents & Emergencies','Death of Resident','IMMEDIATE',2,true),
  ('SUPPORTED_LIVING','Serious Incidents & Emergencies','Death of Staff','IMMEDIATE',3,true),
  ('SUPPORTED_LIVING','Serious Incidents & Emergencies','Major Incident','IMMEDIATE',4,true),
  ('SUPPORTED_LIVING','Serious Incidents & Emergencies','Police Attendance','IMMEDIATE',5,true),
  ('SUPPORTED_LIVING','Serious Incidents & Emergencies','Ambulance Attendance','IMMEDIATE',6,true),
  ('SUPPORTED_LIVING','Serious Incidents & Emergencies','Fire Service Attendance','IMMEDIATE',7,true),
  ('SUPPORTED_LIVING','Serious Incidents & Emergencies','Serious Incident Declared','IMMEDIATE',8,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Attended planned community activity','NONE',1,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Missed planned activity','NONE',2,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Declined activity','NONE',3,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','New community activity identified','NONE',4,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Increased community participation','NONE',5,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Reduced community participation','NONE',6,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Complete social withdrawal','CONDITIONAL',7,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Began volunteering','NONE',8,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Started employment','NONE',9,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Lost employment','CONDITIONAL',10,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Started college or education','NONE',11,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Attendance at education declining','NONE',12,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Joined community group','NONE',13,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Attending faith community','NONE',14,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Maintaining friendships','NONE',15,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Relationship breakdown','CONDITIONAL',16,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Family contact improved','NONE',17,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Family contact reduced','NONE',18,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','No social contact for prolonged period','CONDITIONAL',19,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Community integration progressing','NONE',20,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Community integration deteriorating','NONE',21,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Difficulty accessing transport','NONE',22,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Refused all community access','CONDITIONAL',23,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Victim of anti-social behaviour','CONDITIONAL',24,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Community safety concern','IMMEDIATE',25,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Community discrimination experienced','CONDITIONAL',26,true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion','Community safeguarding concern','IMMEDIATE',27,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Community Living Skills','Shopping independently','NONE',1,true),
  ('SUPPORTED_LIVING','Community Living Skills','Using public transport','NONE',2,true),
  ('SUPPORTED_LIVING','Community Living Skills','Managing appointments','NONE',3,true),
  ('SUPPORTED_LIVING','Community Living Skills','Attending GP independently','NONE',4,true),
  ('SUPPORTED_LIVING','Community Living Skills','Managing finances independently','NONE',5,true),
  ('SUPPORTED_LIVING','Community Living Skills','Preparing meals','NONE',6,true),
  ('SUPPORTED_LIVING','Community Living Skills','Maintaining accommodation','NONE',7,true),
  ('SUPPORTED_LIVING','Community Living Skills','Developing new independent skills','NONE',8,true),
  ('SUPPORTED_LIVING','Community Living Skills','Loss of independence','CONDITIONAL',9,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Relationships & Natural Support Networks','Positive family contact','NONE',1,true),
  ('SUPPORTED_LIVING','Relationships & Natural Support Networks','Positive peer relationships','NONE',2,true),
  ('SUPPORTED_LIVING','Relationships & Natural Support Networks','New friendships developed','NONE',3,true),
  ('SUPPORTED_LIVING','Relationships & Natural Support Networks','Relationship conflict','CONDITIONAL',4,true),
  ('SUPPORTED_LIVING','Relationships & Natural Support Networks','Family safeguarding concern','IMMEDIATE',5,true),
  ('SUPPORTED_LIVING','Relationships & Natural Support Networks','Isolation increasing','NONE',6,true),
  ('SUPPORTED_LIVING','Relationships & Natural Support Networks','Support network strengthened','NONE',7,true),
  ('SUPPORTED_LIVING','Relationships & Natural Support Networks','Support network breaking down','CONDITIONAL',8,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Citizenship & Rights','Exercised personal choice','NONE',1,true),
  ('SUPPORTED_LIVING','Citizenship & Rights','Person-led decision making','NONE',2,true),
  ('SUPPORTED_LIVING','Citizenship & Rights','Advocacy requested','NONE',3,true),
  ('SUPPORTED_LIVING','Citizenship & Rights','Advocacy provided','NONE',4,true),
  ('SUPPORTED_LIVING','Citizenship & Rights','Voting supported','NONE',5,true),
  ('SUPPORTED_LIVING','Citizenship & Rights','Cultural needs met','NONE',6,true),
  ('SUPPORTED_LIVING','Citizenship & Rights','Religious needs supported','NONE',7,true),
  ('SUPPORTED_LIVING','Citizenship & Rights','Human rights concern','IMMEDIATE',8,true),
  ('SUPPORTED_LIVING','Citizenship & Rights','Restrictive practice identified','IMMEDIATE',9,true),
  ('SUPPORTED_LIVING','Citizenship & Rights','Least restrictive practice reviewed','NONE',10,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Organisational Culture','Staff wellbeing concern raised','NONE',1,true),
  ('SUPPORTED_LIVING','Organisational Culture','Staff morale declining','NONE',2,true),
  ('SUPPORTED_LIVING','Organisational Culture','Positive staff morale','NONE',3,true),
  ('SUPPORTED_LIVING','Organisational Culture','Staff recognition recorded','NONE',4,true),
  ('SUPPORTED_LIVING','Organisational Culture','Staff suggestion submitted','NONE',5,true),
  ('SUPPORTED_LIVING','Organisational Culture','Innovation implemented','NONE',6,true),
  ('SUPPORTED_LIVING','Organisational Culture','Speaking Up concern','CONDITIONAL',7,true),
  ('SUPPORTED_LIVING','Organisational Culture','Freedom to Speak Up concern','IMMEDIATE',8,true),
  ('SUPPORTED_LIVING','Organisational Culture','Whistleblowing allegation','IMMEDIATE',9,true),
  ('SUPPORTED_LIVING','Organisational Culture','Bullying allegation against staff','IMMEDIATE',10,true),
  ('SUPPORTED_LIVING','Organisational Culture','Harassment allegation','IMMEDIATE',11,true),
  ('SUPPORTED_LIVING','Organisational Culture','Leadership visibility concern','NONE',12,true),
  ('SUPPORTED_LIVING','Organisational Culture','Team conflict','CONDITIONAL',13,true),
  ('SUPPORTED_LIVING','Organisational Culture','High staff turnover identified','NONE',14,true),
  ('SUPPORTED_LIVING','Organisational Culture','High sickness trend','NONE',15,true),
  ('SUPPORTED_LIVING','Organisational Culture','Burnout indicators','NONE',16,true),
  ('SUPPORTED_LIVING','Organisational Culture','Poor communication identified','NONE',17,true),
  ('SUPPORTED_LIVING','Organisational Culture','Excellent practice recognised','NONE',18,true),
  ('SUPPORTED_LIVING','Organisational Culture','Learning shared across services','NONE',19,true),
  ('SUPPORTED_LIVING','Organisational Culture','Reflective practice completed','NONE',20,true),
  ('SUPPORTED_LIVING','Organisational Culture','Lessons learned implemented','NONE',21,true),
  ('SUPPORTED_LIVING','Organisational Culture','Organisational learning recorded','NONE',22,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Complaint received','CONDITIONAL',1,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Serious complaint','IMMEDIATE',2,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Compliment received','NONE',3,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Thank you received','NONE',4,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Suggestion made','NONE',5,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Client concern raised','CONDITIONAL',6,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Client feels unsafe','IMMEDIATE',7,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Client reports poor care','CONDITIONAL',8,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Client dissatisfied with support','NONE',9,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Client wishes to move service','CONDITIONAL',10,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Client involved in planning','NONE',11,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Client not involved in decisions','CONDITIONAL',12,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Advocacy requested','NONE',13,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Advocacy concern','CONDITIONAL',14,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Survey completed','NONE',14,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Survey negative trend','NONE',15,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Positive survey trend','NONE',16,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Family complaint','CONDITIONAL',17,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Family compliment','NONE',18,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Resident meeting outcome','NONE',19,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','House meeting concern','NONE',20,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Service improvement suggested','NONE',21,true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production','Co-production activity completed','NONE',22,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Organisational Learning','Learning identified','NONE',1,true),
  ('SUPPORTED_LIVING','Organisational Learning','Lesson shared','NONE',2,true),
  ('SUPPORTED_LIVING','Organisational Learning','Action implemented','NONE',3,true),
  ('SUPPORTED_LIVING','Organisational Learning','Repeat incident','NONE',4,true),
  ('SUPPORTED_LIVING','Organisational Learning','Repeat safeguarding concern','CONDITIONAL',5,true),
  ('SUPPORTED_LIVING','Organisational Learning','Repeat medication error','CONDITIONAL',6,true),
  ('SUPPORTED_LIVING','Organisational Learning','Repeat audit failure','CONDITIONAL',7,true),
  ('SUPPORTED_LIVING','Organisational Learning','Good practice shared','NONE',8,true),
  ('SUPPORTED_LIVING','Organisational Learning','New standard introduced','NONE',9,true),
  ('SUPPORTED_LIVING','Organisational Learning','Governance review completed','NONE',10,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO signal_library (sector, domain_name, signal_label, escalation, sort_order, is_active) VALUES
  ('SUPPORTED_LIVING','Strategic Governance','Strategic risk identified','NONE',1,true),
  ('SUPPORTED_LIVING','Strategic Governance','Emerging governance concern','NONE',2,true),
  ('SUPPORTED_LIVING','Strategic Governance','Regulatory change','NONE',3,true),
  ('SUPPORTED_LIVING','Strategic Governance','Commissioner feedback','NONE',4,true),
  ('SUPPORTED_LIVING','Strategic Governance','CQC correspondence','NONE',5,true),
  ('SUPPORTED_LIVING','Strategic Governance','Legal claim','NONE',6,true),
  ('SUPPORTED_LIVING','Strategic Governance','Insurance claim','NONE',7,true),
  ('SUPPORTED_LIVING','Strategic Governance','Financial sustainability concern','NONE',8,true),
  ('SUPPORTED_LIVING','Strategic Governance','Business continuity issue','NONE',9,true),
  ('SUPPORTED_LIVING','Strategic Governance','Cyber security concern','NONE',10,true),
  ('SUPPORTED_LIVING','Strategic Governance','Major reputation risk','NONE',11,true)
ON CONFLICT (sector, domain_name, signal_label) DO UPDATE SET escalation = EXCLUDED.escalation, sort_order = EXCLUDED.sort_order, is_active = true;

-- 5) Pattern thresholds (slow-path clustering) ------------------------------------
-- Positive/outcome themes get a high threshold so they don't form "risk" clusters.
INSERT INTO threshold_rules (sector, domain_name, trigger_signal_count, window_days, description, is_active) VALUES
  ('SUPPORTED_LIVING','Safeguarding & Protection',1,1,'Any safeguarding signal',true),
  ('SUPPORTED_LIVING','Mental Health & Wellbeing',3,14,'3 signals in 14 days',true),
  ('SUPPORTED_LIVING','Physical Health',2,14,'2 signals in 14 days',true),
  ('SUPPORTED_LIVING','Medication',3,14,'3 signals in 14 days',true),
  ('SUPPORTED_LIVING','Behaviour & Risk',3,14,'3 signals in 14 days',true),
  ('SUPPORTED_LIVING','Substance Misuse',2,14,'2 signals in 14 days',true),
  ('SUPPORTED_LIVING','Environment & Property',2,14,'2 signals in 14 days',true),
  ('SUPPORTED_LIVING','Workforce & Staffing',3,14,'3 signals in 14 days',true),
  ('SUPPORTED_LIVING','Workforce Assurance',3,30,'3 signals in 30 days',true),
  ('SUPPORTED_LIVING','Learning & Development',3,30,'3 signals in 30 days',true),
  ('SUPPORTED_LIVING','HR Compliance',3,30,'3 signals in 30 days',true),
  ('SUPPORTED_LIVING','Governance & Compliance',3,30,'3 signals in 30 days',true),
  ('SUPPORTED_LIVING','Quality Assurance & Audits',3,30,'3 signals in 30 days',true),
  ('SUPPORTED_LIVING','Policies & Procedures',3,60,'3 signals in 60 days',true),
  ('SUPPORTED_LIVING','Professional & External Agencies',3,30,'3 signals in 30 days',true),
  ('SUPPORTED_LIVING','Finance & Tenancy',3,30,'3 signals in 30 days',true),
  ('SUPPORTED_LIVING','Recovery & Independence',99,365,'Outcome theme — not a risk cluster',true),
  ('SUPPORTED_LIVING','Serious Incidents & Emergencies',1,1,'Any serious incident signal',true),
  ('SUPPORTED_LIVING','Community Engagement & Social Inclusion',3,30,'3 signals in 30 days',true),
  ('SUPPORTED_LIVING','Community Living Skills',99,365,'Outcome theme — not a risk cluster',true),
  ('SUPPORTED_LIVING','Relationships & Natural Support Networks',3,30,'3 signals in 30 days',true),
  ('SUPPORTED_LIVING','Citizenship & Rights',99,365,'Rights theme — not a risk cluster',true),
  ('SUPPORTED_LIVING','Organisational Culture',3,30,'3 signals in 30 days',true),
  ('SUPPORTED_LIVING','Voice, Experience & Co-production',3,30,'3 signals in 30 days',true),
  ('SUPPORTED_LIVING','Organisational Learning',3,60,'3 signals in 60 days',true),
  ('SUPPORTED_LIVING','Strategic Governance',3,90,'3 signals in 90 days',true)
ON CONFLICT (sector, domain_name) DO UPDATE
  SET trigger_signal_count = EXCLUDED.trigger_signal_count, window_days = EXCLUDED.window_days,
      description = EXCLUDED.description, is_active = true;

CREATE INDEX IF NOT EXISTS idx_signal_library_escalation ON signal_library(sector, domain_name, escalation, is_active);
CREATE INDEX IF NOT EXISTS idx_gp_signal_label ON governance_pulses(company_id, signal_label);

COMMIT;
