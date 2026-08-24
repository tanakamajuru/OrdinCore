import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle, ChevronRight, ShieldCheck, RefreshCw, Search, Shield, AlertTriangle, Users,
  FileText, Bell, PlusCircle, Flag, ClipboardList, Layers, CheckCircle2,
  Info, Clock,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
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

  // Per-house narration: the RM signs off ONE house at a time. The Team Brief is assembled
  // DETERMINISTICALLY from this house's real signals, decisions, escalations and actions on
  // the selected date — no language model — so it follows the RM's paper "Daily Governance
  // Review" format exactly and can never hallucinate content that wasn't recorded.
  const generateNarrative = async () => {
    if (!selectedHouseId) return;
    setAiBusy(true);
    try {
      const houseName = house?.name || "this service";
      const periodLabel = prettyDay(reviewDate);
      const reviewedBy = userName;
      const reviewTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

      // 1. This house's signals for THIS date only (exact scoping — if the day is silent, that
      //    silence is the evidence; never substitute older signals).
      let houseSignals: any[] = [];
      try {
        const sres = await apiClient.get(`/pulses?house_id=${selectedHouseId}&limit=100`);
        const raw = sres.data?.data || sres.data || [];
        houseSignals = Array.isArray(raw) ? raw : (raw.items || raw.pulses || []);
      } catch { /* no signals */ }
      const daySignals = houseSignals.filter((s: any) => isoDay(s.entry_date || s.created_at) === reviewDate);

      // 2. Governance decisions recorded for this house/date.
      let decisions: any[] = [];
      try {
        const dres = await apiClient.get(`/governance-decisions?date=${reviewDate}&house_id=${selectedHouseId}`);
        decisions = dres.data?.data?.decisions || [];
      } catch { /* decisions optional */ }
      const escDecisions = decisions.filter((d: any) => /escalat/i.test(String(d.decision || "")));
      const isDone = (d: any) => /complete|closed|done|effected/i.test(String(d.rollup_status || d.decision_status || ""));

      // 3. Outstanding actions to remember — scoped to this house where the row names one.
      const houseActions = actions.filter((a: any) => !a.house_name || a.house_name === houseName);
      const openActs = houseActions.filter((a: any) => !["Complete", "Completed", "Cancelled"].includes(a.status));

      const clean = (t: any) => String(t || "").replace(/\s+/g, " ").trim();
      const L: string[] = [];
      L.push("Daily Governance Review");
      L.push(`Service: ${houseName}`);
      L.push(`Date: ${periodLabel}`);
      L.push(`Reviewed by: ${reviewedBy}`);
      L.push(`Review time: ${reviewTime}`);
      L.push("");

      // What happened — grouped by the person involved.
      L.push("What happened");
      if (daySignals.length === 0) {
        L.push("- No signals were recorded for this service on this date.");
      } else {
        const byPerson = new Map<string, any[]>();
        daySignals.forEach((s: any) => {
          const who = clean(s.related_person) || "Service (general)";
          if (!byPerson.has(who)) byPerson.set(who, []);
          byPerson.get(who)!.push(s);
        });
        byPerson.forEach((sigs, who) => {
          L.push(`${who}:`);
          sigs.forEach((s: any) => L.push(`- ${s.severity || "—"} · ${clean(s.governance_domain || s.signal_type || "Signal")}: ${clean(s.description) || "—"}`));
        });
      }
      L.push("");

      // What staff need to do today — the decisions' required actions and anything due today.
      L.push("What staff need to do today");
      const todo: string[] = [];
      decisions.filter((d: any) => !/escalat/i.test(String(d.decision || ""))).forEach((d: any) => {
        const what = clean(d.what_is_happening);
        if (what) todo.push(`- ${what}${d.owner_name ? ` (owner: ${d.owner_name})` : ""}`);
      });
      houseActions.filter(isDue).forEach((a: any) => todo.push(`- ${clean(a.title || a.action || "Action")}${a.assigned_to_name ? ` — ${a.assigned_to_name}` : ""} (due today)`));
      L.push(todo.length ? todo.join("\n") : "- Continue with existing actions; no new tasks were set today.");
      L.push("");

      // Management decisions — every decision taken, with pending status.
      L.push("Management decisions");
      if (decisions.length === 0) L.push("- No management decisions were recorded for this date.");
      else decisions.forEach((d: any) => L.push(`- ${clean(d.decision || "Decision")}: ${clean(d.what_is_happening) || "—"}${d.owner_name ? ` · owner ${d.owner_name}` : ""} · ${isDone(d) ? "effected" : "pending"}`));
      L.push("");

      // Escalations — from escalation decisions and any open escalations on the service.
      L.push("Escalations");
      if (escDecisions.length === 0 && openEsc === 0) {
        L.push("- None today.");
      } else {
        escDecisions.forEach((d: any) => L.push(`- ${clean(d.what_is_happening) || "Escalation raised"}${d.owner_name ? ` · to ${d.owner_name}` : ""}`));
        if (openEsc > 0) L.push(`- ${openEsc} open escalation${openEsc === 1 ? "" : "s"} still require follow-up.`);
      }
      L.push("");

      // Existing actions to remember — outstanding work staff must keep progressing.
      L.push("Existing actions to remember");
      if (openActs.length === 0) L.push("- No outstanding actions.");
      else openActs.slice(0, 15).forEach((a: any) => L.push(`- ${clean(a.title || a.action || "Action")}${a.assigned_to_name ? ` · ${a.assigned_to_name}` : ""}${a.due_date ? ` · due ${new Date(a.due_date).toLocaleDateString("en-GB")}` : ""}`));

      setDailyNote(L.join("\n"));
    } catch { toast.error("Couldn't assemble the team brief — you can write it below."); }
    finally { setAiBusy(false); }
  };

  // When the house/date changes: if a signed-off log already exists for that service and day,
  // show it read-only (historical playback). Otherwise clear the draft — the Team Brief is
  // NOT auto-generated; the RM generates it deliberately AFTER recording the governance
  // decisions and allocating tasks (doctrine: the brief is the output of that review, not a
  // pre-emptive draft), using the "Generate team brief" button below.
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
      } catch { /* no stored log — leave the draft empty until the RM generates it */ }
      if (cancelled) return;
      setSignedOff(null);
      setDailyNote("");
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

  // Remind the person an action is assigned to (creates a notification for them).
  const remindAction = async (a: any) => {
    if (!a?.id) return;
    try {
      await apiClient.post(`/actions/${a.id}/remind`, {});
      toast.success(`Reminder sent${a.assigned_to_name ? ` to ${a.assigned_to_name}` : ""}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Couldn't send reminder");
    }
  };

  // ---- KPI card ----
  const KPI = ({ value, label, tone, Icon, sub, onClick }: { value: number; label: string; tone: string; Icon: any; sub?: string; onClick?: () => void }) => {
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
      <div onClick={onClick} className={`bg-card border-2 border-border ${t.top} border-t-4 rounded-xl p-4 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}>
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
        </div>

        {/* Colour-coded KPI cards — governance workload for the day (patterns live in the
            separate Pipeline module, not this daily board). */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI value={highPriority.length} label="High Priority (48h)" tone="orange" Icon={Bell} onClick={() => navigate("/rm5?stage=signals")} />
          <KPI value={actionsDueToday} label="Actions Due Today" tone="blue" Icon={ClipboardList} onClick={() => navigate("/my-actions")} />
          <KPI value={openActions} label="Open Actions" tone="green" Icon={Layers} onClick={() => navigate("/risk-register")} />
          <KPI value={openEsc} label="Open Escalations" tone="slate" Icon={AlertCircle} onClick={() => navigate("/escalation-log?status=open")} />
        </div>

        {/* Governance actions (full width) — the day's outstanding management work */}
        <div>
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
                  <thead><tr className="text-left text-[11px] uppercase text-muted-foreground border-b border-border"><th className="py-2">Priority</th><th>Action</th><th>Related to</th><th>Age</th><th>Due</th><th></th></tr></thead>
                  <tbody>
                    {[...actions].sort((a, b) => (new Date(a.due_date || 0).getTime()) - (new Date(b.due_date || 0).getTime())).slice(0, 8).map((a: any, i) => {
                      const b = prioBadge(a.priority || a.severity);
                      const due = dueLabel(a);
                      const person = a.related_person || a.service_user_name || a.assigned_to_name || a.risk_title || a.house_name || "—";
                      const ageDays = a.created_at ? Math.max(0, Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86400000)) : null;
                      const go = () => a.risk_id ? navigate(`/risk-register/${a.risk_id}`) : navigate("/risk-register");
                      return (
                        <tr key={a.id || i} className="border-b border-border/50 hover:bg-muted/40">
                          <td className="py-2.5 cursor-pointer" onClick={go}><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${b.cls}`}>{b.label}</span></td>
                          <td className="pr-2 cursor-pointer" onClick={go}>{a.title || a.action || "Action"}</td>
                          <td className="pr-2 text-muted-foreground">{person}</td>
                          <td className="pr-2 text-muted-foreground whitespace-nowrap">{ageDays == null ? "—" : ageDays === 0 ? "Today" : `${ageDays}d`}</td>
                          <td className={due === "Overdue" || due === "Today" ? "text-red-600 font-medium whitespace-nowrap" : "text-muted-foreground whitespace-nowrap"}>{due}</td>
                          <td className="pr-1 text-right">
                            {a.assigned_to ? (
                              <button onClick={(e) => { e.stopPropagation(); remindAction(a); }} className="text-[11px] text-primary hover:underline whitespace-nowrap">Remind</button>
                            ) : null}
                          </td>
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
        <GovernanceDecisions houseId={selectedHouseId} reviewDate={reviewDate} readOnly={!!signedOff} houses={houses} onSelectHouse={setSelectedHouseId} />

        {/* Team Brief (full width) — the day's signal review published to Team Leaders */}
        <div>
          <div className="bg-card border-2 border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2"><Users size={15} /> Team Brief <span className="normal-case font-normal text-muted-foreground">· published to Team Leaders</span></h3>
              <button onClick={generateNarrative} disabled={aiBusy || !!signedOff} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-50">
                <RefreshCw size={13} className={aiBusy ? "animate-spin" : ""} /> {aiBusy ? "Generating…" : (dailyNote.trim() ? "Regenerate team brief" : "Generate team brief")}
              </button>
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
            {!dailyNote.trim() && !signedOff && !aiBusy && (
              <p className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-2.5 mb-2">Record your governance decisions and allocate today's tasks above first — then press <span className="font-semibold text-primary">Generate team brief</span> to draft the review for Team Leaders.</p>
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
