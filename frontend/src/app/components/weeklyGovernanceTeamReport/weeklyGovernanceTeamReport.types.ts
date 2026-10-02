export type Trajectory = "DETERIORATING" | "STABLE" | "IMPROVING" | "NOT_ASSESSED";
export type MeasureStatus = "OPEN" | "MONITORING" | "OVERDUE" | "COMPLETED_PENDING_REVIEW";

export interface WeekEvent {
  id: string;
  dateLabel: string;
  /** Concise one-line source entry shown in the report (the full brief lives in Daily Governance). */
  headline: string;
  /** Full brief text, retained for reconstruction. */
  summary: string;
  /** ISO date (yyyy-mm-dd) for date-range filtering. */
  date: string;
  /** Governance domain/theme for theme filtering. */
  theme: string;
  signals?: Array<{ id:string; person?:string|null; domain?:string|null; description:string; severity?:string|null; reviewStatus?:string|null; decision?:string|null; decisionId?:string|null;
    // Full decision substance so the report explains the decision, not just its label (briefs R1–R3).
    concern?:string|null; rationale?:string|null; intendedOutcome?:string|null; decisionEvidence?:string|null; reviewer?:string|null; decidedAt?:string|null; followUpDue?:string|null }>;
}

export interface MajorIssue {
  id: string;
  domain: string;
  signalCount: number;
  trajectory: Trajectory;
  known: string;
  actionTaken: string;
  currentPosition: string;
  stillRequired?: string;
}

export interface GovernanceMeasure {
  id: string;
  area: string;
  measure: string;
  owner: string;
  dueOrReview: string;
  status: MeasureStatus;
  evidenceExpected?: string;
  carriedForward: boolean;
}

export interface WeeklyGovernanceTeamReportModel {
  id: string;
  serviceName: string;
  periodLabel: string;
  publishedAt: string;
  publishedBy: string;
  signalsReviewed: number;
  highOrCritical: number;
  mainDomainCount: number;
  weekEndTrajectory: Trajectory;
  overview: string;
  collectiveDailyBriefSummary?: string | null;
  events: WeekEvent[];
  majorIssues: MajorIssue[];
  measures: GovernanceMeasure[];
  // Escalation monitoring reviews recorded in the week — full snapshot per event (monitoring §4).
  monitoringReviews: Array<{ id: string; concern?: string | null; note?: string | null; reviewedBy?: string | null; reviewedAt?: string | null; owner?: string | null; evidenceToObserve?: string | null; trigger?: string | null; nextReview?: string | null }>;
  // Active leadership interventions (improvement plans) with derived delivery evidence (intervention §4).
  leadershipInterventions: Array<{ id: string; theme?: string | null; plan?: string | null; status?: string | null; owner?: string | null; expectedOutcome?: string | null; nextReview?: string | null; orgWide?: boolean; actionsTotal: number; actionsCompleted: number; effectiveness: string }>;
  unresolvedConcerns: string[];
  learning: Array<{ lesson: string; implication: string }>;
  nextWeek: Array<{ priority: string; expectation: string }>;
  evidenceGaps: string[];
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
}

