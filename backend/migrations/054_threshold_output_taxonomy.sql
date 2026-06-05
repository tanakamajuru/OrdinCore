-- Migration 054: Standardise threshold output taxonomy (review #4/#5)
-- Canonical set:
--   Signal Flag            - watch pattern
--   Risk Review Required   - RM must review
--   Mandatory Review       - urgent governance decision
--   Control Failure        - recurrence after closure
--   System-Level Risk Flag - director/RI attention (cross-service)
-- 'Signal Flag','Risk Proposal','Mandatory Review','Risk Review Required',
-- 'Control Failure' already exist (migrations 021, 035). The code previously
-- wrote 'Immediate Alert'/'Immediate Risk' which were never valid enum labels
-- (those inserts failed at runtime); the worker now emits canonical values.
-- This adds the remaining canonical label.

ALTER TYPE threshold_output_type ADD VALUE IF NOT EXISTS 'System-Level Risk Flag';
