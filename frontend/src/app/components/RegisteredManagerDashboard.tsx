import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import {
  Activity, Shield, Flag, ClipboardCheck, TrendingUp, CheckCircle2,
  Clock, Eye, AlertTriangle, FileText, Ambulance, FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { GovernanceReviewModal } from "@/components/GovernanceReviewModal";

// Defensively unwrap the varying { data } / { data: { data } } response shapes.
const unwrap = (res: any): any => res?.data?.data ?? res?.data ?? [];
const asArray = (v: any): any[] => (Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : []);

const SEVERITY_BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700", High: "bg-orange-100 text-orange-700",
  Medium: "bg-amber-100 text-amber-700", Moderate: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};

function StatCard({ icon: Icon, label, value, tone, footer, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`bg-card border border-border rounded-xl p-4 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/40 transition-all' : ''}`}
    >
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

function Panel({ title, count, children }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          {title}
          {count != null && count > 0 && <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">{count}</span>}
        </h3>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// Registered Manager landing = navigator. Stat cards (each a route with a live count)
// and a jump-to grid — the detail lives on the surface that owns it. The two things
// that keep an inline, actionable home here are the ones with no other surface:
// the governance review queue (its review modal) and the RI governance query channel
// (rehomed from the retired /oversight-board). Signals, risks, clusters and
// escalations are NOT restated here — they are one click away on their own screens.
export function RegisteredManagerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [house, setHouse] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [effPending, setEffPending] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [riQueries, setRiQueries] = useState<any[]>([]);
  const [reviewCtx, setReviewCtx] = useState<{ risk_id?: string; service_id?: string; theme?: string } | null>(null);

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

      const [sig, rk, esc, rq, eff, act, riq] = await Promise.all([
        apiClient.get(`/pulses?limit=100`).catch(() => ({})),
        apiClient.get(`/risks?limit=100`).catch(() => ({})),
        apiClient.getEscalations(1, 100).catch(() => ({})),
        apiClient.getGovernanceReviewQueue().catch(() => ({})),
        apiClient.getPendingEffectiveness().catch(() => ({})),
        apiClient.get(`/actions/oversight`).catch(() => apiClient.get(`/actions/my`)).catch(() => ({})),
        myHouse ? apiClient.get(`/ri-governance/rm/queries?house_id=${myHouse.id}`).catch(() => ({})) : Promise.resolve({}),
      ]);

      setSignals(asArray(unwrap(sig)));
      setRisks(asArray(unwrap(rk)));
      setEscalations(asArray(unwrap(esc)));
      setReviewQueue(asArray(unwrap(rq)));
      setEffPending(asArray(unwrap(eff)));
      setActions(asArray(unwrap(act)));
      setRiQueries(asArray(unwrap(riq)));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Respond to an RI forensic governance query — rehomed verbatim from the Oversight Board
  // so retiring that surface doesn't drop the RM's channel back to the Responsible Individual.
  const respondToQuery = async (queryId: string) => {
    const response = window.prompt("Enter your formal justification/response to the RI:");
    if (!response) return;
    try {
      await apiClient.post(`/ri-governance/queries/${queryId}/respond`, { response_text: response });
      toast.success("Response submitted to RI");
      load();
    } catch {
      toast.error("Failed to submit response");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
      <span>Loading dashboard…</span>
    </div>
  );

  // ─── Counts for the navigator cards (no data tables are rendered) ─────────
  const openRisks = risks.filter(r => (r.status || "").toLowerCase() !== "closed");
  const risingCount = openRisks.filter(r => ["Rising", "Deteriorating"].includes(r.trend || r.trajectory)).length;
  const improvingCount = openRisks.filter(r => (r.trend || r.trajectory) === "Improving").length;
  const stableCount = Math.max(openRisks.length - risingCount - improvingCount, 0);
  const openEsc = escalations.filter(e => (e.lifecycle_status || "") !== "Closed");
  const overdueEsc = escalations.filter(e => e.overdue).length;
  const onTimeEsc = openEsc.length - overdueEsc;
  const actionsDue = actions.filter(a => !["Complete", "Completed", "Cancelled"].includes(a.status));
  const closedThisMonth = escalations.filter(e => e.lifecycle_status === "Closed").length;

  const jumpTo: { icon: any; label: string; path: string; tone: string }[] = [
    { icon: Activity, label: "Daily Oversight", path: "/governance-dashboard", tone: "text-blue-600" },
    { icon: Eye, label: "Patterns", path: "/patterns", tone: "text-indigo-600" },
    { icon: AlertTriangle, label: "Oversight Register", path: "/risk-register", tone: "text-emerald-600" },
    { icon: ClipboardCheck, label: "Actions", path: "/my-actions", tone: "text-red-600" },
    { icon: TrendingUp, label: "Effectiveness", path: "/effectiveness", tone: "text-violet-600" },
    { icon: Flag, label: "Escalations", path: "/escalation-log", tone: "text-orange-600" },
    { icon: FileText, label: "Weekly Review", path: "/weekly-review", tone: "text-sky-600" },
    { icon: Ambulance, label: "Serious Incidents", path: "/incidents", tone: "text-rose-600" },
    { icon: FileDown, label: "Reports", path: "/reports", tone: "text-slate-600" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 max-w-[1500px]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Registered Manager Dashboard</h1>
            <p className="text-sm text-muted-foreground">Your navigator — headline counts and one click to the surface that owns the detail{house?.name ? ` · ${house.name}` : ""}</p>
          </div>
        </div>

        {/* Outstanding RI governance queries — actionable, rehomed from the Oversight Board */}
        {riQueries.length > 0 && (
          <div className="mb-6 bg-card border border-red-300 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-red-700">
              <Shield className="w-5 h-5" />
              <h3 className="font-semibold">Outstanding RI Governance Queries</h3>
              <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">{riQueries.length}</span>
            </div>
            <div className="space-y-3">
              {riQueries.map((q) => (
                <div key={q.id} className="p-4 border border-border rounded-lg bg-muted/10">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                        WE {q.week_ending ? new Date(q.week_ending).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"} · Review query
                      </span>
                      <p className="text-sm font-medium">“{q.query_text}”</p>
                      {q.governance_narrative && <p className="text-xs text-muted-foreground mt-2">{q.governance_narrative}</p>}
                    </div>
                    <button onClick={() => respondToQuery(q.id)}
                      className="shrink-0 text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                      Justify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigator stat cards — every card routes to the surface that owns the detail */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard icon={Activity} tone="bg-blue-100 text-blue-600" label="Signals This Month" value={signals.length}
            onClick={() => navigate("/signals")}
            footer={<span className="text-muted-foreground">recorded</span>} />
          <StatCard icon={Shield} tone="bg-emerald-100 text-emerald-600" label="Strategic Risks" value={openRisks.length}
            onClick={() => navigate("/risk-register?tab=strategic")}
            footer={<>
              <span className="text-red-600">↑ {risingCount} Rising</span>
              <span className="text-amber-600">→ {stableCount} Stable</span>
              <span className="text-emerald-600">↓ {improvingCount} Improving</span>
            </>} />
          <StatCard icon={Flag} tone="bg-orange-100 text-orange-600" label="Open Escalations" value={openEsc.length}
            onClick={() => navigate("/escalation-log?status=open")}
            footer={<>
              <span className="text-red-600">● {overdueEsc} Overdue</span>
              <span className="text-emerald-600">● {onTimeEsc} On time</span>
            </>} />
          <StatCard icon={ClipboardCheck} tone="bg-red-100 text-red-600" label="Actions Due" value={actionsDue.length}
            onClick={() => navigate("/my-actions")}
            footer={<span className="text-muted-foreground">open actions</span>} />
          <StatCard icon={TrendingUp} tone="bg-violet-100 text-violet-600" label="Effectiveness Reviews Due" value={effPending.length}
            onClick={() => navigate("/effectiveness")}
            footer={<span className="text-muted-foreground">awaiting review</span>} />
          <StatCard icon={CheckCircle2} tone="bg-emerald-100 text-emerald-600" label="Closed This Month" value={closedThisMonth}
            onClick={() => navigate("/risk-register?tab=closed")}
            footer={<span className="text-muted-foreground">escalations & risks</span>} />
        </div>

        {/* Governance review queue (actionable — the review modal has no other home) + jump-to */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Governance Review Queue" count={reviewQueue.length}>
            <div className="space-y-2">
              {reviewQueue.slice(0, 6).map((q) => (
                <div key={q.risk_id} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 pb-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{q.theme}</div>
                    <div className="text-xs text-muted-foreground">{q.signal_count || 0} signals · {q.days_since_review ?? 0}d since review</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs rounded px-2 py-0.5 ${SEVERITY_BADGE[q.severity] || "bg-muted"}`}>{q.severity || "—"}</span>
                    <button onClick={() => setReviewCtx({ risk_id: q.risk_id, service_id: q.service_id, theme: q.theme })}
                      className="text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Review</button>
                  </div>
                </div>
              ))}
              {reviewQueue.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">Queue clear</p>}
            </div>
          </Panel>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4">Jump to</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {jumpTo.map((j) => (
                <button key={j.path} onClick={() => navigate(j.path)}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/40 transition-all text-left">
                  <j.icon className={`w-4 h-4 shrink-0 ${j.tone}`} />
                  <span className="text-sm truncate">{j.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <GovernanceReviewModal
        open={!!reviewCtx}
        context={reviewCtx || {}}
        onClose={() => setReviewCtx(null)}
        onSubmitted={load}
      />
    </div>
  );
}
