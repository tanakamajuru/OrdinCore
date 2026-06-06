import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import {
  Shield, Flag, Clock, ClipboardCheck, TrendingUp, Users,
  ArrowUpRight, ArrowDownRight, Minus, Download,
} from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { apiClient } from "@/services/api";

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

function HeatCell({ trend }: { trend?: string }) {
  if (!trend) return <td className="p-2 text-center"><span className="inline-block w-6 h-6 rounded bg-muted" /></td>;
  const cfg = isRising(trend)
    ? { bg: "bg-red-100", icon: <ArrowUpRight className="w-4 h-4 text-red-600" /> }
    : trend === "Improving"
      ? { bg: "bg-emerald-100", icon: <ArrowDownRight className="w-4 h-4 text-emerald-600" /> }
      : { bg: "bg-amber-100", icon: <Minus className="w-4 h-4 text-amber-600" /> };
  return <td className="p-2 text-center"><span className={`inline-flex items-center justify-center w-7 h-7 rounded ${cfg.bg}`}>{cfg.icon}</span></td>;
}

export function DirectorDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [escStats, setEscStats] = useState<any>({});
  const [actions, setActions] = useState<any[]>([]);
  const [effPending, setEffPending] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [rk, esc, st, act, eff, hs, hm] = await Promise.all([
        apiClient.get(`/risks?limit=200`).catch(() => ({})),
        apiClient.getEscalations(1, 200).catch(() => ({})),
        apiClient.getEscalationStats().catch(() => ({})),
        apiClient.getRisksActions().catch(() => ({})),
        apiClient.getPendingEffectiveness().catch(() => ({})),
        apiClient.get(`/houses?limit=100`).catch(() => ({})),
        apiClient.getCrossSiteHeatmap().catch(() => ({})),
      ]);
      setRisks(asArray(unwrap(rk)));
      setEscalations(asArray(unwrap(esc)));
      setEscStats(unwrap(st) || {});
      setActions(asArray(unwrap(act)));
      setEffPending(asArray(unwrap(eff)));
      setServices(asArray(unwrap(hs)));
      setHeatmap(asArray(unwrap(hm)));
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

  const openRisks = risks.filter(r => (r.status || "").toLowerCase() !== "closed");
  const trendOf = (r: any) => r.trend || r.trajectory || "Stable";
  const rising = openRisks.filter(r => isRising(trendOf(r))).length;
  const improving = openRisks.filter(r => trendOf(r) === "Improving").length;
  const stable = openRisks.length - rising - improving;

  const openEsc = escalations.filter(e => (e.lifecycle_status || "") !== "Closed");
  const overdueEsc = escalations.filter(e => e.overdue).length;

  const rated = actions.filter(a => a.effectiveness_outcome || a.effectiveness);
  const effCount = (names: string[]) => rated.filter(a => names.includes(a.effectiveness_outcome) || names.includes(a.effectiveness)).length;
  const effEffective = effCount(["Effective"]);
  const effPartial = effCount(["Partially Effective", "Neutral"]);
  const effNot = effCount(["Not Effective", "Ineffective"]);
  const effPct = rated.length ? Math.round((effEffective / rated.length) * 100) : 0;

  const actionsDue = actions.filter(a => !["Complete", "Completed", "Cancelled"].includes(a.status));

  const themeCount: Record<string, number> = {};
  openRisks.forEach(r => { const t = r.strategic_theme || r.risk_domain || r.title; if (t) themeCount[t] = (themeCount[t] || 0) + 1; });
  const topThemes = Object.entries(themeCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
  const worstTrend = (svcId: string, theme: string) => {
    const rs = openRisks.filter(r => r.house_id === svcId && (r.strategic_theme || r.risk_domain || r.title) === theme);
    if (rs.length === 0) return undefined;
    if (rs.some(r => isRising(trendOf(r)))) return "Rising";
    if (rs.some(r => trendOf(r) === "Stable")) return "Stable";
    return "Improving";
  };
  const servicesWithRisk = services.slice(0, 7);
  const servicesNeedingAttention = servicesWithRisk.filter(s => openRisks.some(r => r.house_id === s.id && isRising(trendOf(r)))).length;

  // Heat map from the server-side /director/cross-site-heatmap endpoint, with a
  // client-side fallback so the panel still renders if the endpoint is empty.
  const heatTrend: Record<string, string> = {};
  heatmap.forEach((h: any) => { heatTrend[`${h.service_id}|${h.theme}`] = h.trend; });
  const heatThemes = heatmap.length
    ? Array.from(heatmap.reduce((m: Map<string, number>, h: any) => m.set(h.theme, (m.get(h.theme) || 0) + Number(h.risk_count || 1)), new Map()).entries())
        .sort((a, b) => b[1] - a[1]).slice(0, 5).map((e) => e[0])
    : topThemes;
  const heatServices = heatmap.length
    ? Array.from(new Map(heatmap.map((h: any) => [h.service_id, { id: h.service_id, name: h.service_name }])).values()).slice(0, 7)
    : servicesWithRisk;
  const trendFor = (svcId: string, theme: string) => heatmap.length ? heatTrend[`${svcId}|${theme}`] : worstTrend(svcId, theme);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard icon={Shield} tone="bg-indigo-100 text-indigo-600" label="Strategic Risks" value={openRisks.length}
            footer={<><span className="text-red-600">↑ {rising}</span><span className="text-amber-600">→ {stable}</span><span className="text-emerald-600">↓ {improving}</span></>} />
          <StatCard icon={Flag} tone="bg-orange-100 text-orange-600" label="Escalations Open" value={openEsc.length}
            footer={<><span className="text-red-600">● {overdueEsc} Overdue</span><span className="text-emerald-600">● {openEsc.length - overdueEsc} On time</span></>} />
          <StatCard icon={Clock} tone="bg-amber-100 text-amber-600" label="Overdue Reviews" value={overdueEsc}
            footer={<span className="text-muted-foreground">need attention</span>} />
          <StatCard icon={ClipboardCheck} tone="bg-blue-100 text-blue-600" label="Actions Due" value={actionsDue.length}
            footer={<span className="text-muted-foreground">across services</span>} />
          <StatCard icon={TrendingUp} tone="bg-emerald-100 text-emerald-600" label="Action Effectiveness" value={`${effPct}%`}
            footer={<><span className="text-amber-600">{rated.length ? Math.round(effPartial / rated.length * 100) : 0}% Partial</span><span className="text-red-600">{rated.length ? Math.round(effNot / rated.length * 100) : 0}% Not</span></>} />
          <StatCard icon={Users} tone="bg-rose-100 text-rose-600" label="Services Requiring Attention" value={servicesNeedingAttention}
            footer={<span className="text-muted-foreground">rising risk</span>} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Risk Heat Map <span className="text-xs text-muted-foreground font-normal">(By Service & Theme)</span></h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr><th className="text-left p-2 text-muted-foreground">Service</th>{heatThemes.map(t => <th key={t} className="p-2 text-muted-foreground font-normal">{t}</th>)}</tr>
                </thead>
                <tbody>
                  {heatServices.map(s => (
                    <tr key={s.id}><td className="p-2 font-medium whitespace-nowrap">{s.name}</td>{heatThemes.map(t => <HeatCell key={t} trend={trendFor(s.id, t)} />)}</tr>
                  ))}
                  {heatServices.length === 0 && <tr><td colSpan={heatThemes.length + 1} className="p-6 text-center text-muted-foreground">No services</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Risks by Trend</h3>
            <Donut data={[
              { name: "Rising", value: rising, color: "#ef4444" },
              { name: "Stable", value: Math.max(stable, 0), color: "#f59e0b" },
              { name: "Improving", value: improving, color: "#10b981" },
            ]} />
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Action Effectiveness <span className="text-xs text-muted-foreground font-normal">(All Services)</span></h3>
            <Donut centerLabel={`${effPct}%`} data={[
              { name: "Effective", value: effEffective, color: "#10b981" },
              { name: "Partially Effective", value: effPartial, color: "#f59e0b" },
              { name: "Not Effective", value: effNot, color: "#ef4444" },
            ]} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Escalations by Status</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart layout="vertical" data={[
                { name: "Open", value: Number(escStats.new_open || 0) },
                { name: "Under Review", value: Number(escStats.under_review || 0) },
                { name: "Actions Impl.", value: Number(escStats.actions_implemented || 0) },
                { name: "Monitoring", value: Number(escStats.monitoring_effectiveness || 0) },
                { name: "Closed", value: Number(escStats.closed || 0) },
              ]} margin={{ left: 20 }}>
                <XAxis type="number" hide /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Top Risk Themes <span className="text-xs text-muted-foreground font-normal">(by services affected)</span></h3>
            <div className="space-y-2">
              {topThemes.map(t => {
                const svcs = new Set(openRisks.filter(r => (r.strategic_theme || r.risk_domain || r.title) === t).map(r => r.house_id)).size;
                const trend = openRisks.some(r => (r.strategic_theme || r.risk_domain || r.title) === t && isRising(trendOf(r))) ? "Rising" : "Stable";
                return (
                  <div key={t} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                    <div><div className="font-medium">{t}</div><div className="text-xs text-muted-foreground">{svcs} service{svcs !== 1 ? "s" : ""}</div></div>
                    <span className={`text-xs rounded px-2 py-0.5 ${trend === "Rising" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{trend}</span>
                  </div>
                );
              })}
              {topThemes.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No themes</p>}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Services Overview</h3>
            <div className="space-y-2">
              {servicesWithRisk.map(s => {
                const sr = openRisks.filter(r => r.house_id === s.id);
                const risingN = sr.filter(r => isRising(trendOf(r))).length;
                const level = risingN >= 2 ? "High" : risingN === 1 ? "Medium" : "Low";
                return (
                  <div key={s.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                    <span className="font-medium">{s.name}</span>
                    <span className={`text-xs rounded px-2 py-0.5 ${level === "High" ? "bg-red-100 text-red-700" : level === "Medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{level}</span>
                  </div>
                );
              })}
              {servicesWithRisk.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No services</p>}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Recent Escalations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 pr-2">Escalation</th><th className="px-2">Service</th><th className="px-2">Escalated On</th><th className="px-2">Due By</th><th className="px-2">Status</th>
              </tr></thead>
              <tbody>
                {escalations.slice(0, 8).map(e => (
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
        </div>
      </div>
    </div>
  );
}
