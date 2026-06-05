import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import {
  Activity, ClipboardList, Clock, Flag, CheckCircle2, Users, Plus, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { apiClient } from "@/services/api";

const unwrap = (res: any): any => res?.data?.data ?? res?.data ?? [];
const asArray = (v: any): any[] => (Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : []);

const SEVERITY_BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700", High: "bg-orange-100 text-orange-700",
  Medium: "bg-amber-100 text-amber-700", Moderate: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};
const THEME_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280", "#ec4899", "#14b8a6"];

function StatCard({ icon: Icon, label, value, tone, footer }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-1 text-foreground">{value}</p></div>
        <div className={`p-2 rounded-lg ${tone}`}><Icon className="w-5 h-5" /></div>
      </div>
      {footer && <div className="mt-3 text-[11px] text-muted-foreground">{footer}</div>}
    </div>
  );
}

export function TeamLeaderDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const [sig, act, esc] = await Promise.all([
        apiClient.get(`/pulses?created_by=${user.id}&limit=100`).catch(() => apiClient.get(`/pulses?limit=100`)).catch(() => ({})),
        apiClient.get(`/actions/my`).catch(() => ({})),
        apiClient.getEscalations(1, 100).catch(() => ({})),
      ]);
      setSignals(asArray(unwrap(sig)));
      setActions(asArray(unwrap(act)));
      setEscalations(asArray(unwrap(esc)));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" /><span>Loading dashboard…</span>
    </div>
  );

  const weekAgo = Date.now() - 7 * 86400000;
  const signalsThisWeek = signals.filter(s => new Date(s.entry_date || s.created_at).getTime() >= weekAgo).length;
  const myActions = actions.filter(a => !["Complete", "Completed", "Cancelled"].includes(a.status));
  const dueSoon = myActions.filter(a => a.due_date && new Date(a.due_date).getTime() <= Date.now() + 7 * 86400000);
  const myEsc = escalations.filter(e => (e.lifecycle_status || "") !== "Closed");
  const closedThisMonth = actions.filter(a => ["Complete", "Completed"].includes(a.status)).length;

  // Signals by theme (risk_domain[0] or signal_type)
  const themeCount: Record<string, number> = {};
  signals.forEach(s => {
    const t = Array.isArray(s.risk_domain) ? s.risk_domain[0] : (s.risk_domain || s.signal_type || "Other");
    if (t) themeCount[t] = (themeCount[t] || 0) + 1;
  });
  const themeData = Object.entries(themeCount).map(([name, value], i) => ({ name, value, color: THEME_COLORS[i % THEME_COLORS.length] }));
  const totalSignals = signals.length;

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 pt-24 max-w-[1500px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Team Leader Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview of your signals, actions and team activity</p>
          </div>
          <button onClick={() => navigate("/signal/new")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Record Signal
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard icon={Activity} tone="bg-blue-100 text-blue-600" label="Signals This Week" value={signalsThisWeek} footer="recorded" />
          <StatCard icon={ClipboardList} tone="bg-emerald-100 text-emerald-600" label="My Actions" value={myActions.length} footer="open" />
          <StatCard icon={Clock} tone="bg-amber-100 text-amber-600" label="Actions Due Soon" value={dueSoon.length} footer="next 7 days" />
          <StatCard icon={Flag} tone="bg-orange-100 text-orange-600" label="Escalations" value={myEsc.length} footer="require follow up" />
          <StatCard icon={CheckCircle2} tone="bg-emerald-100 text-emerald-600" label="Closed This Month" value={closedThisMonth} footer="actions" />
          <StatCard icon={Users} tone="bg-violet-100 text-violet-600" label="Total Signals" value={totalSignals} footer="all time" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Signals by Theme</h3>
            <div className="flex items-center gap-4">
              <div className="relative w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={totalSignals ? themeData : [{ name: "None", value: 1, color: "#e5e7eb" }]} dataKey="value" innerRadius={42} outerRadius={60} paddingAngle={2}>
                      {(totalSignals ? themeData : [{ color: "#e5e7eb" }]).map((d: any, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl font-semibold">{totalSignals}</span></div>
              </div>
              <div className="space-y-1.5 text-xs flex-1">
                {themeData.slice(0, 6).map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-muted-foreground flex-1">{d.name}</span><span className="font-medium">{d.value}</span>
                  </div>
                ))}
                {themeData.length === 0 && <p className="text-muted-foreground">No signals yet</p>}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Recent Signals</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2">Date</th><th className="px-2">Theme</th><th className="px-2">Client</th><th className="px-2">Description</th><th className="px-2">Severity</th><th className="px-2">Status</th>
                </tr></thead>
                <tbody>
                  {signals.slice(0, 6).map(s => (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="py-2.5 pr-2 whitespace-nowrap">{new Date(s.entry_date || s.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                      <td className="px-2">{Array.isArray(s.risk_domain) ? s.risk_domain[0] : (s.risk_domain || s.signal_type)}</td>
                      <td className="px-2">{s.related_person || "—"}</td>
                      <td className="px-2 max-w-[200px] truncate text-muted-foreground">{s.description}</td>
                      <td className="px-2"><span className={`text-xs rounded px-2 py-0.5 ${SEVERITY_BADGE[s.severity] || "bg-muted"}`}>{s.severity}</span></td>
                      <td className="px-2 text-xs text-muted-foreground">{s.review_status || s.status || "New"}</td>
                    </tr>
                  ))}
                  {signals.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">No signals yet — record your first one.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">My Actions</h3>
            <div className="space-y-2">
              {myActions.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 cursor-pointer hover:bg-muted/30" onClick={() => navigate("/my-actions")}>
                  <div><div className="font-medium line-clamp-1">{a.title}</div><div className="text-xs text-muted-foreground">{a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}` : ""}</div></div>
                  <span className="text-xs rounded px-2 py-0.5 bg-amber-100 text-amber-700">{a.status}</span>
                </div>
              ))}
              {myActions.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No open actions</p>}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Actions Due Soon</h3>
            <div className="space-y-2">
              {dueSoon.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                  <div className="font-medium line-clamp-1">{a.title}</div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{a.due_date ? new Date(a.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : ""}</span>
                </div>
              ))}
              {dueSoon.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">Nothing due soon</p>}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Escalations Requiring Follow Up</h3>
            <div className="space-y-2">
              {myEsc.slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                  <div><div className="font-medium line-clamp-1">{e.risk_title || e.reason || "Escalation"}</div><div className="text-xs text-muted-foreground">{e.escalated_to_name || ""}</div></div>
                  <span className={`text-xs rounded px-2 py-0.5 ${e.overdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{e.overdue ? "Overdue" : (e.lifecycle_status || "Open")}</span>
                </div>
              ))}
              {myEsc.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">None</p>}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-6 bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate("/signal/new")} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"><Plus className="w-4 h-4 text-primary" /> Record Signal</button>
            <button onClick={() => navigate("/signals")} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"><FileText className="w-4 h-4 text-primary" /> View My Signals</button>
            <button onClick={() => navigate("/my-actions")} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"><ClipboardList className="w-4 h-4 text-primary" /> View My Actions</button>
            <button onClick={() => navigate("/escalations")} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"><Flag className="w-4 h-4 text-primary" /> Escalations</button>
          </div>
        </div>
      </div>
    </div>
  );
}
