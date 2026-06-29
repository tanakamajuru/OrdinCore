import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import {
  Activity, ClipboardList, Clock, TrendingUp, CheckCircle2, Plus, FileText,
  Bell, HelpCircle, Calendar, ArrowRight, Layers, Sparkles,
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
const STATUS_BADGE: Record<string, string> = {
  New: "bg-blue-50 text-blue-700", Open: "bg-blue-50 text-blue-700",
  Reviewed: "bg-slate-100 text-slate-700", Escalated: "bg-red-50 text-red-700",
  Closed: "bg-slate-100 text-slate-500",
};
const THEME_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280", "#ec4899", "#14b8a6"];

function StatCard({ icon: Icon, label, value, tone, delta, deltaTone, viewLabel, onView }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold mt-1 text-foreground">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${tone}`}><Icon className="w-5 h-5" /></div>
      </div>
      {delta && <div className={`mt-2 text-[11px] ${deltaTone || "text-muted-foreground"}`}>{delta}</div>}
      {viewLabel && (
        <button onClick={onView} className="mt-3 pt-2 border-t border-border/60 text-[11px] text-primary flex items-center gap-1 hover:gap-1.5 transition-all">
          {viewLabel} <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function TeamLeaderDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const displayName = user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Team Leader";
  const initials = ((user.first_name?.[0] || displayName[0] || "T") + (user.last_name?.[0] || "L")).toUpperCase();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [sig, act, esc, notif] = await Promise.all([
        apiClient.get(`/pulses?created_by=${user.id}&limit=100`).catch(() => apiClient.get(`/pulses?limit=100`)).catch(() => ({})),
        apiClient.get(`/actions/my`).catch(() => ({})),
        apiClient.getEscalations(1, 100).catch(() => ({})),
        apiClient.getNotifications().catch(() => ({})),
      ]);
      setSignals(asArray(unwrap(sig)));
      setActions(asArray(unwrap(act)));
      setEscalations(asArray(unwrap(esc)));
      const notifList = asArray(unwrap(notif));
      setNotifications(notifList);
      setUnreadCount((notif as any)?.meta?.unread_count ?? notifList.filter((n: any) => !(n.is_read ?? n.read)).length);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const openNotification = async (n: any) => {
    try {
      if (!(n.is_read ?? n.read)) {
        await apiClient.markNotificationRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true, read: true } : x));
        setUnreadCount(c => Math.max(0, c - 1));
      }
    } catch { /* non-blocking */ }
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAllNotifs = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications(prev => prev.map(x => ({ ...x, is_read: true, read: true })));
      setUnreadCount(0);
    } catch { toast.error("Failed to mark all read"); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" /><span>Loading dashboard…</span>
      </div>
    </div>
  );

  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const twoWeeksAgo = now - 14 * 86400000;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

  const sigTime = (s: any) => new Date(s.entry_date || s.created_at).getTime();
  const signalsThisWeek = signals.filter(s => sigTime(s) >= weekAgo).length;
  const signalsPrevWeek = signals.filter(s => sigTime(s) >= twoWeeksAgo && sigTime(s) < weekAgo).length;
  const weekDelta = signalsThisWeek - signalsPrevWeek;

  const myActions = actions.filter(a => !["Complete", "Completed", "Cancelled"].includes(a.status));
  const dueSoon = myActions.filter(a => a.due_date && new Date(a.due_date).getTime() <= now + 7 * 86400000);
  const myEsc = escalations.filter(e => (e.lifecycle_status || "") !== "Closed");
  // "Closed This Month" counts closed ESCALATIONS (not completed actions) so a TL who
  // raised an escalation sees it resolved — matching how the RM dashboard counts. (Bug B1.)
  const closedThisMonth = escalations.filter(e =>
    (e.lifecycle_status || "") === "Closed" &&
    (e.closed_at || e.resolved_at) &&
    new Date(e.closed_at || e.resolved_at).getTime() >= monthStart
  ).length;

  const themeCount: Record<string, number> = {};
  signals.forEach(s => {
    const t = Array.isArray(s.risk_domain) ? s.risk_domain[0] : (s.risk_domain || s.signal_type || "Other");
    if (t) themeCount[t] = (themeCount[t] || 0) + 1;
  });
  const themeData = Object.entries(themeCount).map(([name, value], i) => ({ name, value, color: THEME_COLORS[i % THEME_COLORS.length] }));
  const totalSignals = signals.length;

  const monthLabel = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 max-w-[1500px]">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Team Leader Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview of your signals, actions and team activity</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" /> {monthLabel}
              </div>
              <div className="relative">
                <button onClick={() => setNotifOpen(o => !o)} className="relative p-2 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center">{unreadCount}</span>}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-xl shadow-lg z-50">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border sticky top-0 bg-card">
                      <span className="text-sm font-semibold">Notifications</span>
                      {unreadCount > 0 && <button onClick={markAllNotifs} className="text-[11px] text-primary">Mark all read</button>}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-xs text-muted-foreground">You're all caught up.</p>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {notifications.slice(0, 15).map(n => (
                          <button key={n.id} onClick={() => openNotification(n)}
                            className={`w-full text-left px-4 py-3 hover:bg-muted/40 ${!(n.is_read ?? n.read) ? 'bg-primary/5' : ''}`}>
                            <div className="flex items-start gap-2">
                              {!(n.is_read ?? n.read) && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                                {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                                <p className="text-[10px] text-muted-foreground mt-0.5">{n.created_at ? new Date(n.created_at).toLocaleString("en-GB") : ""}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={() => toast.info("Help & Guides are coming soon.")} className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted">
                <HelpCircle className="w-4 h-4" />
              </button>
              <button onClick={() => navigate("/profile")} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border bg-card hover:bg-muted">
                <span className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">{initials}</span>
                <span className="text-sm text-foreground hidden sm:block">Team Leader</span>
              </button>
            </div>
            <button onClick={() => navigate("/governance-pulse")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Record Signal
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard icon={Activity} tone="bg-blue-100 text-blue-600" label="Signals This Week" value={signalsThisWeek}
            delta={weekDelta !== 0 ? `${weekDelta > 0 ? "↑" : "↓"} ${Math.abs(weekDelta)} vs last week` : "No change vs last week"}
            deltaTone={weekDelta > 0 ? "text-emerald-600" : weekDelta < 0 ? "text-red-600" : "text-muted-foreground"}
            viewLabel="View my signals" onView={() => navigate("/pulse-history")} />
          <StatCard icon={ClipboardList} tone="bg-emerald-100 text-emerald-600" label="My Actions" value={myActions.length}
            delta={`${dueSoon.length} due this week`} deltaTone="text-amber-600"
            viewLabel="View my actions" onView={() => navigate("/my-actions")} />
          <StatCard icon={Clock} tone="bg-amber-100 text-amber-600" label="Actions Due Soon" value={dueSoon.length}
            delta="Due in next 7 days" viewLabel="View due actions" onView={() => navigate("/my-actions")} />
          <StatCard icon={TrendingUp} tone="bg-orange-100 text-orange-600" label="Escalations" value={myEsc.length}
            delta="Require your follow up" deltaTone={myEsc.length ? "text-red-600" : "text-muted-foreground"}
            viewLabel="View escalations" onView={() => navigate("/escalation-log")} />
          <StatCard icon={CheckCircle2} tone="bg-emerald-100 text-emerald-600" label="Closed This Month" value={closedThisMonth}
            delta="Escalations resolved" viewLabel="View closed escalations" onView={() => navigate("/escalation-log?status=Closed")} />
        </div>

        {/* Theme donut + Recent signals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Signals by Theme <span className="text-xs font-normal text-muted-foreground">(This Month)</span></h3>
            <div className="flex items-center gap-4">
              <div className="relative w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={totalSignals ? themeData : [{ name: "None", value: 1, color: "#e5e7eb" }]} dataKey="value" innerRadius={42} outerRadius={60} paddingAngle={2}>
                      {(totalSignals ? themeData : [{ color: "#e5e7eb" }]).map((d: any, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-semibold">{totalSignals}</span>
                  <span className="text-[10px] text-muted-foreground">Total Signals</span>
                </div>
              </div>
              <div className="space-y-1.5 text-xs flex-1">
                {themeData.slice(0, 6).map(d => {
                  const pct = totalSignals ? Math.round((d.value / totalSignals) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground flex-1">{d.name}</span>
                      <span className="font-medium">{d.value} <span className="text-muted-foreground">({pct}%)</span></span>
                    </div>
                  );
                })}
                {themeData.length === 0 && <p className="text-muted-foreground">No signals yet</p>}
              </div>
            </div>
            <button onClick={() => navigate("/pulse-history")} className="mt-4 w-full text-center text-xs text-primary flex items-center justify-center gap-1">View all signals <ArrowRight className="w-3 h-3" /></button>
          </div>

          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Recent Signals</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2">Date</th><th className="px-2">Theme</th><th className="px-2">Client</th><th className="px-2">Description</th><th className="px-2">Severity</th><th className="px-2">Status</th>
                </tr></thead>
                <tbody>
                  {signals.slice(0, 5).map(s => {
                    const status = s.review_status || s.status || "New";
                    return (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/signals/${s.id}`)}>
                        <td className="py-2.5 pr-2 whitespace-nowrap">{new Date(s.entry_date || s.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td className="px-2 font-medium">{Array.isArray(s.risk_domain) ? s.risk_domain[0] : (s.risk_domain || s.signal_type)}</td>
                        <td className="px-2 text-muted-foreground">{s.related_person || "—"}</td>
                        <td className="px-2 max-w-[220px] truncate text-muted-foreground">{s.description}</td>
                        <td className="px-2"><span className={`text-xs rounded px-2 py-0.5 ${SEVERITY_BADGE[s.severity] || "bg-muted"}`}>{s.severity}</span></td>
                        <td className="px-2"><span className={`text-xs rounded px-2 py-0.5 ${STATUS_BADGE[status] || "bg-muted text-muted-foreground"}`}>{status}</span></td>
                      </tr>
                    );
                  })}
                  {signals.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">No signals yet — record your first one.</td></tr>}
                </tbody>
              </table>
            </div>
            <button onClick={() => navigate("/pulse-history")} className="mt-4 w-full text-center text-xs text-primary flex items-center justify-center gap-1">View all signals <ArrowRight className="w-3 h-3" /></button>
          </div>
        </div>

        {/* Three panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">My Actions</h3>
            <div className="space-y-2">
              {myActions.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 cursor-pointer hover:bg-muted/30" onClick={() => navigate("/my-actions")}>
                  <div><div className="font-medium line-clamp-1">{a.title}</div><div className="text-xs text-muted-foreground">{a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}</div></div>
                  <span className="text-xs rounded px-2 py-0.5 bg-amber-100 text-amber-700 whitespace-nowrap">{a.status}</span>
                </div>
              ))}
              {myActions.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No open actions</p>}
            </div>
            <button onClick={() => navigate("/my-actions")} className="mt-4 w-full text-center text-xs text-primary flex items-center justify-center gap-1">View all my actions <ArrowRight className="w-3 h-3" /></button>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Actions Due Soon</h3>
            <div className="space-y-2">
              {dueSoon.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                  <div className="font-medium line-clamp-1">{a.title}</div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{a.due_date ? new Date(a.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""}</span>
                </div>
              ))}
              {dueSoon.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">Nothing due soon</p>}
            </div>
            <button onClick={() => navigate("/my-actions")} className="mt-4 w-full text-center text-xs text-primary flex items-center justify-center gap-1">View all due actions <ArrowRight className="w-3 h-3" /></button>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Escalations Requiring Follow Up</h3>
            <div className="space-y-2">
              {myEsc.slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 cursor-pointer hover:bg-muted/30" onClick={() => navigate("/escalation-log")}>
                  <div><div className="font-medium line-clamp-1">{e.risk_title || e.reason || "Escalation"}</div><div className="text-xs text-muted-foreground">{e.escalated_to_name || ""}</div></div>
                  <span className={`text-xs rounded px-2 py-0.5 whitespace-nowrap ${e.overdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{e.overdue ? "Overdue" : (e.lifecycle_status || "Under Review")}</span>
                </div>
              ))}
              {myEsc.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">None</p>}
            </div>
            <button onClick={() => navigate("/escalation-log")} className="mt-4 w-full text-center text-xs text-primary flex items-center justify-center gap-1">View all escalations <ArrowRight className="w-3 h-3" /></button>
          </div>
        </div>

        {/* Quick actions + What's new */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            {/* De-duplicated: the stat cards + header already link to signals, actions,
                escalations and Record Signal — only genuinely new entry points remain here. */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Team Signals", icon: Layers, onClick: () => navigate("/governance-dashboard") },
                { label: "Weekly Review", icon: FileText, onClick: () => navigate("/weekly-review") },
                { label: "Help & Guides", icon: HelpCircle, onClick: () => toast.info("Help & Guides are coming soon.") },
              ].map(q => (
                <button key={q.label} onClick={q.onClick} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted text-xs text-center">
                  <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"><q.icon className="w-4 h-4" /></span>
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">What's New</h3>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
              <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-semibold mt-0.5">NEW</span>
              <div className="text-sm">
                <p className="font-medium flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-primary" /> Effectiveness reviews</p>
                <p className="text-xs text-muted-foreground mt-1">You can now see when actions are working. Learn more in Help &amp; Guides.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
