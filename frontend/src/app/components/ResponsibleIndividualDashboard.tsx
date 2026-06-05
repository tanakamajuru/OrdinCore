import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import {
  Shield, Flag, ClipboardCheck, TrendingUp, RefreshCw, ShieldCheck,
  CheckCircle2, AlertTriangle, Download,
} from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { apiClient } from "@/services/api";

const unwrap = (res: any): any => res?.data?.data ?? res?.data ?? [];
const asArray = (v: any): any[] => (Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : []);
const isRising = (t: string) => ["Rising", "Deteriorating", "Critical"].includes(t);

function StatCard({ icon: Icon, label, value, tone, footer }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-1 text-foreground">{value}</p></div>
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
        <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl font-semibold">{centerLabel ?? total}</span></div>
      </div>
      <div className="space-y-1.5 text-xs">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-muted-foreground flex-1">{d.name}</span><span className="font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResponsibleIndividualDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [escStats, setEscStats] = useState<any>({});
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [rk, esc, st, rv, rq, act] = await Promise.all([
        apiClient.get(`/risks?limit=200`).catch(() => ({})),
        apiClient.getEscalations(1, 200).catch(() => ({})),
        apiClient.getEscalationStats().catch(() => ({})),
        apiClient.getGovernanceReviews().catch(() => ({})),
        apiClient.getGovernanceReviewQueue().catch(() => ({})),
        apiClient.getRisksActions().catch(() => ({})),
      ]);
      setRisks(asArray(unwrap(rk)));
      setEscalations(asArray(unwrap(esc)));
      setEscStats(unwrap(st) || {});
      setReviews(asArray(unwrap(rv)));
      setReviewQueue(asArray(unwrap(rq)));
      setActions(asArray(unwrap(act)));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assurance dashboard");
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
  const reopened = escalations.filter(e => e.lifecycle_status === "Reopened").length
    + openRisks.filter(r => Number(r.reopened_count) > 0).length;

  const rated = actions.filter(a => a.effectiveness_outcome || a.effectiveness);
  const effCount = (names: string[]) => rated.filter(a => names.includes(a.effectiveness_outcome) || names.includes(a.effectiveness)).length;
  const effEffective = effCount(["Effective"]);
  const effNot = effCount(["Not Effective", "Ineffective"]);

  const reviewsCompleted = reviews.length;
  const reviewsPending = reviewQueue.length;
  const reviewPct = (reviewsCompleted + reviewsPending) ? Math.round((reviewsCompleted / (reviewsCompleted + reviewsPending)) * 100) : 100;

  // Assurance status: Good unless overdue escalations or many rising risks
  const assurance = overdueEsc > 3 || rising > openRisks.length / 2 ? "Watch" : "Good";

  const questions = [
    { q: "Are risks being identified early?", ok: openRisks.length > 0 },
    { q: "Are escalations timely?", ok: overdueEsc === 0 },
    { q: "Are actions effective?", ok: effEffective >= effNot },
    { q: "Are reviews completed on time?", ok: reviewsPending === 0 },
    { q: "Are items closed appropriately?", ok: reopened <= 2 },
    { q: "Is governance evidence sufficient?", ok: reviewsCompleted > 0 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 pt-24 max-w-[1500px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Responsible Individual Dashboard</h1>
            <p className="text-sm text-muted-foreground">Assurance overview and governance oversight</p>
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
          <StatCard icon={ClipboardCheck} tone="bg-blue-100 text-blue-600" label="Governance Reviews" value={reviewsCompleted + reviewsPending}
            footer={<><span className="text-emerald-600">{reviewsCompleted} Completed</span><span className="text-amber-600">{reviewsPending} Pending</span></>} />
          <StatCard icon={TrendingUp} tone="bg-violet-100 text-violet-600" label="Effectiveness Reviews" value={rated.length}
            footer={<><span className="text-emerald-600">{effEffective} Effective</span><span className="text-red-600">{effNot} Not effective</span></>} />
          <StatCard icon={RefreshCw} tone="bg-rose-100 text-rose-600" label="Reopened Items" value={reopened}
            footer={<span className="text-muted-foreground">risks & escalations</span>} />
          <StatCard icon={ShieldCheck} tone={assurance === "Good" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"} label="Assurance Status" value={assurance}
            footer={<span className="text-muted-foreground">overall rating</span>} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Strategic Risk Summary <span className="text-xs text-muted-foreground font-normal">(All Services)</span></h3>
            <Donut data={[
              { name: "Rising", value: rising, color: "#ef4444" },
              { name: "Stable", value: Math.max(stable, 0), color: "#f59e0b" },
              { name: "Improving", value: improving, color: "#10b981" },
            ]} />
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Governance Review Completion</h3>
            <Donut centerLabel={`${reviewPct}%`} data={[
              { name: "Completed", value: reviewsCompleted, color: "#10b981" },
              { name: "Pending", value: reviewsPending, color: "#f59e0b" },
            ]} />
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Escalations Assurance</h3>
            <Donut data={[
              { name: "Overdue", value: overdueEsc, color: "#ef4444" },
              { name: "Under Review", value: Number(escStats.under_review || 0), color: "#f59e0b" },
              { name: "Actions Implemented", value: Number(escStats.actions_implemented || 0), color: "#3b82f6" },
              { name: "Monitoring", value: Number(escStats.monitoring_effectiveness || 0), color: "#8b5cf6" },
              { name: "Closed", value: Number(escStats.closed || 0), color: "#10b981" },
            ]} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Open Escalations Requiring RI Oversight</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2">Escalation</th><th className="px-2">Reason</th><th className="px-2">Status</th><th className="px-2">Days Open</th>
                </tr></thead>
                <tbody>
                  {openEsc.slice(0, 6).map(e => (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => navigate("/escalations")}>
                      <td className="py-2.5 pr-2">{e.risk_title || e.reason || "Escalation"}</td>
                      <td className="px-2 max-w-[160px] truncate text-muted-foreground">{e.reason}</td>
                      <td className="px-2"><span className={`text-xs rounded px-2 py-0.5 ${e.overdue ? "bg-red-100 text-red-700" : "bg-muted"}`}>{e.overdue ? "Overdue" : (e.lifecycle_status || e.status)}</span></td>
                      <td className="px-2">{Math.max(0, Math.round((Date.now() - new Date(e.created_at).getTime()) / 86400000))}</td>
                    </tr>
                  ))}
                  {openEsc.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-xs">No open escalations</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Key Assurance Questions</h3>
            <div className="space-y-2.5">
              {questions.map(({ q, ok }) => (
                <div key={q} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                  <span>{q}</span>
                  {ok
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
