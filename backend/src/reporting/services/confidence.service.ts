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
  // B2 correction (21 Oct 2026): fields the status rule previously ignored entirely.
  controls_ineffective: number;   // final Partially Effective / Not Effective judgement
  overdue_monitoring: number;     // active Monitor decisions whose review point has passed
  urgent_unpromoted: number;      // Escalated/Confirmed patterns with no risk promoted yet
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
    // B2 correction (21 Oct 2026): "Revise the rule to expose urgent unpromoted concerns,
    // ineffective controls and unresolved monitoring" -- a service could previously show STABLE
    // with zero open escalations/overdue actions while carrying Not Effective control ratings, an
    // overdue monitoring review, or a confirmed cross-service pattern nobody had promoted to a
    // risk yet. None of those moved the status at all before this.
    if (m.high_critical > 0 || m.open_escalations > 0 || m.overdue_actions > 0
        || m.controls_ineffective > 0 || m.overdue_monitoring > 0 || m.urgent_unpromoted > 0) return 'ATTENTION';
    return 'STABLE';
  },

  // B2 correction: a period with no recorded signals and no completed/open work is silence, not
  // assurance -- every ratio above defaults to 1 on a 0/0 division, which previously read as a
  // full 100% governance/evidence score. Distinguish that explicitly.
  assuranceLabel(m: SiteMetrics): 'Assured' | 'Limited assurance' | 'Insufficient evidence' {
    const hasAnyEvidence = m.signals > 0 || m.completed_actions > 0 || m.open_actions > 0 || m.open_escalations > 0;
    if (!hasAnyEvidence) return 'Insufficient evidence';
    if (m.critical_risks > 0 || m.controls_ineffective > 0 || m.overdue_monitoring > 0 || m.urgent_unpromoted > 0) return 'Limited assurance';
    return 'Assured';
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
    // B2 correction: "Label process metrics and evidence coverage accurately: record volume/
    // spread are not evidence quality, safety or integrity." evidence_coverage measures how much
    // was recorded and how often, not whether it was correct, safe or complete -- the basis text
    // says that explicitly rather than implying coverage is a quality/safety measure.
    return {
      governance: this.governance(m),
      evidence: this.evidence(m),
      evidence_coverage: this.evidenceCoverage(m),
      control_assurance: controlAssurance,
      assurance_label: this.assuranceLabel(m),
      basis: `${m.signals} signal(s) over ${m.distinct_days} day(s) -- recorded volume/spread, not a measure of evidence quality, safety or integrity. Control assurance ${controlAssurance === null ? 'n/a (no controls)' : controlAssurance + '%'} (${m.controls_effective}/${m.controls_total} controls finally Effective, ${m.controls_ineffective} Partially/Not Effective, ${m.controls_unreviewed} unreviewed). ${m.critical_risks} critical risk(s), ${m.overdue_monitoring} overdue monitoring review(s), ${m.urgent_unpromoted} unpromoted concern(s) with confirmed/escalated evidence.`,
    };
  },
};
