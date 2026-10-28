import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { isOpenRisk } from "@/lib/governanceStatus";
import {
  Shield, Flag, Clock, ClipboardCheck, TrendingUp, Users,
  ArrowUpRight, ArrowDownRight, Minus, Download, CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { apiClient } from "@/services/api";
import { isOpenEscalation } from "@/lib/governanceStatus";
import { useCanonicalEvidenceSummary } from '@/hooks/useCanonicalEvidenceSummary';
import { CanonicalEvidenceStrip } from './canonical/CanonicalEvidenceStrip';

const unwrap = (res: any): any => res?.data?.data ?? res?.data ?? [];
const asArray = (v: any): any[] => (Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : []);

const isRising = (t: string) => ["Rising", "Deteriorating", "Critical"].includes(t);

function StatCard({ icon: Icon, label, value, tone, footer }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold mt-1 text-foreground">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${tone}`}><Icon className="w-5 h-5" /></div>
      </div>
      {footer && <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">{footer}</div>}
    </div>
  );
}

function Donut({ data, centerLabel }: { data: { name: string; value: number; color: string }[]; centerLabel?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={total ? data : [{ name: "None", value: 1, color: "#e5e7eb" }]} dataKey="value" innerRadius={42} outerRadius={60} paddingAngle={2}>
              {(total ? data : [{ color: "#e5e7eb" }]).map((d: any, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold">{centerLabel ?? total}</span>
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-muted-foreground flex-1">{d.name}</span>
            <span className="font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatCell({ trend, riskCount }: { trend?: string; riskCount?: number }) {
  if (!trend) return <td className="p-2 text-center"><span className="inline-block w-6 h-6 rounded bg-muted" title="No open risk for this service and theme" /></td>;
  const cfg = isRising(trend)
    ? { bg: "bg-red-500", icon: <ArrowUpRight className="w-4 h-4 text-white" />, word: "Rising — the worst-trending open risk in this cell is deteriorating" }
    : trend === "Improving"
      ? { bg: "bg-emerald-500", icon: <ArrowDownRight className="w-4 h-4 text-white" />, word: "Improving — every open risk in this cell is improving" }
      : { bg: "bg-amber-500", icon: <Minus className="w-4 h-4 text-white" />, word: "Stable — no deteriorating or fully-improving signal yet" };
  const title = `${cfg.word}${riskCount ? ` · ${riskCount} open risk${riskCount === 1 ? "" : "s"}` : ""}`;
  return <td className="p-2 text-center"><span className={`inline-flex items-center justify-center w-7 h-7 rounded ${cfg.bg}`} title={title}>{cfg.icon}</span></td>;
}

const IMPACT_TONE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700", High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700", Low: "bg-emerald-100 text-emerald-700",
  Unrated: "bg-muted text-muted-foreground",
};

function ServiceMetric({ label, value, tone, onClick, title }: { label: string; value: string | number; tone?: string; onClick?: () => void; title?: string }) {
  const content = (
    <>
      <div className={`text-lg font-semibold ${tone || "text-foreground"}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
    </>
  );
  return onClick
    ? <button onClick={onClick} title={title} className="text-left rounded-lg p-2 hover:bg-muted/60 transition-colors">{content}</button>
    : <div title={title} className="rounded-lg p-2">{content}</div>;
}

// 26 Oct developer requirements, "Services Overview — Accuracy and presentation". Server-computed
// (directorInsightsService.servicesOverview) so the counts cannot be skewed by the dashboard's
// own /risks?limit=200 cap, and every count stays its own separate figure — never summed into one
// risk score — so "0 risks" and "2 overdue actions on an otherwise-closed theme" can both be true
// and both be shown, rather than one implying the other.
function ServicesOverview({ navigate }: { navigate: (path: string) => void }) {
  const [state, setState] = useState<"loading" | "unavailable" | "ready">("loading");
  const [overview, setOverview] = useState<any>(null);

  const load = async () => {
    setState("loading");
    try {
      const res: any = await apiClient.get("/director/services-overview");
      setOverview(unwrap(res));
      setState("ready");
    } catch {
      setState("unavailable");
    }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm mt-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold">Services Overview</h3>
        <div className="flex items-center gap-3">
          {state === "ready" && overview?.generated_at && (
            <span className="text-[11px] text-muted-foreground">Updated {new Date(overview.generated_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
          )}
          <button onClick={load} className="text-[11px] text-primary hover:underline">Refresh</button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">A factual summary per service — not an overall safety rating. Each count opens the records behind it.</p>

      {state === "loading" && <p className="text-sm text-muted-foreground py-8 text-center">Loading services overview…</p>}
      {state === "unavailable" && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <span>Services Overview unavailable — risk counts, ratings and trajectory could not be loaded. This is not confirmation of zero risk.</span>
          <button onClick={load} className="text-xs font-semibold underline shrink-0 ml-3">Retry</button>
        </div>
      )}
      {state === "ready" && (
        <>
          {(overview?.organisation_wide?.open_risks > 0 || overview?.organisation_wide?.pending_decisions > 0) && (
            <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-2">
              {overview.organisation_wide.open_risks > 0 && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">Organisation-wide risk{overview.organisation_wide.open_risks === 1 ? "" : "s"} with unspecified service allocation</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{overview.organisation_wide.open_risks} active risk{overview.organisation_wide.open_risks === 1 ? "" : "s"} shown separately — not assigned to every service.</p>
                  </div>
                  <button onClick={() => navigate("/risk-register?tab=strategic")} className="text-xs font-semibold text-primary hover:underline shrink-0">View →</button>
                </div>
              )}
              {/* 27 Oct: unallocated obligations shown separately rather than silently dropped. */}
              {overview.organisation_wide.pending_decisions > 0 && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">Promotion decisions with unspecified service allocation</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{overview.organisation_wide.pending_decisions} pending{overview.organisation_wide.pending_overdue > 0 ? ` (${overview.organisation_wide.pending_overdue} overdue)` : ""}.</p>
                  </div>
                  <button onClick={() => navigate("/rm5?stage=patterns")} className="text-xs font-semibold text-primary hover:underline shrink-0">View →</button>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(overview?.services || []).map((s: any) => (
              <div key={s.id} className="border border-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{s.name}</span>
                  <button onClick={() => navigate(`/risk-register?tab=closed&house=${s.id}`)} className="text-[11px] text-primary hover:underline">View risk history →</button>
                </div>
                {s.open_risks === 0 && (
                  <p className="text-[11px] text-muted-foreground mb-2">No open registered risks{(s.pending_decisions > 0 || s.overdue_actions > 0 || s.overdue_reviews > 0) ? " — outstanding work remains below." : "."}</p>
                )}
                {(() => {
                  // 27 Oct developer review: the register filters strictly by risk.house_id, but
                  // this count also includes a cross-service risk with no house_id, expanded in
                  // via its linked signals -- a plain ?house= drill-down would silently miss it.
                  // Pass the exact counted risk IDs so the destination opens precisely what was
                  // counted, falling back to the house filter only if IDs weren't returned.
                  const ids: string[] = Array.isArray(s.open_risk_ids) ? s.open_risk_ids : [];
                  const openRiskDest = ids.length ? `/risk-register?tab=active&ids=${ids.join(",")}` : `/risk-register?tab=active&house=${s.id}`;
                  return (
                    <div className="grid grid-cols-3 gap-1">
                      <ServiceMetric label="Open risks" value={s.open_risks} onClick={() => navigate(openRiskDest)} title="Distinct active risks affecting this service" />
                      <ServiceMetric label="Highest rating" value={s.highest_rating} tone={IMPACT_TONE[s.highest_rating] ? "" : undefined} title="Highest recorded risk rating among this service's open risks" onClick={s.open_risks ? () => navigate(openRiskDest) : undefined} />
                  {/* 27 Oct developer instructions ("Finish validation of the new Services
                      Overview"): a trajectory read that failed is shown as its own "unavailable"
                      state rather than silently counting toward a confident "0 deteriorating". */}
                      <ServiceMetric label="Deteriorating" value={s.trajectory_unavailable > 0 ? `${s.deteriorating} (+${s.trajectory_unavailable} unavailable)` : s.deteriorating} tone={s.deteriorating > 0 ? "text-red-600" : s.trajectory_unavailable > 0 ? "text-amber-600" : undefined} onClick={() => navigate(`${openRiskDest}&trend=Deteriorating`)} title={`Authoritative trajectory: risks currently deteriorating${s.trajectory_unavailable ? `. ${s.trajectory_unavailable} risk(s) could not be assessed — not counted as stable.` : ''}`} />
                      <ServiceMetric label="Promotions pending" value={s.pending_overdue > 0 ? `${s.pending_decisions} (${s.pending_overdue} overdue)` : s.pending_decisions} tone={s.pending_overdue > 0 ? "text-red-600" : s.pending_decisions > 0 ? "text-amber-600" : undefined} onClick={() => navigate(`/rm5?stage=patterns&house=${s.id}`)} title="Concerns awaiting an RM promotion decision for this service" />
                      <ServiceMetric label="Overdue actions" value={s.overdue_actions} tone={s.overdue_actions > 0 ? "text-red-600" : undefined} onClick={() => navigate(`/governance-compliance?house=${s.id}`)} title="Outstanding follow-through past its due date, including work remaining after risk closure (staff assigned to this service)" />
                      <ServiceMetric label="Overdue reviews" value={s.overdue_reviews} tone={s.overdue_reviews > 0 ? "text-red-600" : undefined} onClick={() => navigate(`/effectiveness?house=${s.id}&overdue=1`)} title="Effectiveness reviews past their due date" />
                    </div>
                  );
                })()}
              </div>
            ))}
            {(!overview?.services || overview.services.length === 0) && <p className="text-xs text-muted-foreground py-6 text-center col-span-2">No services</p>}
          </div>
        </>
      )}
    </div>
  );
}

export function DirectorDashboard() {
  const {data:evidenceSummary}=useCanonicalEvidenceSummary();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [escStats, setEscStats] = useState<any>({});
  const [actions, setActions] = useState<any[]>([]);
  const [effectivenessSummary, setEffectivenessSummary] = useState<any>({});
  const [, setEffPending] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [escPage, setEscPage] = useState(1);
  const [, setHealth] = useState<any>(null);
  const [themeTrends, setThemeTrends] = useState<any[]>([]);
  const [riskTrend, setRiskTrend] = useState<{ deteriorating: number; stable: number; improving: number; total: number } | null>(null);
  const [weeklyAgeing, setWeeklyAgeing] = useState<{ overdue: number; missedThisMonth: number } | null>(null);
  // Authoritative org-wide counts over the full dataset (not the capped lists) so headline tiles
  // reconcile with mobile and are never truncated. Falls back to list counts if unavailable.
  const [reportMetrics, setReportMetrics] = useState<any>(null);

  useEffect(() => { apiClient.get("/interventions/governance-health").then((r: any) => setHealth(r?.data ?? null)).catch(() => setHealth(null)); }, []);
  useEffect(() => { apiClient.get("/interventions/themes").then((r: any) => setThemeTrends(Array.isArray(r?.data) ? r.data : [])).catch(() => setThemeTrends([])); }, []);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const end = new Date().toISOString();
      const start = new Date(Date.now() - 30 * 86400000).toISOString();
      const [rk, esc, st, act, eff, hs, hm, effSummary, age, rs, rbt] = await Promise.all([
        apiClient.get(`/risks?limit=200`).catch(() => ({})),
        apiClient.getEscalations(1, 200).catch(() => ({})),
        apiClient.getEscalationStats().catch(() => ({})),
        apiClient.getRisksActions().catch(() => ({})),
        apiClient.getPendingEffectiveness().catch(() => ({})),
        apiClient.get(`/houses?limit=100`).catch(() => ({})),
        apiClient.getCrossSiteHeatmap().catch(() => ({})),
        apiClient.get(`/actions/effectiveness-summary?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`).catch(() => ({})),
        apiClient.get(`/weekly-reviews/ageing`).catch(() => ({})),
        apiClient.get(`/reports/summary`).catch(() => ({})),
        apiClient.getRisksByTrend().catch(() => ({})),
      ]);
      setRisks(asArray(unwrap(rk)));
      setEscalations(asArray(unwrap(esc)));
      setEscStats(unwrap(st) || {});
      setActions(asArray(unwrap(act)));
      setEffPending(asArray(unwrap(eff)));
      setServices(asArray(unwrap(hs)));
      setHeatmap(asArray(unwrap(hm)));
      setEffectivenessSummary(unwrap(effSummary)?.org_summary || {});
      setWeeklyAgeing(unwrap(age) || null);
      { const s = unwrap(rs); setReportMetrics(s && !Array.isArray(s) ? (s.metrics || null) : null); }
      { const t = unwrap(rbt); setRiskTrend(t && !Array.isArray(t) ? t : null); }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load director dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" /><span>Loading dashboard…</span>
    </div>
  );

  const openRisks = risks.filter(isOpenRisk);
  // A risk's theme is its governance domain (risk_domain may be a text[] — take the first),
  // falling back to an explicit strategic theme, then the title. Grouping by this makes the
  // panel aggregate real themes rather than one bucket per unique risk title.
  const themeOf = (r: any) => {
    const d = r.risk_domain;
    const domain = Array.isArray(d) ? d[0] : d;
    return (r.strategic_theme || domain || r.title || "").toString().trim();
  };
  // Trajectory SSOT: authoritative direction first, legacy trend only as last resort.
  const trendOf = (r: any) => r.trajectory_direction || r.trajectory || r.trend || "Stable";
  // Risks by Trend reads the authoritative, full-dataset /director/risks-by-trend
  // breakdown (same trajectoryForRisk engine the heat map uses) so it can't disagree
  // with the heat map and can't be skewed by the capped (limit=200) risk list. Falls
  // back to the capped client computation only if that endpoint is unavailable.
  const rising = riskTrend ? riskTrend.deteriorating : openRisks.filter(r => isRising(trendOf(r))).length;
  const improving = riskTrend ? riskTrend.improving : openRisks.filter(r => trendOf(r) === "Improving").length;
  const stable = riskTrend ? riskTrend.stable : openRisks.length - rising - improving;

  const openEsc = escalations.filter(isOpenEscalation);
  const overdueEsc = escalations.filter(e => e.overdue).length;

  const effEffective = Number(effectivenessSummary.effective || 0);
  const effPartial = Number(effectivenessSummary.partially_effective || 0);
  const effNot = Number(effectivenessSummary.not_effective || 0);
  const effTooEarly = Number(effectivenessSummary.too_early || 0);
  const finalRatings = effEffective + effPartial + effNot;
  const effPct = finalRatings ? Math.round((effEffective / finalRatings) * 100) : 0;

  const actionsDue = actions.filter(a => !["Complete", "Completed", "Cancelled"].includes(a.status));

  // Authoritative headline counts (full dataset) with a safe fallback to the loaded lists. Trend
  // split (rising/stable/improving) stays list-derived — it needs each risk's trajectory.
  const rmRisksOpen = reportMetrics?.risks_open ?? openRisks.length;
  const rmEscOpen = reportMetrics?.escalations_open ?? openEsc.length;
  const rmEscOverdue = reportMetrics?.escalations_overdue ?? overdueEsc;
  const rmActionsOpen = reportMetrics?.actions_open ?? actionsDue.length;

  const themeCount: Record<string, number> = {};
  openRisks.forEach(r => { const t = themeOf(r); if (t) themeCount[t] = (themeCount[t] || 0) + 1; });
  const topThemes = Object.entries(themeCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
  const worstTrend = (svcId: string, theme: string) => {
    const rs = openRisks.filter(r => r.house_id === svcId && themeOf(r) === theme);
    if (rs.length === 0) return undefined;
    if (rs.some(r => isRising(trendOf(r)))) return "Rising";
    if (rs.some(r => trendOf(r) === "Stable")) return "Stable";
    return "Improving";
  };
  // All services with any open risk, never capped — a service past position 7 must
  // still be visible, not silently dropped off the dashboard.
  const servicesWithRisk = services;
  const servicesNeedingAttention = servicesWithRisk.filter(s => openRisks.some(r => r.house_id === s.id && isRising(trendOf(r)))).length;

  // Heat map from the server-side /director/cross-site-heatmap endpoint, with a
  // client-side fallback so the panel still renders if the endpoint is empty.
  // Every theme and every service is shown — no slice caps — since a hidden row or
  // column is a hidden risk from the one view meant to catch cross-service patterns.
  const heatTrend: Record<string, string> = {};
  const heatCount: Record<string, number> = {};
  heatmap.forEach((h: any) => { heatTrend[`${h.service_id}|${h.theme}`] = h.trend; heatCount[`${h.service_id}|${h.theme}`] = Number(h.risk_count || 1); });
  const heatThemes = heatmap.length
    ? Array.from(heatmap.reduce((m: Map<string, number>, h: any) => m.set(h.theme, (m.get(h.theme) || 0) + Number(h.risk_count || 1)), new Map<string, number>()).entries())
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1]).map((e: [string, number]) => e[0])
    : topThemes;
  const heatServices = heatmap.length
    ? Array.from(new Map(heatmap.map((h: any) => [h.service_id, { id: h.service_id, name: h.service_name }])).values())
    : servicesWithRisk;
  const trendFor = (svcId: string, theme: string) => heatmap.length ? heatTrend[`${svcId}|${theme}`] : worstTrend(svcId, theme);
  const countFor = (svcId: string, theme: string) => heatmap.length ? heatCount[`${svcId}|${theme}`] : undefined;

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="px-6 pt-20"><CanonicalEvidenceStrip summary={evidenceSummary} compact /></div>
      <div className="p-6 max-w-[1500px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Director Dashboard</h1>
            <p className="text-sm text-muted-foreground">Strategic oversight across all services</p>
          </div>
          <button onClick={() => navigate("/reports")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">
            <Download className="w-4 h-4" /> Download Reports
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
          <StatCard icon={Shield} tone="bg-indigo-100 text-indigo-600" label="Strategic Risks" value={rmRisksOpen}
            footer={<><span className="text-red-600">↑ {rising}</span><span className="text-amber-600">→ {stable}</span><span className="text-emerald-600">↓ {improving}</span></>} />
          <StatCard icon={Flag} tone="bg-orange-100 text-orange-600" label="Escalations Open" value={rmEscOpen}
            footer={<><span className="text-red-600">● {rmEscOverdue} Overdue</span><span className="text-emerald-600">● {Math.max(0, rmEscOpen - rmEscOverdue)} On time</span></>} />
          <StatCard icon={Clock} tone="bg-amber-100 text-amber-600" label="Overdue Reviews" value={rmEscOverdue}
            footer={<span className="text-muted-foreground">need attention</span>} />
          <StatCard icon={ClipboardCheck} tone="bg-blue-100 text-blue-600" label="Actions Due" value={rmActionsOpen}
            footer={<span className="text-muted-foreground">across services</span>} />
          <StatCard icon={TrendingUp} tone="bg-emerald-100 text-emerald-600" label="Action Effectiveness" value={`${effPct}%`}
            footer={<><span className="text-amber-600">{finalRatings ? Math.round(effPartial / finalRatings * 100) : 0}% Partial</span><span className="text-red-600">{finalRatings ? Math.round(effNot / finalRatings * 100) : 0}% Not</span><span className="text-sky-600">{effTooEarly} Too early</span></>} />
          <StatCard icon={Users} tone="bg-rose-100 text-rose-600" label="Services Requiring Attention" value={servicesNeedingAttention}
            footer={<span className="text-muted-foreground">rising risk</span>} />
          <StatCard icon={CalendarClock} tone={weeklyAgeing && weeklyAgeing.missedThisMonth > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}
            label="Weekly Reviews Missed" value={weeklyAgeing?.missedThisMonth ?? 0}
            footer={<span className="text-muted-foreground">{(weeklyAgeing?.overdue ?? 0)} overdue · this month</span>} />
        </div>

        {/* Risk Heat Map — full width so every service row and theme column is visible
            at once, without horizontal scrolling. */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm mb-6">
          <h3 className="font-semibold mb-1">Risk Heat Map <span className="text-xs text-muted-foreground font-normal">(By Service & Theme)</span></h3>
          <p className="text-[11px] text-muted-foreground mb-3">Each cell is the worst-trending open risk for that service and theme. Hover a cell for the open risk count and what the colour means.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr><th className="text-left p-2 text-muted-foreground w-40 sticky left-0 bg-card">Service</th>{heatThemes.map(t => <th key={t} className="p-2 text-muted-foreground font-normal whitespace-nowrap">{t}</th>)}</tr>
              </thead>
              <tbody>
                {heatServices.map(s => (
                  <tr key={s.id}><td className="p-2 font-medium truncate sticky left-0 bg-card">{s.name}</td>{heatThemes.map(t => <HeatCell key={t} trend={trendFor(s.id, t)} riskCount={countFor(s.id, t)} />)}</tr>
                ))}
                {heatServices.length === 0 && <tr><td colSpan={heatThemes.length + 1} className="p-6 text-center text-muted-foreground">No services</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Risks by Trend <span className="text-xs text-muted-foreground font-normal">({rmRisksOpen} open)</span></h3>
            <Donut data={[
              { name: "Rising / Deteriorating", value: rising, color: "#ef4444" },
              { name: "Stable", value: Math.max(stable, 0), color: "#f59e0b" },
              { name: "Improving", value: improving, color: "#10b981" },
            ]} />
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-1">Escalations by Status</h3>
            <p className="text-[11px] text-muted-foreground mb-3">
              Mutually-exclusive lifecycle stages — these bars sum to {Number(escStats.open || 0)} open{Number(escStats.closed || 0) ? ` (+ ${Number(escStats.closed)} closed, not shown)` : ""}.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={[
                { name: "Open", value: Number(escStats.new_open || 0) },
                { name: "Under Review", value: Number(escStats.under_review || 0) },
                { name: "Actions Impl.", value: Number(escStats.actions_implemented || 0) },
                { name: "Monitoring", value: Number(escStats.monitoring_effectiveness || 0) },
                { name: "Ready for Closure", value: Number(escStats.ready_for_closure || 0) },
                { name: "Reopened", value: Number(escStats.reopened || 0) },
                ...(Number(escStats.other_open || 0) > 0 ? [{ name: "Other", value: Number(escStats.other_open || 0) }] : []),
              ]} margin={{ left: 20 }}>
                <XAxis type="number" hide /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            {/* 27 Oct developer instructions ("Complete the agreed screen and dashboard
                change"): renamed from "Top Risk Themes" and now excludes historical plans
                (t.historical) before ranking/limiting — previously this took the first six
                returned themes regardless, and /interventions/themes appends closed-theme
                historical cards after the active ones, so a historical plan could occupy a
                "top" slot. Ranked by recorded risk rating, then deterioration count, then
                overdue reviews/actions — a disclosed rule, not an inferred systemic cause. */}
            <h3 className="font-semibold mb-1">Current Registered Risk Themes <span className="text-xs text-muted-foreground font-normal">(direction of travel)</span></h3>
            <p className="text-[11px] text-muted-foreground mb-3">Ranked by highest recorded risk rating, then deterioration, then overdue work. Open the Intervention Panel to act.</p>
            <div className="space-y-2">
              {(() => {
                const RANK: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
                const highestRating = (t: any) => (t.risk_refs || []).reduce((max: number, r: any) => Math.max(max, RANK[r.impact_rating] || 0), 0);
                const active = themeTrends.filter((t: any) => !t.historical);
                const ranked = [...active].sort((a, b) =>
                  highestRating(b) - highestRating(a)
                  || (b.trajectory?.counts?.deteriorating || 0) - (a.trajectory?.counts?.deteriorating || 0)
                  || ((b.overdueActions || 0)) - ((a.overdueActions || 0))
                );
                return ranked.slice(0, 6);
              })().map((t: any) => {
                // trajectory.label is the authoritative engine's own vocabulary:
                // Deteriorating / Improving / Stable (or "Insufficient evidence" for a
                // closed-theme historical card) — never the Increasing/Reducing labels
                // this used to compare against, which no longer exist.
                const dir = t.trajectory?.label || t.trajectory?.direction || "Stable";
                const arrow = dir === "Deteriorating" ? "↗" : dir === "Improving" ? "↘" : "→";
                const dirTone = dir === "Deteriorating" ? "text-red-600" : dir === "Improving" ? "text-emerald-600" : "text-amber-600";
                const concernTone = ["Attention", "Review required"].includes(t.concern) ? "bg-red-100 text-red-700" : t.concern === "Controlled" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
                return (
                  <button key={t.theme} onClick={() => navigate("/interventions")}
                    className="w-full flex items-center justify-between text-sm border-b border-border/50 pb-2 text-left hover:bg-muted/40 rounded px-1 -mx-1 transition-colors">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{t.theme}</div>
                      <div className={`text-xs font-medium ${dirTone}`}>{arrow} {dir} · <span className="text-muted-foreground font-normal">{t.services} service{t.services !== 1 ? "s" : ""}{t.intervention ? " · intervention set" : ""}</span></div>
                    </div>
                    <span className={`text-xs rounded px-2 py-0.5 shrink-0 ${concernTone}`}>{t.concern}</span>
                  </button>
                );
              })}
              {themeTrends.filter((t: any) => !t.historical).length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No current registered risk themes</p>}
            </div>
          </div>

        </div>

        {/* 26 Oct developer requirements, "Services Overview — Accuracy and presentation": moved
            out of the two-column grid into its own full-width section below, replacing the old
            High/Medium/Low formula (which measured record counts and deterioration, not overall
            service risk — a service with zero risks and one with a serious non-deteriorating risk
            could both show "Low") with the server-computed, canonically-defined counts. */}
        <ServicesOverview navigate={navigate} />

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Recent Escalations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 pr-2">Escalation</th><th className="px-2">Service</th><th className="px-2">Escalated On</th><th className="px-2">Due By</th><th className="px-2">Status</th>
              </tr></thead>
              <tbody>
                {escalations.slice((Math.min(escPage, Math.max(1, Math.ceil(escalations.length / 5))) - 1) * 5, (Math.min(escPage, Math.max(1, Math.ceil(escalations.length / 5)))) * 5).map(e => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => navigate("/escalation-log")}>
                    <td className="py-2.5 pr-2">{e.risk_title || e.reason || "Escalation"}</td>
                    <td className="px-2">{e.service_name || e.house_name || "—"}</td>
                    <td className="px-2 whitespace-nowrap">{new Date(e.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                    <td className="px-2 whitespace-nowrap">{e.due_by ? new Date(e.due_by).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</td>
                    <td className="px-2"><span className={`text-xs rounded px-2 py-0.5 ${e.overdue ? "bg-red-100 text-red-700" : "bg-muted text-foreground"}`}>{e.overdue ? "Overdue" : (e.lifecycle_status || e.status)}</span></td>
                  </tr>
                ))}
                {escalations.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">No escalations</td></tr>}
              </tbody>
            </table>
          </div>
          {escalations.length > 5 && (() => {
            const pages = Math.max(1, Math.ceil(escalations.length / 5));
            const safe = Math.min(escPage, pages);
            return (
              <div className="flex items-center justify-between mt-3 text-sm">
                <button onClick={() => setEscPage(p => Math.max(1, p - 1))} disabled={safe <= 1} className="px-3 py-1.5 border border-border rounded hover:bg-muted disabled:opacity-40">Previous</button>
                <span className="text-xs text-muted-foreground">Page {safe} of {pages} · {escalations.length} total</span>
                <button onClick={() => setEscPage(p => Math.min(pages, p + 1))} disabled={safe >= pages} className="px-3 py-1.5 border border-border rounded hover:bg-muted disabled:opacity-40">Next</button>
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
}
