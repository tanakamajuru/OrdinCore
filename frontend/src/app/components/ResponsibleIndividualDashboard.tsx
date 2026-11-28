import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { isOpenRisk } from "@/lib/governanceStatus";
import {
  Shield, Flag, ClipboardCheck, TrendingUp, RefreshCw, ShieldCheck,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { apiClient } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
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
        <div><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="text-2xl font-bold mt-1 text-foreground">{value}</p></div>
        <div className={`p-2 rounded-lg ${tone}`}><Icon className="w-5 h-5" /></div>
      </div>
      {footer && <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">{footer}</div>}
    </div>
  );
}

// 24 Nov 2026 brief ("RI dashboard: Provider Weekly Assurance"): the signed Provider Weekly
// Assurance decision was only visible in Service Review Roll-up -- the RI had to navigate away
// from the dashboard to see it. "Live assurance indicators" above is the current system-derived
// position; this is the dated, signed leadership decision. The two are deliberately kept separate
// (never merged, never one overriding the other). Reuses the SAME two GET requests Service Review
// Roll-up already uses -- no new endpoint.
function ProviderWeeklyAssuranceCard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [weekEnding, setWeekEnding] = useState<string | null>(null);
  const [rollup, setRollup] = useState<any>(null);

  const load = async () => {
    setStatus("loading");
    try {
      // Resolve the week the same way Service Review Roll-up does -- never calculate it independently.
      const sr: any = await apiClient.get(`/weekly-reviews/service-rollup`);
      const wk = sr?.data?.week_ending || null;
      if (!wk) { setWeekEnding(null); setRollup(null); setStatus("ready"); return; }
      const rr: any = await apiClient.get(`/weekly-reviews/rollup?week_ending=${wk}`);
      setWeekEnding(wk);
      setRollup(rr?.data || null);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => { load(); }, []);

  const fmtWeek = (v: any) => {
    const s = String(v ?? "").slice(0, 10);
    const d = new Date(`${s}T12:00:00Z`);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };
  const fmtWhen = (v: any) => v ? new Date(v).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm mb-6">
      <h3 className="text-lg font-bold text-primary mb-3">Provider Weekly Assurance</h3>
      {status === "loading" && <p className="text-sm text-muted-foreground">Loading the signed weekly decision…</p>}
      {status === "error" && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Could not load the Provider Weekly Assurance decision.</span>
          <button onClick={load} className="text-primary font-medium hover:underline shrink-0">Retry</button>
        </div>
      )}
      {status === "ready" && !weekEnding && (
        <p className="text-sm text-muted-foreground">No reporting week is available yet.</p>
      )}
      {status === "ready" && weekEnding && !rollup?.signoff && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Week ending {fmtWeek(weekEnding)} — {rollup?.assurance_ready ? "ready for provider assurance sign-off" : "not yet ready for sign-off"}.
          </p>
          <button onClick={() => navigate(`/service-review-rollup?weekEnding=${weekEnding}`)} className="text-primary text-sm font-medium hover:underline shrink-0">View Service Review Roll-up →</button>
        </div>
      )}
      {status === "ready" && weekEnding && rollup?.signoff && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Week ending {fmtWeek(weekEnding)}</p>
            <p className={`inline-block text-lg font-bold mt-0.5 px-2.5 py-0.5 rounded-lg ${/^assured\b/i.test(String(rollup.signoff.position || "")) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{rollup.signoff.position || "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {rollup.director_validated_count ?? 0} of {rollup.included_service_count ?? rollup.sites_total ?? 0} Director validated
              {" | "}Signed {fmtWhen(rollup.signoff.acknowledged_at) || "—"}
            </p>
            <p className="text-xs text-muted-foreground">Signed by: {rollup.signoff.acknowledged_by_name || "—"}</p>
            {(rollup.signoff.rationale || rollup.signoff.statement) && (
              <p className="text-sm text-foreground mt-2 italic">{rollup.signoff.rationale || rollup.signoff.statement}</p>
            )}
            {rollup.historical_evidence_unavailable ? (
              <p className="text-xs text-muted-foreground mt-2">Signed evidence snapshot unavailable for this decision.</p>
            ) : rollup.evidence_is_historical ? (
              <p className="text-xs text-muted-foreground mt-2">
                Signed evidence: {rollup.evidence_totals?.open_risks ?? 0} risks · {rollup.evidence_totals?.open_escalations ?? 0} escalations
                {" · "}{rollup.evidence_totals?.signals ?? 0} signals · {rollup.evidence_totals?.overdue_actions ?? 0} overdue actions
              </p>
            ) : null}
            <button onClick={() => navigate(`/service-review-rollup?weekEnding=${weekEnding}`)} className="text-primary text-sm font-medium hover:underline mt-2 inline-block">View Service Review Roll-up →</button>
          </div>
        </div>
      )}
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

// "Return to Registered Manager for review" decision modal (brief, 27 Nov 2026).
function ReturnToRmModal({ escalation, rms, onClose, onSaved }: { escalation: any; rms: any[]; onClose: () => void; onSaved: () => void }) {
  const [assignedTo, setAssignedTo] = useState('');
  const [reason, setReason] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!assignedTo) { toast.error('Choose a Registered Manager.'); return; }
    if (!reason.trim()) { toast.error('Enter why the case is being returned.'); return; }
    setSaving(true);
    try {
      await apiClient.post(`/escalations/${escalation.id}/return-to-rm`, { assigned_to: assignedTo, reason, instructions });
      toast.success('Escalation returned to the Registered Manager.');
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to return the escalation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md shadow-lg">
        <h3 className="font-bold mb-1">Return to Registered Manager for review</h3>
        <p className="text-xs text-muted-foreground mb-4">{escalation.risk_title || escalation.reason || 'Escalation'}{escalation.service_name ? ` · ${escalation.service_name}` : ''}</p>
        <label className="text-xs font-bold text-muted-foreground">Registered Manager</label>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full border border-border rounded-lg p-2 text-sm mb-3 mt-1">
          <option value="">Select an eligible RM…</option>
          {rms.map((rm) => <option key={rm.id} value={rm.id}>{rm.first_name} {rm.last_name}</option>)}
        </select>
        <label className="text-xs font-bold text-muted-foreground">Why is this being returned?</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full border border-border rounded-lg p-2 text-sm mb-3 mt-1" placeholder="Reason for the return" />
        <label className="text-xs font-bold text-muted-foreground">What should the RM review? (optional)</label>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} className="w-full border border-border rounded-lg p-2 text-sm mb-4 mt-1" placeholder="Instructions / evidence expected" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-border">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50">{saving ? 'Saving…' : 'Return case'}</button>
        </div>
      </div>
    </div>
  );
}

export function ResponsibleIndividualDashboard() {
  const {data:evidenceSummary}=useCanonicalEvidenceSummary();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [escStats, setEscStats] = useState<any>({});
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [effectivenessSummary, setEffectivenessSummary] = useState<any>({});
  const [assuranceSummary, setAssuranceSummary] = useState<any>(null);
  const [rms, setRms] = useState<any[]>([]);
  const [returnTarget, setReturnTarget] = useState<any>(null);
  // Authoritative org-wide counts (full dataset) for headline tiles; falls back to loaded lists.
  const [reportMetrics, setReportMetrics] = useState<any>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const end = new Date().toISOString();
      const start = new Date(Date.now() - 30 * 86400000).toISOString();
      const [rk, esc, st, rv, rq, effSummary, asum, rs, rmUsers] = await Promise.all([
        apiClient.get(`/risks?limit=200`).catch(() => ({})),
        apiClient.getEscalations(1, 200).catch(() => ({})),
        apiClient.getEscalationStats().catch(() => ({})),
        apiClient.getGovernanceReviews().catch(() => ({})),
        apiClient.getGovernanceReviewQueue().catch(() => ({})),
        apiClient.get(`/actions/effectiveness-summary?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`).catch(() => ({})),
        apiClient.get(`/ri/assurance-summary`).catch(() => ({})),
        apiClient.get(`/reports/summary`).catch(() => ({})),
        apiClient.get(`/users?role=REGISTERED_MANAGER&limit=100`).catch(() => ({})),
      ]);
      setRisks(asArray(unwrap(rk)));
      setEscalations(asArray(unwrap(esc)));
      setEscStats(unwrap(st) || {});
      setReviews(asArray(unwrap(rv)));
      setReviewQueue(asArray(unwrap(rq)));
      setEffectivenessSummary(unwrap(effSummary)?.org_summary || {});
      setAssuranceSummary(unwrap(asum) || null);
      setRms(asArray(unwrap(rmUsers)));
      { const s = unwrap(rs); setReportMetrics(s && !Array.isArray(s) ? (s.metrics || null) : null); }
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

  const openRisks = risks.filter(isOpenRisk);
  // Trajectory SSOT: authoritative direction first, legacy trend only as last resort.
  const trendOf = (r: any) => r.trajectory_direction || r.trajectory || r.trend || "Stable";
  const rising = openRisks.filter(r => isRising(trendOf(r))).length;
  const improving = openRisks.filter(r => trendOf(r) === "Improving").length;
  const stable = openRisks.length - rising - improving;

  const openEsc = escalations.filter(isOpenEscalation);
  const overdueEsc = escalations.filter(e => e.overdue).length;

  // 27 Nov 2026 brief ("Escalation SLA and RI handback"): "requires RI oversight" is now a
  // persisted fact (ri_oversight_active, set by a Critical flag, a Director-breach auto-transfer,
  // or an explicit RI return — see escalations.service.ts) rather than a live heuristic re-derived
  // from ownership/overdue each render. A case stays visible here across the whole handback cycle,
  // even while the RM or Director currently owns it, until it closes. "A decision is due" only
  // when the RI is the current owner (escalated_to = this RI); otherwise it is oversight-only.
  const riOversightEsc = openEsc
    .filter(e => e.ri_oversight_active || e.escalated_to === user?.id || e.overdue)
    .map(e => {
      const isHandover = e.escalated_to === user?.id;
      return {
        ...e,
        oversightReason: e.ri_oversight_reason || (isHandover ? 'Director handed over for an RI decision' : 'Overdue follow-up meets RI oversight rule'),
        oversightOwnerName: isHandover ? 'RI' : (e.escalated_to_name || 'Registered Manager'),
        oversightIsDecision: isHandover,
      };
    })
    .sort((a, b) => (a.oversightIsDecision === b.oversightIsDecision ? 0 : a.oversightIsDecision ? -1 : 1));
  const rmRisksOpen = reportMetrics?.risks_open ?? openRisks.length;
  const rmEscOpen = reportMetrics?.escalations_open ?? openEsc.length;
  const rmEscOverdue = reportMetrics?.escalations_overdue ?? overdueEsc;
  const reopened = escalations.filter(e => e.lifecycle_status === "Reopened").length
    + openRisks.filter(r => Number(r.reopened_count) > 0).length;

  const effEffective = Number(effectivenessSummary.effective || 0);
  const effPartial = Number(effectivenessSummary.partially_effective || 0);
  const effNot = Number(effectivenessSummary.not_effective || 0);
  const effTooEarly = Number(effectivenessSummary.too_early || 0);
  const effectivenessReviewed = Number(effectivenessSummary.total_reviewed || effEffective + effPartial + effNot + effTooEarly);

  const reviewsCompleted = reviews.length;
  const reviewsPending = reviewQueue.length;
  const reviewPct = (reviewsCompleted + reviewsPending) ? Math.round((reviewsCompleted / (reviewsCompleted + reviewsPending)) * 100) : 100;

  // RI Assurance Interface correction (14 Oct 2026): overall assurance is the RI's four-state
  // conclusion from the canonical Assurance Questions below — never a separate "Good"/"Watch"
  // quality rating computed from raw counts. Falls back to Insufficient evidence (never Assured)
  // while the assurance summary hasn't loaded, since that is the maximum defensible state.
  const overallAssurance: { state: string; basis: string } =
    assuranceSummary?.overall || { state: 'Insufficient evidence', basis: 'Assurance evidence is still loading.' };
  const assuranceTone: Record<string, string> = {
    'Assured': 'bg-emerald-100 text-emerald-600',
    'Partially assured': 'bg-amber-100 text-amber-600',
    'Not assured': 'bg-red-100 text-red-600',
    'Insufficient evidence': 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="px-6 pt-20"><CanonicalEvidenceStrip summary={evidenceSummary} compact /></div>
      <div className="p-6 max-w-[1500px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Responsible Individual Dashboard</h1>
            <p className="text-sm text-muted-foreground">Assurance overview and governance oversight</p>
          </div>
          <button onClick={() => navigate("/reports")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">
            <Download className="w-4 h-4" /> Download Reports
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard icon={Shield} tone="bg-indigo-100 text-indigo-600" label="Strategic Risks" value={rmRisksOpen}
            footer={<><span className="text-red-600">↑ {rising}</span><span className="text-amber-600">→ {stable}</span><span className="text-emerald-600">↓ {improving}</span></>} />
          <StatCard icon={Flag} tone="bg-orange-100 text-orange-600" label="Escalations Open" value={rmEscOpen}
            footer={<><span className="text-red-600">● {rmEscOverdue} Overdue</span><span className="text-emerald-600">● {Math.max(0, rmEscOpen - rmEscOverdue)} On time</span></>} />
          <StatCard icon={ClipboardCheck} tone="bg-blue-100 text-blue-600" label="Governance Reviews" value={reviewsCompleted + reviewsPending}
            footer={<><span className="text-emerald-600">{reviewsCompleted} Completed</span><span className="text-amber-600">{reviewsPending} Pending</span></>} />
          <StatCard icon={TrendingUp} tone="bg-violet-100 text-violet-600" label="Effectiveness Reviews" value={effectivenessReviewed}
            footer={<><span className="text-emerald-600">{effEffective} Effective</span><span className="text-amber-600">{effPartial} Partial</span><span className="text-red-600">{effNot} Not effective</span><span className="text-sky-600">{effTooEarly} Too early</span></>} />
          <StatCard icon={RefreshCw} tone="bg-rose-100 text-rose-600" label="Reopened / Recurring Concerns" value={reopened}
            footer={<span className="text-muted-foreground">risks & escalations</span>} />
          {/* 20 Nov 2026 developer brief ("RI Assurance screen"): renamed from "Overall Assurance"
              and scope/period made explicit, so the RI knows what drives the displayed status. */}
          <StatCard icon={ShieldCheck} tone={assuranceTone[overallAssurance.state] || "bg-slate-100 text-slate-600"} label="Live assurance indicators" value={overallAssurance.state}
            footer={<span className="text-muted-foreground">Company-wide · all records to date — {overallAssurance.basis}</span>} />
        </div>

        <ProviderWeeklyAssuranceCard />

        {assuranceSummary && (() => {
          const stateTone: Record<string, string> = {
            'Assured': 'bg-emerald-50 border-emerald-200 text-emerald-800',
            'Partially assured': 'bg-amber-50 border-amber-200 text-amber-800',
            'Not assured': 'bg-red-50 border-red-200 text-red-800',
            'Insufficient evidence': 'bg-slate-50 border-slate-200 text-slate-600',
          };
          const questions: Array<[string, any]> = [
            ['Are material concerns identified and evidence-linked?', assuranceSummary.risks_identified_early],
            ['Are urgent escalations progressed within time?', assuranceSummary.escalations_timely],
            ['Is control effectiveness independently judged?', assuranceSummary.actions_effective],
            ['Is closure appropriately evidenced?', assuranceSummary.closures_evidenced],
          ].filter(([, v]) => v && v.state);
          return (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm mb-6">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-bold">Assurance questions</h3>
                <span className="text-xs text-muted-foreground">{assuranceSummary.scope} · {assuranceSummary.period} · the system supplies evidence; the RI records the conclusion</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {questions.map(([q, v], i) => (
                  <div key={i} className={`rounded-lg border p-3 ${stateTone[v.state] || 'bg-muted border-border'}`}>
                    <div className="text-sm font-medium">{q}</div>
                    <div className="text-xs font-semibold mt-1">{v.state}</div>
                    <div className="text-xs mt-0.5 opacity-90">{v.basis}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-bold mb-4">Strategic Risk Summary <span className="text-xs text-muted-foreground font-normal">(All Services)</span></h3>
            <Donut data={[
              { name: "Rising", value: rising, color: "#ef4444" },
              { name: "Stable", value: Math.max(stable, 0), color: "#f59e0b" },
              { name: "Improving", value: improving, color: "#10b981" },
            ]} />
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-bold mb-1">Governance cycle status</h3>
            <p className="text-sm text-foreground mb-3">
              {reviewsPending === 0
                ? "All expected governance reviews are complete for the current period."
                : `${reviewsPending} review${reviewsPending === 1 ? '' : 's'} ${reviewsPending === 1 ? 'is' : 'are'} not yet complete.`}
            </p>
            <Donut centerLabel={`${reviewPct}%`} data={[
              { name: "Completed", value: reviewsCompleted, color: "#10b981" },
              { name: "Pending", value: reviewsPending, color: "#f59e0b" },
            ]} />
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-bold mb-1">Escalation assurance</h3>
            <p className="text-sm text-foreground mb-3">
              {overdueEsc === 0
                ? "Current escalations are owned and within required review arrangements."
                : `${overdueEsc} escalation${overdueEsc === 1 ? '' : 's'} ${overdueEsc === 1 ? 'is' : 'are'} overdue and require${overdueEsc === 1 ? 's' : ''} leadership attention.`}
            </p>
            <Donut data={[
              { name: "Overdue", value: overdueEsc, color: "#ef4444" },
              { name: "Under Review", value: Number(escStats.under_review || 0), color: "#f59e0b" },
              { name: "Actions Implemented", value: Number(escStats.actions_implemented || 0), color: "#3b82f6" },
              { name: "Monitoring", value: Number(escStats.monitoring_effectiveness || 0), color: "#8b5cf6" },
              { name: "Closed", value: Number(escStats.closed || 0), color: "#10b981" },
            ]} />
            <p className="text-xs text-muted-foreground mt-3">A count of closed escalations is supporting evidence, not itself an assurance conclusion.</p>
          </div>
        </div>

        {/* Open Escalations Requiring RI Oversight: material exceptions only, not every operational
            escalation. The canonical Assurance Questions section above is the single assurance
            framework — there is deliberately no second "Key Assurance Questions" panel here
            (RI Assurance Interface correction, 14 Oct 2026). */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold">Open Escalations Requiring RI Oversight</h3>
            <button onClick={() => navigate('/escalation-log')} className="text-primary text-xs font-medium hover:underline shrink-0">View full Escalation Log →</button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{riOversightEsc.length} case{riOversightEsc.length === 1 ? '' : 's'} meet the RI oversight criteria</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead><tr className="text-left text-xs font-bold text-muted-foreground bg-muted/40 border-b border-border">
                <th className="py-2 px-2 border-r border-border">Escalation / Service</th>
                <th className="px-2 border-r border-border">Reason for RI oversight</th>
                <th className="px-2 border-r border-border">Current owner</th>
                <th className="px-2 border-r border-border">Status</th>
                <th className="px-2">Next step</th>
              </tr></thead>
              <tbody>
                {riOversightEsc.slice(0, 6).map(e => (
                  <tr key={e.id} className="border-b border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/escalation-log?focus=${e.id}`)}>
                    <td className="py-2.5 px-2 border-r border-border">
                      <div>{e.risk_title || e.reason || "Escalation"}</div>
                      {e.service_name && <div className="text-xs text-muted-foreground">{e.service_name}</div>}
                    </td>
                    <td className="px-2 border-r border-border max-w-[200px] truncate text-muted-foreground">{e.oversightReason}</td>
                    <td className="px-2 border-r border-border">{e.oversightOwnerName}</td>
                    <td className="px-2 border-r border-border"><span className={`text-xs rounded px-2 py-0.5 ${e.overdue ? "bg-red-100 text-red-700" : "bg-muted"}`}>{e.overdue ? "Overdue" : (e.lifecycle_status || e.status)}</span></td>
                    <td className="px-2">
                      <span className={`text-xs font-medium rounded px-2 py-0.5 ${e.oversightIsDecision ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-700"}`}>
                        {e.oversightIsDecision ? "Review escalation" : "View escalation"}
                      </span>
                      {e.oversightIsDecision && (
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setReturnTarget(e); }}
                          className="block mt-1 text-xs text-primary font-medium hover:underline"
                        >
                          Return to RM →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {riOversightEsc.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">No escalations currently require RI oversight.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {returnTarget && (
        <ReturnToRmModal
          escalation={returnTarget}
          rms={rms}
          onClose={() => setReturnTarget(null)}
          onSaved={() => { setReturnTarget(null); load(); }}
        />
      )}
    </div>
  );
}
