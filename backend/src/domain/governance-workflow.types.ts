/**
 * Frozen Governance Architecture v1 — canonical workflow types (doctrine Chapter 10).
 * The architecture is frozen: no new workflow stages or governance objects. These types
 * name the existing objects' governance semantics so the whole codebase speaks one
 * vocabulary. Nothing here creates a parallel system.
 */

// A leadership decision recorded during a governance review (governance_reviews.decision).
export type GovernanceDecision =
  | 'Monitor'
  | 'Create Action'
  | 'Escalate'
  | 'Close'
  | 'Reopen';

// The lifecycle of a governance decision (governance_reviews.decision_status).
export type GovernanceDecisionStatus =
  | 'Open'
  | 'In Progress'
  | 'Completed'
  | 'Monitoring'
  | 'Superseded'
  | 'Closed';

// Pattern scope classification (signal_clusters.scope) — the SAME pattern object scales
// from an individual to a systemic, cross-service concern. 'cross_service' is a Systemic
// Governance Pattern (SGP).
export type PatternScope = 'person' | 'house' | 'service' | 'cross_service';

// The outcome of a Pattern Review (signal_clusters.review_outcome).
export type PatternReviewOutcome =
  | 'Continue Monitoring'
  | 'Improving'
  | 'Stable'
  | 'Deteriorating'
  | 'Promote to Risk'
  | 'Escalate'
  | 'Close';

// Governance ownership by authority (not job title) — who may act at each stage.
// Small and large providers map these to their own structure.
export type GovernanceAuthority =
  | 'OPERATIONAL'   // Team Leader — signal review, immediate actions, local patterns
  | 'MANAGEMENT'    // Registered Manager — decisions, risks, escalations, closures
  | 'STRATEGIC'     // RM / Director / Regional — systemic (cross-service) patterns
  | 'ASSURANCE';    // Responsible Individual — independent assurance

// Every later record links back to the signal that is the permanent evidence origin.
export interface GovernanceSource {
  pulseEntryId?: string;
  clusterId?: string;
  riskId?: string;
  escalationId?: string;
  dailyGovernanceLogId?: string;
}

export const PATTERN_SCOPE_LABEL: Record<PatternScope, string> = {
  person: 'Individual',
  house: 'House',
  service: 'Service',
  cross_service: 'Cross-Service (Systemic)',
};
