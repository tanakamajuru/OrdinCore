import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import {
  Activity, Shield, Flag, ClipboardCheck, TrendingUp, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Minus, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { apiClient } from "@/services/api";

// Defensively unwrap the varying { data } / { data: { data } } response shapes.
const unwrap = (res: any): any => res?.data?.data ?? res?.data ?? [];
const asArray = (v: any): any[] => (Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : []);

const TREND_COLORS: Record<string, string> = {
  Rising: "#ef4444", Deteriorating: "#ef4444", Stable: "#f59e0b", Improving: "#10b981",
};
const LIFECYCLE_COLORS: Record<string, string> = {
  Overdue: "#ef4444", "Open": "#ef4444", "Under Review": "#f59e0b",
  "Actions Implemented": "#3b82f6", "Monitoring Effectiveness": "#8b5cf6", "Closed": "#10b981",
};
const SEVERITY_BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700", High: "bg-orange-100 text-orange-700",
  Medium: "bg-amber-100 text-amber-700", Moderate: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "Rising" || trend === "Deteriorating") return <ArrowUpRight className="w-4 h-4 text-red-500" />;
  if (trend === "Improving") return <ArrowDownRight className="w-4 h-4 text-emerald-500" />;
  return <Minus className="w-4 h-4 text-amber-500" />;
}

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

function Donut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={total ? data : [{ name: "None", value: 1, color: "#e5e7eb" }]} dataKey="value"
              innerRadius={42} outerRadius={60} paddingAngle={2}>
              {(total ? data : [{ color: "#e5e7eb" }]).map((d: any, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold">{total}</span>
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

function Panel({ title, count, children, onView }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          {title}
          {count != null && <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">{count}</span>}
        </h3>
        {onView && <button onClick={onView} className="text-xs text-primary hover:underline">View all</button>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function RegisteredManagerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [house, setHouse] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [escStats, setEscStats] = useState<any>({});
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [effPending, setEffPending] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      let myHouse: any = null;
      try {
        const housesRes = await apiClient.get(`/users/${user.id}/houses`);
        myHouse = asArray(unwrap(housesRes))[0] || null;
        setHouse(myHouse);
      } catch { /* non-fatal */ }

      const monthStart = new Date(); monthStart.setDate(1);
      const [sig, rk, esc, st, rq, eff, act] = await Promise.all([
        apiClient.get(`/pulses?limit=100`).catch(() => ({})),
        apiClient.get(`/risks?limit=100`).catch(() => ({})),
        apiClient.getEscalations(1, 100).catch(() => ({})),
        apiClient.getEscalationStats().catch(() => ({})),
        apiClient.getGovernanceReviewQueue().catch(() => ({})),
        apiClient.getPendingEffectiveness().catch(() => ({})),
        apiClient.get(`/actions/my`).catch(() => ({})),
      ]);

      setSignals(asArray(unwrap(sig)));
      setRisks(asArray(unwrap(rk)));
      setEscalations(asArray(unwrap(esc)));
      setEscStats(unwrap(st) || {});
      setReviewQueue(asArray(unwrap(rq)));
      setEffPending(asArray(unwrap(eff)));
      setActions(asArray(unwrap(act)));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
      <span>Loading dashboard…</span>
    </div>
  );

  // ─── Derived metrics ─────────────────────────────────────────────────────
  const openRisks = risks.filter(r => (r.status || "").toLowerCase() !== "closed");
  const trendCount = (t: string) => openRisks.filter(r => (r.trend || r.trajectory) === t).length;
  const risingCount = openRisks.filter(r => ["Rising", "Deteriorating"].includes(r.trend || r.trajectory)).length;
  const improvingCount = trendCount("Improving");
  const stableCount = openRisks.length - risingCount - improvingCount;

  const openEsc = escalations.filter(e => (e.lifecycle_status || "") !== "Closed");
  const overdueEsc = escalations.filter(e => e.overdue).length;
  const onTimeEsc = openEsc.length - overdueEsc;

  const actionsDue = actions.filter(a => !["Complete", "Completed", "Cancelled"].includes(a.status));
  const closedThisMonth = escalations.filter(e => e.lifecycle_status === "Closed").length;

  const trendDonut = [
    { name: "Rising", value: risingCount, color: "#ef4444" },
    { name: "Stable", value: Math.max(stableCount, 0), color: "#f59e0b" },
    { name: "Improving", value: improvingCount, color: "#10b981" },
  ];
  const lifecycleDonut = [
    { name: "Open", value: Number(escStats.new_open || 0), color: LIFECYCLE_COLORS["Open"] },
    { name: "Under Review", value: Number(escStats.under_review || 0), color: LIFECYCLE_COLORS["Under Review"] },
    { name: "Actions Implemented", value: Number(escStats.actions_implemented || 0), color: LIFECYCLE_COLORS["Actions Implemented"] },
    { name: "Monitoring Effectiveness", value: Number(escStats.monitoring_effectiveness || 0), color: LIFECYCLE_COLORS["Monitoring Effectiveness"] },
    { name: "Closed", value: Number(escStats.closed || 0), color: LIFECYCLE_COLORS["Closed"] },
  ];

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 pt-24 max-w-[1500px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Registered Manager Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview of governance, risks, actions and effectiveness{house?.name ? ` · ${house.name}` : ""}</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard icon={Activity} tone="bg-blue-100 text-blue-600" label="Signals This Month" value={signals.length}
            footer={<span className="text-muted-foreground">recorded</span>} />
          <StatCard icon={Shield} tone="bg-emerald-100 text-emerald-600" label="Strategic Risks" value={openRisks.length}
            footer={<>
              <span className="text-red-600">↑ {risingCount} Rising</span>
              <span className="text-amber-600">→ {stableCount} Stable</span>
              <span className="text-emerald-600">↓ {improvingCount} Improving</span>
            </>} />
          <StatCard icon={Flag} tone="bg-orange-100 text-orange-600" label="Open Escalations" value={openEsc.length}
            footer={<>
              <span className="text-red-600">● {overdueEsc} Overdue</span>
              <span className="text-emerald-600">● {onTimeEsc} On time</span>
            </>} />
          <StatCard icon={ClipboardCheck} tone="bg-red-100 text-red-600" label="Actions Due" value={actionsDue.length}
            footer={<span className="text-muted-foreground">open actions</span>} />
          <StatCard icon={TrendingUp} tone="bg-violet-100 text-violet-600" label="Effectiveness Reviews Due" value={effPending.length}
            footer={<span className="text-muted-foreground">awaiting review</span>} />
          <StatCard icon={CheckCircle2} tone="bg-emerald-100 text-emerald-600" label="Closed This Month" value={closedThisMonth}
            footer={<span className="text-muted-foreground">escalations & risks</span>} />
        </div>

        {/* Strategic risks + trend + escalations by status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Strategic Risks Overview</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-2">Risk Theme</th><th className="px-2">Trend</th>
                    <th className="px-2">Days Open</th><th className="px-2 text-right">Open Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {openRisks.slice(0, 6).map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => navigate("/risk-register")}>
                      <td className="py-2.5 pr-2">
                        <div className="font-medium">{r.strategic_theme || r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.service_name || r.house_name || ""}</div>
                      </td>
                      <td className="px-2"><span className="flex items-center gap-1"><TrendIcon trend={r.trend || r.trajectory} /></span></td>
                      <td className="px-2">{r.days_open_computed ?? r.days_open ?? "—"}</td>
                      <td className="px-2 text-right"><span className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs">{r.open_actions_count ?? 0}</span></td>
                    </tr>
                  ))}
                  {openRisks.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-xs">No strategic risks</td></tr>}
                </tbody>
              </table>
            </div>
            <button onClick={() => navigate("/risk-register")} className="text-xs text-primary hover:underline mt-3">View all strategic risks →</button>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Risk Trajectory <span className="text-xs text-muted-foreground font-normal">(All Risks)</span></h3>
            <Donut data={trendDonut} />
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Escalations by Status</h3>
            <Donut data={lifecycleDonut} />
          </div>
        </div>

        {/* Three governance queues */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Panel title="Governance Review Queue" count={reviewQueue.length} onView={() => navigate("/oversight-board")}>
            <div className="space-y-2">
              {reviewQueue.slice(0, 5).map((q) => (
                <div key={q.risk_id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                  <div>
                    <div className="font-medium">{q.theme}</div>
                    <div className="text-xs text-muted-foreground">{q.signal_count || 0} signals · {q.days_since_review ?? 0}d since review</div>
                  </div>
                  <span className={`text-xs rounded px-2 py-0.5 ${SEVERITY_BADGE[q.severity] || "bg-muted"}`}>{q.severity || "—"}</span>
                </div>
              ))}
              {reviewQueue.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">Queue clear</p>}
            </div>
          </Panel>

          <Panel title="Escalation Queue" count={openEsc.length} onView={() => navigate("/escalations")}>
            <div className="space-y-2">
              {openEsc.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                  <div>
                    <div className="font-medium">{e.risk_title || e.reason || "Escalation"}</div>
                    <div className="text-xs text-muted-foreground">{e.escalated_to_name || "—"}{e.due_by ? ` · due ${new Date(e.due_by).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}` : ""}</div>
                  </div>
                  <span className={`text-xs rounded px-2 py-0.5 ${e.overdue ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{e.overdue ? "Overdue" : (e.lifecycle_status || "Open")}</span>
                </div>
              ))}
              {openEsc.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No open escalations</p>}
            </div>
          </Panel>

          <Panel title="Effectiveness Review Queue" count={effPending.length} onView={() => navigate("/effectiveness")}>
            <div className="space-y-2">
              {effPending.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                  <div>
                    <div className="font-medium">{a.risk_title || a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.title}</div>
                  </div>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
              ))}
              {effPending.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">Nothing due</p>}
            </div>
          </Panel>
        </div>

        {/* Recent signals + actions overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Recent Signals</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-2">Date</th><th className="px-2">Client</th><th className="px-2">Theme</th>
                    <th className="px-2">Description</th><th className="px-2">Severity</th><th className="px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.slice(0, 6).map((s) => (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="py-2.5 pr-2 whitespace-nowrap">{new Date(s.entry_date || s.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                      <td className="px-2">{s.related_person || "—"}</td>
                      <td className="px-2">{Array.isArray(s.risk_domain) ? s.risk_domain[0] : s.risk_domain || s.signal_type}</td>
                      <td className="px-2 max-w-[220px] truncate text-muted-foreground">{s.description}</td>
                      <td className="px-2"><span className={`text-xs rounded px-2 py-0.5 ${SEVERITY_BADGE[s.severity] || "bg-muted"}`}>{s.severity}</span></td>
                      <td className="px-2 text-xs text-muted-foreground">{s.review_status || s.status || "New"}</td>
                    </tr>
                  ))}
                  {signals.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">No signals</td></tr>}
                </tbody>
              </table>
            </div>
            <button onClick={() => navigate("/signals")} className="text-xs text-primary hover:underline mt-3">View all signals →</button>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Actions Overview</h3>
            <Donut data={[
              { name: "Open", value: actions.filter(a => a.status === "Pending" || a.status === "Open").length, color: "#ef4444" },
              { name: "In Progress", value: actions.filter(a => a.status === "In Progress").length, color: "#f59e0b" },
              { name: "Completed", value: actions.filter(a => ["Complete", "Completed"].includes(a.status)).length, color: "#10b981" },
            ]} />
            <button onClick={() => navigate("/my-actions")} className="text-xs text-primary hover:underline mt-4 block">View all actions →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
