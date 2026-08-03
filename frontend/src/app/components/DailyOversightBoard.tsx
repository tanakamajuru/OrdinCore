import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle, ChevronRight, ShieldCheck, RefreshCw, Search, Shield, AlertTriangle, Users,
  FileText, Bell, TrendingUp, PlusCircle, Activity, Flag, ClipboardList, Layers, CheckCircle2,
  Zap, Info, Clock,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { apiClient as fetchClient } from "@/services/api";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { GovernanceCompliancePanel } from "./GovernanceCompliancePanel";
import { GovernanceDecisions } from "./GovernanceDecisions";

interface DashboardData {
  highPriority: any[]; pattern_signals: any[]; risk_candidates: any[]; actions: any[];
  promotion_threshold?: number; open_escalations?: number;
}
type PatternStats = { awaiting: number; promoted_today: number; dismissed_today: number; avg_promotion_days: number };

const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export function DailyOversightBoard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [stats, setStats] = useState<PatternStats>({ awaiting: 0, promoted_today: 0, dismissed_today: 0, avg_promotion_days: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [houses, setHouses] = useState<any[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<string>("");
  const [dailyNote, setDailyNote] = useState("");
  const [teamBrief, setTeamBrief] = useState("");
  const [isSigningOff, setIsSigningOff] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [signedOff, setSignedOff] = useState<{ by: string; at: string } | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const currentUserId = currentUser.id || currentUser.user_id;
  const userName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() || "Registered Manager";
  const house = houses.find((h) => h.id === selectedHouseId) || houses[0] || null;
  const isDeputyCover = !!house && house.deputy_rm_id === currentUserId;

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const [dashRes, housesRes, statsRes] = await Promise.all([
        apiClient.get("/pulses/dashboard"),
        currentUserId ? apiClient.get(`/users/${currentUserId}/houses`).catch(() => ({ data: {} })) : Promise.resolve({ data: {} }),
        apiClient.get("/rm/pattern-stats").catch(() => ({ data: {} })),
      ]);
      setData(dashRes.data.data);
      setStats(((statsRes as any).data?.data || (statsRes as any).data || {}) as PatternStats);
      let list = (housesRes as any).data?.data || (housesRes as any).data || [];
      if (!Array.isArray(list) || list.length === 0) {
        try { const allRes = await apiClient.get("/houses"); list = allRes.data?.data || allRes.data || []; } catch { list = []; }
      }
      const arr = Array.isArray(list) ? list : [];
      setHouses(arr);
      setSelectedHouseId(arr[0]?.id || "");
    } catch { toast.error("Failed to load oversight board"); }
    finally { setIsLoading(false); }
  };

  // ---- derived posture ----
  const THRESHOLD = data?.promotion_threshold ?? 3;
  const patterns = data?.pattern_signals ?? [];
  const isReady = (c: any) => c.signal_count >= THRESHOLD || c.has_critical;
  const isNearly = (c: any) => !isReady(c) && c.signal_count === THRESHOLD - 1;
  const deterioratingCount = patterns.filter((c) => c.trajectory === "Deteriorating" || c.trajectory === "Critical").length;
  const nearlyCount = patterns.filter(isNearly).length;
  const readyCount = patterns.filter(isReady).length;
  const openEsc = data?.open_escalations ?? 0;
  const highPriority = data?.highPriority ?? [];
  const actions = data?.actions ?? [];
  const isDue = (a: any) => a.due_date && new Date(a.due_date).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0);
  const actionsDueToday = actions.filter(isDue).length;
  const nearPromotion = nearlyCount + readyCount;

  // ---- AI narrative (grounded daily summary) ----
  const summaryPayload = {
    high_risk_concerns: highPriority.length,
    escalations_awaiting_review: openEsc,
    governance_actions_due_today: actionsDueToday,
    patterns_awaiting_review: stats.awaiting,
    patterns_ready_to_promote: readyCount,
    deteriorating_patterns: deterioratingCount,
    overall_posture: deterioratingCount > 0 || highPriority.length > 0 ? "Attention" : "Stable",
  };

  // Materiality decides whether Team Leaders must acknowledge a brief, or simply see
  // "no new governance priorities today" (Chapter 2 — proportionate acknowledgement).
  const materialChange = highPriority.length > 0 || openEsc > 0 || actionsDueToday > 0 || deterioratingCount > 0 || readyCount > 0;

  const generateNarrative = async () => {
    setAiBusy(true);
    try {
      const [lead, brief] = await Promise.all([
        fetchClient.post("/reports/narrative", {
          reportTitle: "Daily Governance Summary — Leadership Narrative", periodLabel: today(),
          serviceName: house?.name, data: summaryPayload,
        }),
        materialChange ? fetchClient.post("/reports/narrative", {
          reportTitle: "Daily Governance Team Brief",
          periodLabel: today(), serviceName: house?.name,
          // A concise operational briefing for Team Leaders: priorities, emerging concerns,
          // immediate actions — no strategic/leadership commentary.
          data: {
            audience: "Team Leaders",
            style: "concise operational briefing — today's priorities, emerging concerns and immediate actions only",
            todays_priorities: highPriority.slice(0, 5).map((s: any) => `${s.house_name}: ${s.signal_type}`),
            actions_due_today: actionsDueToday,
            escalations_awaiting_review: openEsc,
            emerging_patterns_near_promotion: nearPromotion,
            deteriorating_patterns: deterioratingCount,
          },
        }) : Promise.resolve(null),
      ]);
      const leadOut = (lead as any)?.data?.data ?? (lead as any)?.data ?? lead;
      setDailyNote(leadOut?.narrative || "");
      if (brief) {
        const briefOut = (brief as any)?.data?.data ?? (brief as any)?.data ?? brief;
        setTeamBrief(briefOut?.narrative || "");
      } else {
        setTeamBrief("");
      }
    } catch { toast.error("Couldn't generate the narrative — you can write it below."); }
    finally { setAiBusy(false); }
  };

  // Auto-draft once the day's data is in and nothing's typed yet.
  useEffect(() => {
    if (!isLoading && data && !dailyNote && !signedOff) generateNarrative();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, data]);

  const handleSignOff = async () => {
    if (!dailyNote.trim()) { toast.error("A daily governance narrative is required for sign-off."); return; }
    if (!selectedHouseId) { toast.error("Choose which service you are signing off."); return; }
    setIsSigningOff(true);
    try {
      const openRes = await apiClient.post("/governance/daily-log/open", { house_id: selectedHouseId });
      const logId = openRes.data?.id || openRes.data?.data?.id;
      await apiClient.post(`/governance/daily-log/${logId}/complete`, {
        note: dailyNote,
        leadership_narrative: dailyNote,
        team_brief: teamBrief,
        material_change: materialChange,
        is_deputy_review: isDeputyCover,
      });
      setSignedOff({ by: userName, at: new Date().toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "long", year: "numeric" }) });
      toast.success("Daily governance signed off");
    } catch { toast.error("Sign-off failed"); }
    finally { setIsSigningOff(false); }
  };

  // ---- KPI card ----
  const KPI = ({ value, label, tone, Icon, sub }: { value: number; label: string; tone: string; Icon: any; sub?: string }) => {
    const tones: Record<string, { top: string; badge: string; text: string }> = {
      green: { top: "border-t-emerald-500", badge: "bg-emerald-500", text: "text-emerald-600" },
      red: { top: "border-t-red-500", badge: "bg-red-500", text: "text-red-600" },
      amber: { top: "border-t-amber-500", badge: "bg-amber-500", text: "text-amber-600" },
      blue: { top: "border-t-blue-500", badge: "bg-blue-500", text: "text-blue-600" },
      orange: { top: "border-t-orange-500", badge: "bg-orange-500", text: "text-orange-600" },
      slate: { top: "border-t-slate-700", badge: "bg-slate-700", text: "text-slate-700" },
    };
    const t = tones[tone] || tones.slate;
    return (
      <div className={`bg-card border-2 border-border ${t.top} border-t-4 rounded-xl p-4`}>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
        <div className="flex items-center justify-between">
          <div className="text-3xl font-bold text-foreground">{value}</div>
          <div className={`w-10 h-10 rounded-full ${t.badge} text-white flex items-center justify-center`}><Icon size={18} /></div>
        </div>
        {sub && <div className="text-[11px] text-muted-foreground mt-2">{sub}</div>}
      </div>
    );
  };

  const SummaryItem = ({ Icon, tone, text }: { Icon: any; tone: string; text: React.ReactNode }) => (
    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tone}`}><Icon size={17} /></div>
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );

  const TodoCard = ({ Icon, label, tone, onClick }: { Icon: any; label: string; tone: string; onClick: () => void }) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:shadow-sm transition-all ${tone}`}>
      <Icon size={22} />
      <span className="text-xs font-medium text-center text-foreground leading-tight">{label}</span>
    </button>
  );

  const prioBadge = (p?: string) => {
    const v = String(p || "").toUpperCase();
    if (v.includes("HIGH") || v.includes("CRIT") || v.includes("URGENT")) return { label: "HIGH", cls: "bg-red-500 text-white" };
    if (v.includes("MED") || v.includes("MOD")) return { label: "MEDIUM", cls: "bg-amber-500 text-white" };
    return { label: "LOW", cls: "bg-blue-500 text-white" };
  };
  const dueLabel = (a: any) => {
    if (!a.due_date) return "—";
    const d = new Date(a.due_date); const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    if (dd < t0) return "Overdue";
    if (dd.getTime() === t0.getTime()) return "Today";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  );

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 lg:px-10 pt-24 max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">RM Daily Oversight</h1>
            <p className="text-muted-foreground mt-1">Your daily command centre for governance and risk management.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{today()}</span>
            <button onClick={() => { setIsLoading(true); loadDashboard(); }} className="text-sm text-primary flex items-center gap-1.5"><RefreshCw size={15} /> Refresh</button>
          </div>
        </div>

        {/* Today's Governance Summary */}
        <div className="bg-card border-2 border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={18} className="text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Today's Governance Summary</h2>
          </div>
          <div className="flex flex-wrap gap-5">
            <SummaryItem Icon={highPriority.length ? AlertTriangle : ShieldCheck} tone={highPriority.length ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"}
              text={highPriority.length ? <><b>{highPriority.length}</b> high-risk concern{highPriority.length === 1 ? "" : "s"}.</> : "No new high-risk concerns."} />
            <SummaryItem Icon={AlertCircle} tone="bg-orange-500/10 text-orange-600" text={<><b>{openEsc}</b> escalation{openEsc === 1 ? "" : "s"} awaiting review.</>} />
            <SummaryItem Icon={ClipboardList} tone="bg-blue-500/10 text-blue-600" text={<><b>{actionsDueToday}</b> action{actionsDueToday === 1 ? "" : "s"} due today.</>} />
            <SummaryItem Icon={TrendingUp} tone="bg-violet-500/10 text-violet-600" text={<><b>{nearPromotion}</b> pattern{nearPromotion === 1 ? "" : "s"} close to promotion.</>} />
          </div>
        </div>

        {/* Colour-coded KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPI value={patterns.length} label="Active Patterns" tone="green" Icon={TrendingUp} />
          <KPI value={deterioratingCount} label="Deteriorating" tone="red" Icon={Activity} />
          <KPI value={nearlyCount} label="Nearly Promotable" tone="amber" Icon={Clock} />
          <KPI value={readyCount} label="Ready to Promote" tone="blue" Icon={ChevronRight} />
          <KPI value={highPriority.length} label="High Priority (48h)" tone="orange" Icon={Bell} />
          <KPI value={openEsc} label="Open Escalations" tone="slate" Icon={AlertCircle} />
        </div>

        {/* Signals + Patterns/Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Signals requiring attention */}
          <div className="bg-card border-2 border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap size={16} className="text-red-500" /> Signals Requiring Attention <span className="text-xs bg-muted rounded-full px-2 py-0.5">{highPriority.length}</span></h3>
              <button onClick={() => navigate("/rm5")} className="text-sm text-primary flex items-center gap-1">View all signals <ChevronRight size={14} /></button>
            </div>
            {highPriority.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3"><Bell size={22} className="text-muted-foreground" /></div>
                <p className="font-semibold text-foreground">No High Priority Signals</p>
                <p className="text-sm text-muted-foreground">You're all caught up. Great work!</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {highPriority.slice(0, 4).map((s: any) => (
                  <button key={s.id} onClick={() => navigate(`/signals/${s.id}`)} className="w-full text-left flex items-center justify-between gap-3 p-3 bg-background border border-border rounded-lg hover:border-primary">
                    <div className="min-w-0"><div className="text-sm font-medium text-foreground truncate">{s.house_name} – {s.signal_type}</div><p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p></div>
                    <ChevronRight size={16} className="text-primary shrink-0" />
                  </button>
                ))}
              </div>
            )}
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Quick actions</p>
              {[
                { icon: PlusCircle, label: "Record new signal", go: () => navigate("/governance-pulse") },
                { icon: Search, label: "Review all signals", go: () => navigate("/rm5") },
                { icon: Clock, label: "Check overdue actions", go: () => navigate("/risk-register") },
                { icon: FileText, label: "Publish weekly review", go: () => navigate("/weekly-review") },
              ].map((q) => (
                <button key={q.label} onClick={q.go} className="w-full flex items-center gap-2.5 py-2 text-sm text-foreground hover:text-primary">
                  <q.icon size={16} className="text-primary" /> {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Emerging patterns + Governance actions */}
          <div className="space-y-6">
            <div className="bg-card border-2 border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Review Emerging Patterns</h3>
                <button onClick={() => navigate("/rm5")} className="text-sm text-primary flex items-center gap-1">View all patterns <ChevronRight size={14} /></button>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center mb-4">
                {[[stats.awaiting, "Patterns awaiting review"], [stats.promoted_today, "Promoted today"], [stats.dismissed_today, "Dismissed today"], [stats.avg_promotion_days, "Avg promotion (days)"]].map(([v, l], i) => (
                  <div key={i}><div className="text-2xl font-bold text-foreground">{v as number}</div><div className="text-[10px] text-muted-foreground leading-tight mt-1">{l as string}</div></div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground max-w-[60%]">Promote, dismiss and track emerging patterns before they escalate.</p>
                <button onClick={() => navigate("/rm5")} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold">Review Patterns</button>
              </div>
            </div>

            <div className="bg-card border-2 border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">Governance Actions <span className="text-xs bg-muted rounded-full px-2 py-0.5">{actions.length}</span></h3>
                <button onClick={() => navigate("/risk-register")} className="text-sm text-primary flex items-center gap-1">View all actions <ChevronRight size={14} /></button>
              </div>
              {actions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No governance actions outstanding.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[11px] uppercase text-muted-foreground border-b border-border"><th className="py-2">Priority</th><th>Action</th><th>Related to</th><th>Due</th></tr></thead>
                  <tbody>
                    {[...actions].sort((a, b) => (new Date(a.due_date || 0).getTime()) - (new Date(b.due_date || 0).getTime())).slice(0, 5).map((a: any, i) => {
                      const b = prioBadge(a.priority || a.severity);
                      const due = dueLabel(a);
                      return (
                        <tr key={a.id || i} className="border-b border-border/50 cursor-pointer hover:bg-muted/40" onClick={() => a.risk_id ? navigate(`/risk-register/${a.risk_id}`) : navigate("/risk-register")}>
                          <td className="py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${b.cls}`}>{b.label}</span></td>
                          <td className="pr-2">{a.title || a.action || "Action"}</td>
                          <td className="pr-2 text-muted-foreground">{a.house_name || a.related_person || a.risk_title || "—"}</td>
                          <td className={due === "Overdue" || due === "Today" ? "text-red-600 font-medium" : "text-muted-foreground"}>{due}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* What to do today */}
        <div className="bg-card border-2 border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">What to do today</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <TodoCard Icon={Search} label="Review Interventions" tone="text-emerald-600" onClick={() => navigate("/interventions")} />
            <TodoCard Icon={Shield} label="Review Systematic Strategic Oversight" tone="text-violet-600" onClick={() => navigate("/rm5")} />
            <TodoCard Icon={AlertTriangle} label="Review Risk Register" tone="text-orange-600" onClick={() => navigate("/risk-register")} />
            <TodoCard Icon={Users} label="Review Escalations" tone="text-blue-600" onClick={() => navigate("/escalation-log")} />
            <TodoCard Icon={FileText} label="Publish / Update Weekly Review" tone="text-teal-600" onClick={() => navigate("/weekly-review")} />
            <TodoCard Icon={Flag} label="Handle Escalations" tone="text-purple-600" onClick={() => navigate("/escalation-log")} />
            <TodoCard Icon={TrendingUp} label="Review Emerging Patterns" tone="text-amber-600" onClick={() => navigate("/rm5")} />
            <TodoCard Icon={PlusCircle} label="Record New Signal" tone="text-slate-600" onClick={() => navigate("/governance-pulse")} />
          </div>
        </div>

        {/* Governance Decisions — the review that generates management work (Ch3) */}
        <GovernanceDecisions houseId={selectedHouseId} />

        {/* Governance summary + AI narrative sign-off */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border-2 border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">Governance Summary for Today</h3>
            <div className="space-y-3">
              <SummaryLine Icon={highPriority.length ? AlertTriangle : CheckCircle2} tone={highPriority.length ? "text-red-600" : "text-emerald-600"} title={highPriority.length ? `${highPriority.length} high-risk concern(s) recorded today.` : "No new high-risk concerns recorded today."} />
              <SummaryLine Icon={AlertCircle} tone="text-orange-600" title={`${openEsc} escalation(s) awaiting your review.`} />
              <SummaryLine Icon={ClipboardList} tone="text-blue-600" title={`${actionsDueToday} action(s) due today.`} />
              <SummaryLine Icon={TrendingUp} tone="text-violet-600" title={`Overall risk posture: ${summaryPayload.overall_posture}`} sub={deterioratingCount ? `${deterioratingCount} pattern(s) deteriorating.` : "No significant deterioration detected."} />
              <SummaryLine Icon={Layers} tone="text-teal-600" title={`Patterns: ${stats.awaiting} awaiting · ${readyCount} ready to promote.`} />
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Leadership Narrative <span className="normal-case font-normal text-muted-foreground">· private to leadership</span></h3>
              <button onClick={generateNarrative} disabled={aiBusy || !!signedOff} className="text-xs text-primary disabled:opacity-50">{aiBusy ? "Generating…" : "Regenerate"}</button>
            </div>
            {houses.length > 1 && !signedOff && (
              <select value={selectedHouseId} onChange={(e) => setSelectedHouseId(e.target.value)} className="w-full mb-3 p-2.5 border-2 border-border rounded-lg bg-background text-sm">
                {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            )}
            <textarea ref={noteRef} value={dailyNote} onChange={(e) => setDailyNote(e.target.value)} disabled={!!signedOff}
              className="w-full h-40 p-3 border-2 border-border rounded-lg bg-background text-sm leading-6 disabled:opacity-70"
              placeholder={aiBusy ? "Drafting the day's narrative…" : "Considering all triage, patterns and actions above — what is the service position today?"} />

            {/* Team Brief — the concise operational briefing published to Team Leaders (Ch2). */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} className="text-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">Team Brief · published to Team Leaders</h4>
              </div>
              {materialChange ? (
                <textarea value={teamBrief} onChange={(e) => setTeamBrief(e.target.value)} disabled={!!signedOff}
                  className="w-full h-24 p-3 border-2 border-border rounded-lg bg-background text-sm leading-6 disabled:opacity-70"
                  placeholder={aiBusy ? "Drafting the team brief…" : "Today's priorities, emerging concerns and immediate actions for Team Leaders."} />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5">No material change today — Team Leaders will see "No new governance priorities today. Continue with existing actions." (no acknowledgement required).</p>
              )}
            </div>

            {signedOff ? (
              <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={18} /><span className="font-semibold">Today's Governance Status: Complete</span></div>
                <p className="text-sm text-muted-foreground mt-1">Signed by: {signedOff.by} · {signedOff.at}</p>
                <p className="text-[11px] text-muted-foreground mt-1">This entry constitutes a forensic audit point for CQC Well-Led inspections.</p>
              </div>
            ) : (
              <>
                <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5">
                  <Info size={14} className="mt-0.5 shrink-0" /> Please review the drafted narrative. You can edit it before signing off — you remain accountable for the signed record.
                </div>
                <p className="text-sm text-foreground mt-3 mb-2">Do you accept this narrative?</p>
                <div className="flex items-center gap-3">
                  <button onClick={handleSignOff} disabled={isSigningOff || !dailyNote.trim()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                    <CheckCircle2 size={16} /> {isSigningOff ? "Signing…" : "Accept & Sign Off"}
                  </button>
                  <button onClick={() => noteRef.current?.focus()} className="flex items-center gap-2 px-4 py-2 border-2 border-border rounded-lg text-sm">
                    <FileText size={16} /> Edit Narrative
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Governance Compliance (kept — per-staff action compliance, not duplicated above) */}
        <GovernanceCompliancePanel />
      </div>
    </div>
  );
}

function SummaryLine({ Icon, tone, title, sub }: { Icon: any; tone: string; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={18} className={`${tone} mt-0.5 shrink-0`} />
      <div><p className="text-sm text-foreground">{title}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
    </div>
  );
}
