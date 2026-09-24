import { Confidence, SiteStatus } from '../domain/reporting.types';

// Governance & Evidence Confidence, and the site-status classification. Deterministic, so the
// same snapshot always yields the same figures.

export interface SiteMetrics {
  signals: number;
  high_critical: number;
  reviewed_signals: number;
  open_risks: number;
  critical_risks: number;
  open_escalations: number;
  overdue_escalations: number;
  open_actions: number;
  overdue_actions: number;
  completed_actions: number;
  completed_on_time: number;
  distinct_days: number;
  // Controls = effectiveness-bearing actions completed by the cut-off.
  controls_total: number;
  controls_effective: number;
  controls_unreviewed: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const confidenceService = {
  // How well the picture is being MANAGED (higher = more under control).
  governance(m: SiteMetrics): number {
    const reviewRate = m.signals ? m.reviewed_signals / m.signals : 1;
    const onTimeRate = m.completed_actions ? m.completed_on_time / m.completed_actions : 1;
    const escControl = m.open_escalations ? 1 - m.overdue_escalations / m.open_escalations : 1;
    const overduePenalty = m.open_actions ? m.overdue_actions / m.open_actions : 0;
    const criticalPenalty = m.critical_risks > 0 ? 0.25 : 0;
    const score = (0.30 * reviewRate + 0.30 * onTimeRate + 0.20 * escControl + 0.20 * (1 - overduePenalty)) - criticalPenalty;
    return clamp(score * 100);
  },

  // How much EVIDENCE stands behind the picture (volume + spread + rated effectiveness).
  evidence(m: SiteMetrics): number {
    const volume = Math.min(m.signals, 12) / 12;
    const spread = Math.min(m.distinct_days, 15) / 15;
    const rated = m.completed_actions ? Math.min(m.completed_actions, 6) / 6 : 0;
    return clamp((0.5 * volume + 0.3 * spread + 0.2 * rated) * 100);
  },

  status(m: SiteMetrics): SiteStatus {
    // CRITICAL is an evidence classification, not a workload alarm. An overdue item is
    // important, but cannot by itself upgrade the underlying concern to Critical.
    if (m.critical_risks > 0) return 'CRITICAL';
    if (m.high_critical > 0 || m.open_escalations > 0 || m.overdue_actions > 0) return 'ATTENTION';
    return 'STABLE';
  },

  // Control Assurance (doctrine §7.9): of the effectiveness-bearing controls completed, how many
  // carry a FINAL Effective judgement. A control that merely exists — or is completed but not yet
  // effectiveness-reviewed — is NOT assured. Null when there are no controls to assure (so the
  // absence of controls never reads as high assurance).
  controlAssurance(m: SiteMetrics): number | null {
    if (!m.controls_total) return null;
    return clamp((m.controls_effective / m.controls_total) * 100);
  },

  // Evidence Coverage is the volume/spread measure (renamed from "evidence").
  evidenceCoverage(m: SiteMetrics): number {
    return this.evidence(m);
  },

  confidenceObject(m: SiteMetrics): Confidence {
    const controlAssurance = this.controlAssurance(m);
    return {
      governance: this.governance(m),
      evidence: this.evidence(m),
      evidence_coverage: this.evidenceCoverage(m),
      control_assurance: controlAssurance,
      basis: `${m.signals} signal(s) over ${m.distinct_days} day(s); evidence coverage ${this.evidenceCoverage(m)}%; control assurance ${controlAssurance === null ? 'n/a (no controls)' : controlAssurance + '%'} (${m.controls_effective}/${m.controls_total} controls finally Effective, ${m.controls_unreviewed} unreviewed); ${m.critical_risks} critical risk(s).`,
    };
  },
};
