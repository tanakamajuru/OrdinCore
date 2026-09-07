export type BriefDecision = "MONITOR" | "ACTION" | "ESCALATE";
export type ActionTiming = "OVERDUE" | "DUE_TODAY" | "UPCOMING";

export interface TeamLeaderPriority {
  id: string;
  decision: BriefDecision;
  title: string;
  instruction: string;
  personSupported?: string;
  owner: string;
  dueLabel: string;
  reportSoonerIf?: string;
}

export interface TeamLeaderAction {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  timing: ActionTiming;
  completionEvidence?: string;
}

export interface TeamLeaderEscalation {
  id: string;
  title: string;
  instruction: string;
  owner?: string;
  responseDue?: string;
}

export interface TeamLeaderDailyBriefModel {
  id: string;
  serviceName: string;
  reviewDate: string;
  publishedAt: string;
  preparedBy: string;
  positionLabel: string;
  teamNeedsToKnow: string[];
  priorities: TeamLeaderPriority[];
  actions: TeamLeaderAction[];
  escalations: TeamLeaderEscalation[];
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
}

