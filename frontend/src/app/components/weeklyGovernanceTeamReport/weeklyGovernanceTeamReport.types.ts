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
  unresolvedConcerns: string[];
  learning: Array<{ lesson: string; implication: string }>;
  nextWeek: Array<{ priority: string; expectation: string }>;
  evidenceGaps: string[];
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
}

