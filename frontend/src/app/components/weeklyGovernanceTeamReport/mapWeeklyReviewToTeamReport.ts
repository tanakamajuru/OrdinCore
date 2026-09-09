import type {
  WeeklyGovernanceTeamReportModel,
  Trajectory,
  MeasureStatus,
  MajorIssue,
  GovernanceMeasure,
} from "./weeklyGovernanceTeamReport.types";

// Boundary type: the published weekly-review row from GET /weekly-reviews/:id, enriched by the
// backend with `team_report` (signals-by-domain, the week's daily team briefs, active measures —
// all read from records already published in the week). This mapper is presentation-only: it does
// not recalculate a governance decision, and it never invents a trajectory or conclusion.
type ReviewRow = any;

const fmtDate = (v?: any): string => {
  if (!v) return "Not recorded";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "Not recorded" : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(d);
};
const weekStartOf = (weekEnding?: any): Date | null => {
  if (!weekEnding) return null;
  const d = new Date(weekEnding);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - 6);
  return d;
};

const normTraj = (v?: any): Trajectory => {
  const s = String(v || "").toUpperCase();
  if (s.includes("DETERIOR")) return "DETERIORATING";
  if (s.includes("IMPROV")) return "IMPROVING";
  if (s.includes("STAB")) return "STABLE";
  return "NOT_ASSESSED";
};
// Roll the week-end direction up from the recorded domain trajectories only (never invented).
const rollupTrajectory = (groups: any[]): Trajectory => {
  const t = groups.map((g) => normTraj(g.trajectory));
  if (t.includes("DETERIORATING")) return "DETERIORATING";
  if (t.includes("IMPROVING")) return "IMPROVING";
  if (t.includes("STABLE")) return "STABLE";
  return "NOT_ASSESSED";
};

const isOverdue = (v?: any): boolean => {
  if (!v) return false;
  const d = new Date(v);
  return !isNaN(d.getTime()) && d.getTime() < new Date(new Date().toDateString()).getTime();
};

export function mapWeeklyReviewToTeamReport(review: ReviewRow): WeeklyGovernanceTeamReportModel {
  const tr = review?.team_report || {};
  const content = review?.content || {};
  const groups: any[] = tr.domain_groups || [];
  const weekStart = weekStartOf(review?.week_ending);
  const periodLabel = weekStart
    ? `${fmtDate(weekStart)} to ${fmtDate(review?.week_ending)}`
    : fmtDate(review?.week_ending);

  const measures: GovernanceMeasure[] = (tr.measures || []).map((m: any): GovernanceMeasure => {
    const due = m.effectiveness_review_date || m.due_date;
    const status: MeasureStatus = isOverdue(m.due_date) ? "OVERDUE" : "OPEN";
    return {
      id: m.id,
      area: m.area || "Governance",
      measure: m.measure || "Measure",
      owner: m.owner || "Unassigned",
      dueOrReview: fmtDate(due),
      status,
      evidenceExpected: m.evidence_expected || undefined,
      carriedForward: Boolean(m.created_at && weekStart && new Date(m.created_at).getTime() < weekStart.getTime()),
    };
  });

  const measureFor = (domain: string) => measures.find((m) => m.area === domain);

  const majorIssues: MajorIssue[] = groups
    .filter((g: any) => (g.high_critical || 0) > 0 || (g.signal_count || 0) >= 2)
    .map((g: any): MajorIssue => {
      const m = measureFor(g.domain);
      const traj = normTraj(g.trajectory);
      return {
        id: g.domain,
        domain: g.domain,
        signalCount: g.signal_count || 0,
        trajectory: traj,
        known: `${g.signal_count || 0} signal(s) recorded${g.high_critical ? `, ${g.high_critical} high/critical` : ""} this week.`,
        actionTaken: m ? `${m.measure} (owner ${m.owner}).` : "No linked measure was recorded for this domain.",
        currentPosition: traj === "NOT_ASSESSED"
          ? "Current position not assessed — requires management confirmation."
          : `Recorded trajectory: ${traj.toLowerCase()}. Stable/improving is not, by itself, evidence of resolution.`,
        stillRequired: "State the specific concern, the control in place, its deadline and the evidence required before closure.",
      };
    });

  // Learning + next week come from the recorded review fields (free text), split into points.
  const lessonsText = String(content.lessons_learnt || review?.lessons_learnt || "");
  const learning = lessonsText
    .split(/\r?\n+/).map((l) => l.replace(/^[\s•\-*]+/, "").trim()).filter(Boolean)
    .map((lesson) => ({ lesson, implication: "" }));

  const antItems: any[] = content.anticipated_risks?.items || [];
  const nextWeek = antItems.map((a: any) => ({ priority: a.theme || "Priority", expectation: a.reason || "" }))
    .filter((x: any) => x.priority || x.expectation);

  // Evidence gaps — surfaced honestly, never converted into reassurance.
  const evidenceGaps: string[] = [];
  if ((tr.high_critical || 0) > 0) {
    const covered = groups.some((g) => (g.high_critical || 0) > 0 && measureFor(g.domain));
    if (!covered) evidenceGaps.push("A high/critical signal was recorded but is not yet linked to an active measure with owner and evidence.");
  }
  groups.filter((g) => (g.signal_count || 0) > 0 && normTraj(g.trajectory) === "NOT_ASSESSED")
    .forEach((g) => evidenceGaps.push(`No recorded trajectory for ${g.domain} — direction requires confirmation.`));
  measures.filter((m) => !m.evidenceExpected)
    .slice(0, 2)
    .forEach((m) => evidenceGaps.push(`No completion evidence recorded yet for: ${m.measure}.`));

  return {
    id: review?.id,
    serviceName: review?.house_name || "Service",
    periodLabel,
    publishedAt: fmtDate(review?.published_at),
    publishedBy: tr.prepared_by || review?.created_by_name || "Registered Manager",
    signalsReviewed: tr.signals_reviewed || 0,
    highOrCritical: tr.high_critical || 0,
    mainDomainCount: tr.main_domain_count || 0,
    weekEndTrajectory: rollupTrajectory(groups),
    overview: String(content.step15_narrative || content.step14_overall_position || review?.governance_narrative || "This report is drawn from the governance record for the week; see the sections below.").trim(),
    collectiveDailyBriefSummary: tr.collective_daily_brief_summary || content.collective_daily_brief_summary || null,
    events: (tr.events || []).map((e: any, i: number) => {
      const summary = String(e.summary || "").trim();
      const headline = String(e.headline || summary.split(/\r?\n/).map((x: string) => x.trim()).find(Boolean) || "").trim();
      const iso = e.date ? new Date(e.date).toISOString().slice(0, 10) : "";
      return { id: String(i), dateLabel: fmtDate(e.date), headline, summary, date: iso, theme: String(e.theme || "").trim() };
    }).filter((e: any) => e.headline || e.summary),
    majorIssues,
    measures,
    unresolvedConcerns: String(content.unresolved_concerns_text || "").split(/\r?\n+/).map((x) => x.replace(/^[\s•\-*]+/, "").trim()).filter(Boolean),
    learning,
    nextWeek,
    evidenceGaps: [...evidenceGaps, ...(tr.evidence_gaps || [])],
    acknowledgedAt: null,
    acknowledgedBy: null,
  };
}
