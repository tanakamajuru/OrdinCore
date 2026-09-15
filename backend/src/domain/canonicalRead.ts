/** Canonical read-side vocabulary. Keep presentation labels separate from database lifecycle writes. */
export const CANONICAL_READ = {
  views: {
    houses: 'canonical_house_state_v',
    risks: 'canonical_risk_state_v',
    actions: 'canonical_action_state_v',
    escalations: 'canonical_escalation_state_v',
    patterns: 'canonical_pattern_state_v',
    obligations: 'canonical_review_obligation_state_v',
  },
  doctrine: 'READ_FROM_CANONICAL_PROJECTIONS_ONLY',
} as const;
