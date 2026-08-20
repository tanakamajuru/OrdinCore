import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle, ChevronRight, ShieldCheck, RefreshCw, Search, Shield, AlertTriangle, Users,
  FileText, Bell, TrendingUp, PlusCircle, Flag, ClipboardList, Layers, CheckCircle2,
  Zap, Info, Clock,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { apiClient as fetchClient } from "@/services/api";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { GovernanceDecisions } from "./GovernanceDecisions";

interface DashboardData {
  highPriority: any[]; pattern_signals: any[]; risk_candidates: any[]; actions: any[];
  promotion_threshold?: number; open_escalations?: number;
}
const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const isoToday = () => new Date().toISOString().slice(0, 10);
const isoDay = (d: any) => { try { return d ? new Date(d).toISOString().slice(0, 10) : ""; } catch { return ""; } };
const prettyDay = (isoStr: string) => { try { return new Date(isoStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); } catch { return isoStr; } };

export function DailyOversightBoard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [houses, setHouses] = useState<any[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<string>("");
  // The day the narrative/team brief is drafted for — defaults to today, but the RM can
  // review or regenerate for an earlier date. Signals are scoped to this date and the
  // selected house, so the narrative stays about that site on that day.
  const [reviewDate, setReviewDate] = useState<string>(isoToday());
  const [dailyNote, setDailyNote] = useState("");
  const [isSigningOff, setIsSigningOff] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [signedOff, setSignedOff] = useState<{ by: string; at: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const currentUserId = currentUser.id || currentUser.user_id;
  const userName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() || "Registered Manager";
  const house = houses.find((h) => h.id === selectedHouseId) || houses[0] || null;
  const isDeputyCover = !!house && house.deputy_rm_id === currentUserId;

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      // Doctrine: the Daily Governance board no longer depends on /rm/patterns. Patterns live in
      // the separate Pipeline module; the daily flow is signals -> decisions -> Team Brief.
      const [dashRes, housesRes] = await Promise.all([
        apiClient.get("/pulses/dashboard"),
        currentUserId ? apiClient.get(`/users/${currentUserId}/houses`).catch(() => ({ data: {} })) : Promise.resolve({ data: {} }),
      ]);
      setData(dashRes.data.data);
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

  // ---- derived daily posture (signals, escalations, actions — NOT patterns) ----
  const openEsc = data?.open_escalations ?? 0;
  const highPriority = data?.highPriority ?? [];
  const actions = data?.actions ?? [];
  const openActions = actions.length;
  const isDue = (a: any) => a.due_date && new Date(a.due_date).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0);
  const actionsDueToday = actions.filter(isDue).length;

  // ---- Team Brief context (grounded daily summary) ----
  const summaryPayload = {
    high_risk_concerns: highPriority.length,
    escalations_awaiting_review: openEsc,
    governance_actions_due_today: actionsDueToday,
    overall_posture: highPriority.length > 0 || openEsc > 0 ? "Attention" : "Stable",
  };

  // Materiality decides whether Team Leaders must acknowledge the brief, or simply see
  // "no new governance priorities today" (Chapter 2 — proportionate acknowledgement).
  const materialChange = highPriority.length > 0 || openEsc > 0 || actionsDueToday > 0;

  // Per-house narration: the RM signs off ONE house at a time, so the narrative must be
  // about THAT house's actual signals — not a service-wide summary they can't attest to.
  const generateNarrative = async () => {
    if (!selectedHouseId) return;
    setAiBusy(true);
    try {
      let houseSignals: any[] = [];
      try {
        const sres = await apiClient.get(`/pulses?house_id=${selectedHouseId}&limit=50`);
        const raw = sres.data?.data || sres.data || [];
        houseSignals = Array.isArray(raw) ? raw : (raw.items || raw.pulses || []);
      } catch { /* fall back to no signals */ }
      const houseName = house?.name || "this service";
      // Doctrine: exact house/date scoping — the narrative/brief is about THIS site on THAT day
      // only. Never substitute older signals; if the day is silent, that silence is the evidence.
      const daySignals = houseSignals.filter((s: any) => isoDay(s.entry_date || s.created_at) === reviewDate);
      const periodLabel = prettyDay(reviewDate);
      const signalLines = daySignals.slice(0, 25).map((s: any) =>
        `${(s.entry_date || s.created_at) ? new Date(s.entry_date || s.created_at).toLocaleDateString("en-GB") : ""} · ${s.severity || "—"} · ${s.governance_domain || s.signal_type || "Signal"}${s.related_person ? ` (${s.related_person})` : ""}: ${s.description || ""}`.trim());
      const houseHigh = daySignals.filter((s: any) => ["High", "Critical"].includes(s.severity));

      // Doctrine: the daily governance output is the Team Brief for Team Leaders — a concise
      // operational briefing grounded in THIS house/date's signals. There is no separate
      // "leadership narrative" in the daily flow (that belongs to the monthly/board narrative).
      const brief = await fetchClient.post("/reports/narrative", {
        reportTitle: `Daily Governance Team Brief — ${houseName}`, periodLabel, serviceName: houseName,
        data: {
          audience: "Team Leaders",
          style: "concise operational briefing that summarises today's signals at this house — what to watch, who, and the immediate actions",
          service: houseName,
          signals_recorded: houseSignals.length,
          high_or_critical: houseHigh.length,
          signals: signalLines,
          actions_due_today: actionsDueToday,
          escalations_awaiting_review: openEsc,
          overall_posture: houseHigh.length ? "Attention" : "Stable",
        },
      });
      const briefOut = (brief as any)?.data?.data ?? (brief as any)?.data ?? brief;
      setDailyNote(briefOut?.narrative || "");
    } catch { toast.error("Couldn't generate the team brief — you can write it below."); }
    finally { setAiBusy(false); }
  };

  // When the house/date changes: if a signed-off log already exists for that service and day,
  // show it read-only (historical playback). Otherwise auto-draft a fresh narrative.
  useEffect(() => {
    if (isLoading || !data || !selectedHouseId) return;
    let cancelled = false;
    (async () => {
      try {
        const r: any = await apiClient.get(`/governance/daily-log/by-date?house_id=${selectedHouseId}&date=${reviewDate}`);
        const log = r.data?.data;
        if (!cancelled && log && log.completed) {
          setDailyNote(log.team_brief || log.leadership_narrative || log.daily_note || "");
          const at = log.published_at || log.completed_at;
          setSignedOff({ by: log.published_by_name || log.reviewed_by_name || "—", at: at ? new Date(at).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "long", year: "numeric" }) : prettyDay(reviewDate) });
          return;
        }
      } catch { /* no stored log — draft fresh below */ }
      if (cancelled) return;
      setSignedOff(null);
      generateNarrative();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, data, selectedHouseId, reviewDate]);

  const handleSignOff = async () => {
    if (!dailyNote.trim()) { toast.error("A team brief is required for sign-off."); return; }
    if (!selectedHouseId) { toast.error("Choose which service you are signing off."); return; }
    setIsSigningOff(true);
    try {
      const openRes = await apiClient.post("/governance/daily-log/open", { house_id: selectedHouseId });
      const logId = openRes.data?.id || openRes.data?.data?.id;
      // The Team Brief is the daily operational output; persisted to both columns for
      // backward-compatible storage/readers (no separate leadership narrative in the daily flow).
      await apiClient.post(`/governance/daily-log/${logId}/complete`, {
        note: dailyNote,
        team_brief: dailyNote,
        leadership_narrative: dailyNote,
        material_change: materialChange,
        is_deputy_review: isDeputyCover,
      });
      setSignedOff({ by: userName, at: new Date().toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "long", year: "numeric" }) });
      toast.success("Team brief signed off");
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
          </div>
        </div>

        {/* Colour-coded KPI cards — governance workload for the day (patterns live in the
            separate Pipeline module, not this daily board). */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI value={highPriority.length} label="High Priority (48h)" tone="orange" Icon={Bell} />
          <KPI value={actionsDueToday} label="Actions Due Today" tone="blue" Icon={ClipboardList} />
          <KPI value={openActions} label="Open Actions" tone="green" Icon={Layers} />
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
                  <button key={s.id} onClick={() => navigate(`/signals/${s.id}`)} className="w-full text-left flex items-start justify-between gap-3 p-3 bg-background border border-border rounded-lg hover:border-primary">
                    <div className="min-w-0 flex-1"><div className="text-sm font-medium text-foreground">{s.house_name} – {s.signal_type}</div><p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap break-words">{s.description}</p></div>
                    <ChevronRight size={16} className="text-primary shrink-0 mt-0.5" />
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

          {/* Governance actions (patterns are handled in the separate Pipeline module) */}
          <div className="space-y-6">
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
            <TodoCard Icon={Shield} label="Review Systematic Strategic Oversight" tone="text-violet-600" onClick={() => navigate("/risk-register?tab=strategic")} />
            <TodoCard Icon={AlertTriangle} label="Review Risk Register" tone="text-orange-600" onClick={() => navigate("/risk-register")} />
            <TodoCard Icon={Users} label="Review Escalations" tone="text-blue-600" onClick={() => navigate("/escalation-log")} />
            <TodoCard Icon={FileText} label="Publish / Update Weekly Review" tone="text-teal-600" onClick={() => navigate("/weekly-review")} />
            <TodoCard Icon={Flag} label="Handle Escalations" tone="text-purple-600" onClick={() => navigate("/escalation-log")} />
            <TodoCard Icon={PlusCircle} label="Record New Signal" tone="text-slate-600" onClick={() => navigate("/governance-pulse")} />
          </div>
        </div>

        {/* Governance Decisions — the review that generates management work (Ch3).
            Signals are fetched per-house inside the component; patterns for this service. */}
        <GovernanceDecisions houseId={selectedHouseId} reviewDate={reviewDate} readOnly={!!signedOff} />

        {/* Governance summary + AI narrative sign-off */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border-2 border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">Governance Summary for Today</h3>
            <div className="space-y-3">
              <SummaryLine Icon={highPriority.length ? AlertTriangle : CheckCircle2} tone={highPriority.length ? "text-red-600" : "text-emerald-600"} title={highPriority.length ? `${highPriority.length} high-risk concern(s) recorded today.` : "No new high-risk concerns recorded today."} />
              <SummaryLine Icon={AlertCircle} tone="text-orange-600" title={`${openEsc} escalation(s) awaiting your review.`} />
              <SummaryLine Icon={ClipboardList} tone="text-blue-600" title={`${actionsDueToday} action(s) due today.`} />
              <SummaryLine Icon={TrendingUp} tone="text-violet-600" title={`Overall governance posture: ${summaryPayload.overall_posture}`} sub={summaryPayload.overall_posture === "Attention" ? "Review the priorities below before signing off." : "No significant governance concerns today."} />
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2"><Users size={15} /> Team Brief <span className="normal-case font-normal text-muted-foreground">· published to Team Leaders</span></h3>
              <button onClick={generateNarrative} disabled={aiBusy || !!signedOff} className="text-xs text-primary disabled:opacity-50">{aiBusy ? "Generating…" : "Regenerate"}</button>
            </div>
            {/* Service + date stay selectable even after sign-off, so leadership can browse and
                play back previously signed-off briefs for any service on any past date. */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              {houses.length > 1 && (
                <select value={selectedHouseId} onChange={(e) => setSelectedHouseId(e.target.value)} className="flex-1 p-2.5 border-2 border-border rounded-lg bg-background text-sm">
                  {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              )}
              <input type="date" value={reviewDate} max={isoToday()} onChange={(e) => setReviewDate(e.target.value || isoToday())}
                title="Draft or play back the team brief for this date"
                className="p-2.5 border-2 border-border rounded-lg bg-background text-sm" />
            </div>
            {signedOff && reviewDate !== isoToday() && (
              <div className="mb-3 text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1">Viewing the signed-off brief for {prettyDay(reviewDate)} — read only.</div>
            )}
            {!materialChange && !signedOff && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5 mb-2">No material change today — Team Leaders will see "No new governance priorities today. Continue with existing actions." You can still record a brief below.</p>
            )}
            <textarea ref={noteRef} value={dailyNote} onChange={(e) => setDailyNote(e.target.value)} disabled={!!signedOff}
              className="w-full h-64 p-4 border-2 border-border rounded-lg bg-background text-sm leading-7 disabled:opacity-70"
              placeholder={aiBusy ? "Drafting today's team brief…" : "Today's priorities, emerging concerns and immediate actions for Team Leaders — grounded in the signals and actions above."} />

            {signedOff ? (
              <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={18} /><span className="font-semibold">Today's Governance Status: Complete</span></div>
                <p className="text-sm text-muted-foreground mt-1">Signed by: {signedOff.by} · {signedOff.at}</p>
                <p className="text-[11px] text-muted-foreground mt-1">This entry constitutes a forensic audit point for CQC Well-Led inspections.</p>
              </div>
            ) : (
              <>
                <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5">
                  <Info size={14} className="mt-0.5 shrink-0" /> Please review the drafted team brief. You can edit it before signing off — you remain accountable for the signed record.
                </div>
                <p className="text-sm text-foreground mt-3 mb-2">Do you accept this team brief?</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={() => setShowPreview(true)} disabled={!dailyNote.trim()} className="flex items-center gap-2 px-4 py-2 border-2 border-primary/40 text-primary rounded-lg text-sm font-medium disabled:opacity-50">
                    <Search size={16} /> Preview report
                  </button>
                  <button onClick={handleSignOff} disabled={isSigningOff || !dailyNote.trim()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                    <CheckCircle2 size={16} /> {isSigningOff ? "Signing…" : "Accept & Sign Off"}
                  </button>
                  <button onClick={() => noteRef.current?.focus()} className="flex items-center gap-2 px-4 py-2 border-2 border-border rounded-lg text-sm">
                    <FileText size={16} /> Edit Brief
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Governance Compliance now lives on its own page (see nav) to avoid overload here. */}
      </div>

      {/* Report preview before sign-off — a full, readable rendering of both narratives. */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-card w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-xl shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Daily Governance Report — {house?.name || "Service"}</h3>
                <p className="text-xs text-muted-foreground">{today()} · preview before sign-off</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Team Brief <span className="normal-case font-normal text-muted-foreground">(published to Team Leaders)</span></div>
                <div className="text-[15px] leading-8 text-foreground whitespace-pre-wrap">{materialChange ? (dailyNote || "—") : "No new governance priorities today. Continue with existing actions."}</div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowPreview(false)} className="px-4 py-2 rounded-lg border-2 border-border text-sm">Keep editing</button>
              <button onClick={() => { setShowPreview(false); handleSignOff(); }} disabled={isSigningOff || !dailyNote.trim()} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                <CheckCircle2 size={16} /> Accept & Sign Off
              </button>
            </div>
          </div>
        </div>
      )}
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
