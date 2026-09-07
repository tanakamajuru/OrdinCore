import type {
  TeamLeaderDailyBriefModel,
  TeamLeaderPriority,
  TeamLeaderAction,
  TeamLeaderEscalation,
  BriefDecision,
  ActionTiming,
} from "./teamLeaderDailyBrief.types";

// Boundary type: the enriched daily-brief row returned by GET /governance/daily-log/team-briefs.
// The backend attaches the review's recorded decisions (priorities) and the service's currently
// active actions/escalations. This mapper is presentation-only — it never recalculates a
// governance decision or changes any lifecycle; it just shapes recorded data for display.
type BriefRow = {
  id: string;
  house_name?: string;
  review_date?: string;
  published_at?: string;
  prepared_by?: string | null;
  material_change?: boolean;
  team_brief?: string | null;
  priorities?: Array<{ id: string; decision?: string; title?: string; instruction?: string; owner?: string | null; dueLabel?: string | null; status?: string | null }>;
  actions?: Array<{ id: string; title?: string; owner?: string | null; dueDate?: string | null; completionEvidence?: string | null }>;
  escalations?: Array<{ id: string; title?: string; owner?: string | null; responseDue?: string | null }>;
  acknowledged?: boolean;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
};

const fmtDate = (v?: string | null): string => {
  if (!v) return "No date set";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "No date set" : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(d);
};

// Normalise the recorded governance decision to the three team-facing intents. Anything that is a
// closure/monitor-only variant maps accordingly; unrecognised values default to MONITOR so nothing
// is dropped silently. Returns null for decisions that should not appear as a live priority.
const normaliseDecision = (raw?: string, status?: string | null): BriefDecision | null => {
  const s = String(status || "").toLowerCase();
  if (s === "closed") return null;
  const d = String(raw || "").toLowerCase();
  if (d.includes("escalat")) return "ESCALATE";
  if (d.includes("action")) return "ACTION";
  if (d.includes("close")) return null;
  return "MONITOR";
};

const timingOf = (v?: string | null): ActionTiming => {
  if (!v) return "UPCOMING";
  const due = new Date(v);
  if (isNaN(due.getTime())) return "UPCOMING";
  const today = new Date();
  const d0 = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (d0 < t0) return "OVERDUE";
  if (d0 === t0) return "DUE_TODAY";
  return "UPCOMING";
};

export function mapDailyReviewToTeamLeaderBrief(b: BriefRow): TeamLeaderDailyBriefModel {
  const priorities: TeamLeaderPriority[] = (b.priorities ?? [])
    .map((p): TeamLeaderPriority | null => {
      const decision = normaliseDecision(p.decision, p.status);
      if (!decision) return null;
      return {
        id: p.id,
        decision,
        title: p.title || "Governance decision",
        instruction: p.instruction || "Continue monitoring and record any change.",
        owner: p.owner || "Unassigned",
        dueLabel: fmtDate(p.dueLabel),
      };
    })
    .filter((x): x is TeamLeaderPriority => x !== null);

  const actions: TeamLeaderAction[] = (b.actions ?? []).map((a) => ({
    id: a.id,
    title: a.title || "Action",
    owner: a.owner || "Unassigned",
    dueDate: fmtDate(a.dueDate),
    timing: timingOf(a.dueDate),
    completionEvidence: a.completionEvidence || undefined,
  }));

  const escalations: TeamLeaderEscalation[] = (b.escalations ?? []).map((e) => ({
    id: e.id,
    title: e.title || "Escalation",
    instruction: "Follow the recorded response; do not close or resolve — that stays with the Registered Manager.",
    owner: e.owner || undefined,
    responseDue: e.responseDue ? fmtDate(e.responseDue) : undefined,
  }));

  // "What the team needs to know" is the RM's published brief text, shown as discrete points.
  const teamNeedsToKnow = String(b.team_brief || "")
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean);

  return {
    id: b.id,
    serviceName: b.house_name || "Service",
    reviewDate: fmtDate(b.review_date),
    publishedAt: fmtDate(b.published_at),
    preparedBy: b.prepared_by || "Registered Manager",
    positionLabel: b.material_change ? "Priorities to action today" : "Routine oversight",
    teamNeedsToKnow,
    priorities,
    actions,
    escalations,
    acknowledgedAt: b.acknowledged ? (b.acknowledged_at || new Date().toISOString()) : null,
    acknowledgedBy: b.acknowledged_by || null,
  };
}
