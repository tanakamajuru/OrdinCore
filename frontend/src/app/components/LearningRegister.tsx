import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useAuth } from "@/hooks/useAuth";
import { Download } from "lucide-react";

async function downloadPdf(url: string, fallbackName: string) {
  try {
    const { blob, filename } = await apiClient.getBlob(url);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename || fallbackName;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  } catch {
    toast.error("Could not download the PDF.");
  }
}

const unwrap = (r: any): any => r?.data?.data ?? r?.data ?? r;

const STATE_LABEL: Record<string, string> = { IDENTIFIED: "Learning identified", NONE_IDENTIFIED: "No learning identified", NOT_YET_ASSESSED: "Not yet assessed" };
const SOURCE_LABEL: Record<string, string> = { EFFECTIVENESS: "Effectiveness review", ESCALATION_CLOSURE: "Escalation closure", RISK_CLOSURE: "Risk closure", PATTERN_CLOSURE: "Pattern closure", WEEKLY_REVIEW: "Weekly review", INCIDENT: "Incident" };
const PROGRESS: Array<{ v: string; label: string }> = [
  { v: "RECORDED", label: "Learning recorded" },
  { v: "CHANGE_IMPLEMENTED", label: "Change implemented" },
  { v: "IMPROVEMENT_VERIFIED", label: "Improvement verified" },
];
const fmt = (v?: string | null) => { if (!v) return "—"; const d = new Date(v); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };

export function LearningRegister() {
  const { user } = useAuth();
  const canManage = ["REGISTERED_MANAGER", "TEAM_LEADER", "DIRECTOR", "RESPONSIBLE_INDIVIDUAL", "ADMIN", "SUPER_ADMIN"]
    .includes(String((user as any)?.role || "").toUpperCase().replace(/-/g, "_"));
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  // Inline "complete assessment" for a deferred (Not yet assessed) lesson that has become due.
  const [assessing, setAssessing] = useState<string | null>(null);
  const [assessState, setAssessState] = useState<"IDENTIFIED" | "NONE_IDENTIFIED">("IDENTIFIED");
  const [assessWhatLearnt, setAssessWhatLearnt] = useState("");
  const [assessChange, setAssessChange] = useState("");
  const [assessReason, setAssessReason] = useState("");
  const focusedRef = useRef(false);
  // Implementation/verification each need their own evidence — not a bare stage flip.
  const [implementing, setImplementing] = useState<string | null>(null);
  const [implementEvidence, setImplementEvidence] = useState("");
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyOutcome, setVerifyOutcome] = useState("");
  const [verifyEvidence, setVerifyEvidence] = useState("");
  const [verifyReviewDue, setVerifyReviewDue] = useState("");
  // 27 Oct developer review: each verification attempt is stored append-only
  // (migration 202, verification_history) but was never rendered anywhere.
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  const load = async () => {
    setLoading(true);
    try { setRows(unwrap(await apiClient.get(`/learning/register${filter ? `?state=${filter}` : ""}`)) || []); }
    catch { setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const openAssess = (id: string) => { setAssessing(id); setAssessState("IDENTIFIED"); setAssessWhatLearnt(""); setAssessChange(""); setAssessReason(""); };
  // Deep-link from the work queue (/learning?focus=<id>) opens that record's actionable form
  // directly, instead of just landing on the full list and leaving the reviewer to find it.
  // Previously this only handled the NOT_YET_ASSESSED case, so the "Record Implementation" /
  // "Verify Improvement" queue items (added 25 Oct) just dropped the reviewer onto the
  // unfiltered register with nothing opened or scrolled to — every card looked identical.
  useEffect(() => {
    if (focusedRef.current || loading) return;
    const id = searchParams.get("focus");
    if (!id) return;
    const row = rows.find((r) => String(r.id) === id);
    if (!row) return;
    focusedRef.current = true;
    if (row.state === "NOT_YET_ASSESSED") openAssess(id);
    else if (row.progress === "RECORDED") { setImplementing(id); setImplementEvidence(""); }
    else if (row.progress === "CHANGE_IMPLEMENTED") { setVerifying(id); setVerifyOutcome(""); setVerifyEvidence(""); }
    setTimeout(() => document.getElementById(`learning-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }, [rows, loading, searchParams]);

  const submitAssess = async (id: string) => {
    if (assessState === "IDENTIFIED" && assessWhatLearnt.trim().length < 3) { toast.error("Record what was learnt."); return; }
    if (assessState === "NONE_IDENTIFIED" && assessReason.trim().length < 3) { toast.error("Give a brief reason why no learning was identified."); return; }
    setBusy(id);
    try {
      await apiClient.post(`/learning/${id}/assess`, {
        state: assessState,
        what_learnt: assessState === "IDENTIFIED" ? assessWhatLearnt.trim() : undefined,
        change_needed: assessState === "IDENTIFIED" ? (assessChange.trim() || undefined) : undefined,
        no_learning_reason: assessState === "NONE_IDENTIFIED" ? assessReason.trim() : undefined,
      });
      toast.success("Learning assessment completed"); setAssessing(null); load();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Could not complete the assessment"); }
    finally { setBusy(null); }
  };

  const recordImplementation = async (id: string, evidence: string) => {
    setBusy(id);
    try { await apiClient.post(`/learning/${id}/implement`, { evidence }); toast.success("Implementation recorded"); setImplementing(null); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || "Could not record implementation"); }
    finally { setBusy(null); }
  };
  const verifyImprovement = async (id: string, outcome: string, evidence: string, reviewDueAt?: string) => {
    setBusy(id);
    try {
      await apiClient.post(`/learning/${id}/verify`, { outcome, evidence, review_due_at: reviewDueAt || undefined });
      // 27 Oct developer review: the toast previously said "Improvement verified" regardless of
      // the actual saved outcome -- only an Effective rating genuinely verifies the improvement.
      toast.success(outcome === "Effective" ? "Improvement verified" : `Verification saved: ${outcome} — follow-up due ${reviewDueAt ? fmt(reviewDueAt) : ""}`);
      setVerifying(null); load();
    }
    catch (e: any) { toast.error(e?.response?.data?.message || "Could not verify improvement"); }
    finally { setBusy(null); }
  };
  const approve = async (id: string) => {
    setBusy(id);
    try { await apiClient.post(`/learning/${id}/approve`, {}); toast.success("Learning approved"); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || "Could not approve"); }
    finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <main className="w-full pt-24 p-6 max-w-5xl mx-auto">
        <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Learning & follow-through</h1>
            <p className="text-sm text-muted-foreground">Lessons recorded across governance, their linked improvement work, and whether the change was implemented and verified.</p>
          </div>
          <button
            onClick={() => setShowExport((s) => !s)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-muted shrink-0">
            <Download className="w-3.5 h-3.5" /> Download summary PDF {filter ? "(current filter)" : "(all)"}
          </button>
        </div>

        {/* 27 Oct developer review ("explicit date-basis/range... complete, not capped"): the
            export used to be a single click with no way to narrow it; now explicitly selects a
            date range (date basis = when the lesson was recorded) before downloading. */}
        {showExport && (
          <div className="mb-4 rounded-lg border border-border bg-card p-3 flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className="block text-muted-foreground mb-1">From (recorded date)</label>
              <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="text-sm p-1.5 border border-border rounded bg-background" />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1">To (recorded date)</label>
              <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="text-sm p-1.5 border border-border rounded bg-background" />
            </div>
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (filter) params.set("state", filter);
                if (exportFrom) params.set("start_date", exportFrom);
                if (exportTo) params.set("end_date", exportTo);
                const qs = params.toString();
                downloadPdf(`/learning/summary/pdf${qs ? `?${qs}` : ""}`, `Learning_Summary_${new Date().toISOString().split("T")[0]}.pdf`);
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">
              Download
            </button>
            <span className="text-[11px] text-muted-foreground">No date range = all dates. Current status filter ({filter ? STATE_LABEL[filter] : "All"}) is included.</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {[["", "All"], ["IDENTIFIED", "Learning identified"], ["NOT_YET_ASSESSED", "Not yet assessed"], ["NONE_IDENTIFIED", "No learning"]].map(([v, label]) => (
            <button key={v} onClick={() => setFilter(v)} className={`text-xs px-3 py-1.5 rounded-full border ${filter === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">No learning recorded yet. It appears here as lessons are captured at effectiveness reviews and closures.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} id={`learning-${r.id}`} className={`bg-card border rounded-xl p-4 ${assessing === r.id ? "border-primary" : "border-border"}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{SOURCE_LABEL[r.source_type] || r.source_type}{r.house_name ? ` · ${r.house_name}` : (r.house_id ? "" : " · Organisation-wide")}</span>
                    <p className="text-sm font-semibold text-foreground">{STATE_LABEL[r.state] || r.state}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.is_ai_suggested && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">AI suggestion</span>}
                    <span className="text-[11px] text-muted-foreground">{r.author_name || "—"} · {fmt(r.created_at)}</span>
                    <button onClick={() => downloadPdf(`/learning/${r.id}/pdf`, `Learning_${r.id}.pdf`)} title="Download this record as a PDF" className="p-1 rounded hover:bg-muted text-muted-foreground">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {r.state === "IDENTIFIED" && (
                  <div className="mt-2 space-y-1 text-sm">
                    {(r.source_action_title || r.source_review_outcome) && (
                      <p className="text-muted-foreground"><span className="text-foreground font-medium">From review:</span> {r.source_action_title || "Reviewed action"}
                        {r.source_review_outcome ? ` · rated ${r.source_review_outcome}` : ""}
                        {r.source_review_at ? ` · ${new Date(r.source_review_at).toLocaleDateString("en-GB")}` : ""}</p>
                    )}
                    {r.source_pattern_label && <p className="text-muted-foreground"><span className="text-foreground font-medium">From pattern:</span> {r.source_pattern_label}</p>}
                    {r.source_escalation_reason && <p className="text-muted-foreground"><span className="text-foreground font-medium">From escalation:</span> {r.source_escalation_reason}</p>}
                    {r.source_risk_title && <p className="text-muted-foreground"><span className="text-foreground font-medium">From risk:</span> {r.source_risk_title}</p>}
                    {/* 29 Oct 2026 live bug report ("we need the whole bundle ... effectiveness
                        maybe give us a link to the whole escalation history"): the source
                        action's OWN escalation/risk — e.g. an effectiveness review of an action
                        that itself resolved an escalation ("police attended...") — was entirely
                        invisible here, not just in the PDF. */}
                    {r.action_escalation_reason && (
                      <div className="rounded-lg bg-muted/40 p-2 space-y-0.5">
                        <p className="text-foreground font-medium text-xs">Escalation history (from the source action)</p>
                        <p className="text-muted-foreground">Raised: {r.action_escalation_reason}</p>
                        <p className="text-muted-foreground">Status: {r.action_escalation_lifecycle_status || r.action_escalation_status || "—"}{r.action_escalation_to_name ? ` · Escalated to: ${r.action_escalation_to_name}` : ""}</p>
                        <p className="text-muted-foreground">Opened: {fmt(r.action_escalation_created_at)}{r.action_escalation_due_by ? ` · Due: ${fmt(r.action_escalation_due_by)}` : ""}{r.action_escalation_closed_at ? ` · Closed: ${fmt(r.action_escalation_closed_at)}` : ""}</p>
                        {r.action_escalation_closure_evidence && <p className="text-muted-foreground">Closure evidence: {r.action_escalation_closure_evidence}</p>}
                      </div>
                    )}
                    {r.action_risk_title && <p className="text-muted-foreground"><span className="text-foreground font-medium">Linked risk (from the source action):</span> {r.action_risk_title} — {r.action_risk_status || "status unknown"}{r.action_risk_severity ? `, ${r.action_risk_severity}` : ""}</p>}
                    {r.what_happened && <p className="text-muted-foreground"><span className="text-foreground font-medium">What happened:</span> {r.what_happened}</p>}
                    {r.what_learnt && <p className="text-muted-foreground"><span className="text-foreground font-medium">Learnt:</span> {r.what_learnt}</p>}
                    {r.change_needed && <p className="text-muted-foreground"><span className="text-foreground font-medium">Change:</span> {r.change_needed}</p>}
                    {r.change_needed && (r.success_criteria || r.owner_name || r.review_date) && (
                      <p className="text-muted-foreground"><span className="text-foreground font-medium">Plan:</span> {r.owner_name ? `${r.owner_name} · ` : ""}{r.review_date ? `review ${fmt(r.review_date)}` : ""}{r.plan_deadline ? ` · deadline ${fmt(r.plan_deadline)}` : ""}{r.success_criteria ? ` — success: ${r.success_criteria}` : ""}</p>
                    )}
                    {r.linked_action_title && <p className="text-muted-foreground"><span className="text-foreground font-medium">Improvement action:</span> {r.linked_action_title} ({r.linked_action_status || "open"})</p>}
                  </div>
                )}
                {r.state === "NONE_IDENTIFIED" && r.no_learning_reason && <p className="mt-2 text-sm text-muted-foreground">Reason: {r.no_learning_reason}</p>}
                {r.state === "NOT_YET_ASSESSED" && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      Assessment due: {fmt(r.review_date)}
                      {r.review_date && new Date(r.review_date) <= new Date() ? <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">DUE</span> : null}
                      {r.owner_name ? <span> · owner: {r.owner_name}</span> : null}
                    </p>
                    {/* Context so the reviewer knows WHAT this learning is about before assessing it —
                        the originating effectiveness review, its outcome/evidence and the concern. */}
                    {(r.source_action_title || r.source_pattern_label || r.source_escalation_reason || r.source_risk_title || r.action_escalation_reason || r.action_risk_title || r.what_happened || r.source_review_outcome || r.source_review_evidence || r.linked_action_title) ? (
                      <div className="mt-2 space-y-1 text-sm bg-muted/40 rounded-lg p-2.5">
                        {(r.source_action_title || r.source_review_outcome) && (
                          <p className="text-muted-foreground"><span className="text-foreground font-medium">From review:</span> {r.source_action_title || "Reviewed action"}
                            {r.source_review_outcome ? ` · rated ${r.source_review_outcome}` : ""}
                            {r.source_review_at ? ` · ${new Date(r.source_review_at).toLocaleDateString("en-GB")}` : ""}</p>
                        )}
                        {r.source_pattern_label && <p className="text-muted-foreground"><span className="text-foreground font-medium">From pattern:</span> {r.source_pattern_label}</p>}
                        {r.source_escalation_reason && <p className="text-muted-foreground"><span className="text-foreground font-medium">From escalation:</span> {r.source_escalation_reason}</p>}
                        {r.source_risk_title && <p className="text-muted-foreground"><span className="text-foreground font-medium">From risk:</span> {r.source_risk_title}</p>}
                        {r.action_escalation_reason && (
                          <div className="rounded-lg bg-background p-2 space-y-0.5">
                            <p className="text-foreground font-medium text-xs">Escalation history (from the source action)</p>
                            <p className="text-muted-foreground">Raised: {r.action_escalation_reason}</p>
                            <p className="text-muted-foreground">Status: {r.action_escalation_lifecycle_status || r.action_escalation_status || "—"}{r.action_escalation_to_name ? ` · Escalated to: ${r.action_escalation_to_name}` : ""}</p>
                            <p className="text-muted-foreground">Opened: {fmt(r.action_escalation_created_at)}{r.action_escalation_due_by ? ` · Due: ${fmt(r.action_escalation_due_by)}` : ""}{r.action_escalation_closed_at ? ` · Closed: ${fmt(r.action_escalation_closed_at)}` : ""}</p>
                            {r.action_escalation_closure_evidence && <p className="text-muted-foreground">Closure evidence: {r.action_escalation_closure_evidence}</p>}
                          </div>
                        )}
                        {r.action_risk_title && <p className="text-muted-foreground"><span className="text-foreground font-medium">Linked risk (from the source action):</span> {r.action_risk_title} — {r.action_risk_status || "status unknown"}{r.action_risk_severity ? `, ${r.action_risk_severity}` : ""}</p>}
                        {r.what_happened && <p className="text-muted-foreground"><span className="text-foreground font-medium">What happened:</span> {r.what_happened}</p>}
                        {r.source_review_evidence && <p className="text-muted-foreground"><span className="text-foreground font-medium">Evidence examined:</span> {r.source_review_evidence}</p>}
                        {r.linked_action_title && <p className="text-muted-foreground"><span className="text-foreground font-medium">Improvement action:</span> {r.linked_action_title}{r.linked_action_status ? ` (${r.linked_action_status})` : ""}</p>}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground italic">No source detail was recorded for this learning — review against the service's recent governance record for this date.</p>
                    )}
                    {canManage && assessing !== r.id && (
                      <button onClick={() => openAssess(r.id)} className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">Complete assessment</button>
                    )}
                    {canManage && assessing === r.id && (
                      <div className="mt-2 space-y-2 rounded-lg border border-border p-3">
                        <div className="flex flex-wrap gap-2">
                          {([["IDENTIFIED", "Learning identified"], ["NONE_IDENTIFIED", "No learning identified"]] as const).map(([v, label]) => (
                            <button key={v} type="button" onClick={() => setAssessState(v)} className={`text-xs px-2.5 py-1 rounded-full border ${assessState === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>{label}</button>
                          ))}
                        </div>
                        {assessState === "IDENTIFIED" ? (
                          <>
                            <textarea value={assessWhatLearnt} onChange={(e) => setAssessWhatLearnt(e.target.value)} rows={2} placeholder="What was learnt *" className="w-full text-sm p-2 border border-border rounded-lg bg-background" />
                            <textarea value={assessChange} onChange={(e) => setAssessChange(e.target.value)} rows={2} placeholder="Change needed (optional)" className="w-full text-sm p-2 border border-border rounded-lg bg-background" />
                          </>
                        ) : (
                          <textarea value={assessReason} onChange={(e) => setAssessReason(e.target.value)} rows={2} placeholder="Brief reason why no learning was identified *" className="w-full text-sm p-2 border border-border rounded-lg bg-background" />
                        )}
                        <div className="flex gap-2">
                          <button disabled={busy === r.id} onClick={() => submitAssess(r.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">{busy === r.id ? "Saving…" : "Save assessment"}</button>
                          <button onClick={() => setAssessing(null)} className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress ladder is now evidence-gated: each stage is reached only through its own
                    form, never by flipping a label with nothing behind it. */}
                {r.state === "IDENTIFIED" && (
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PROGRESS.map((p, i) => {
                        const currentIdx = PROGRESS.findIndex((x) => x.v === r.progress);
                        const reached = i <= currentIdx;
                        return (
                          <span key={p.v} className={`text-[11px] px-2.5 py-1 rounded-full border ${reached ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700" : "border-border text-muted-foreground"}`}>
                            {reached ? "✓ " : ""}{p.label}
                          </span>
                        );
                      })}
                    </div>
                    {r.progress === "RECORDED" && (
                      <div className="mt-2">
                        {canManage && implementing !== r.id && (
                          <button onClick={() => { setImplementing(r.id); setImplementEvidence(""); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">Record implementation</button>
                        )}
                        {canManage && implementing === r.id && (
                          <div className="mt-2 space-y-2 rounded-lg border border-border p-3">
                            <textarea value={implementEvidence} onChange={(e) => setImplementEvidence(e.target.value)} rows={2} placeholder="What change was actually made *" className="w-full text-sm p-2 border border-border rounded-lg bg-background" />
                            <div className="flex gap-2">
                              <button disabled={busy === r.id} onClick={() => { if (implementEvidence.trim().length < 3) { toast.error("Describe the change that was implemented."); return; } recordImplementation(r.id, implementEvidence.trim()); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">{busy === r.id ? "Saving…" : "Save implementation"}</button>
                              <button onClick={() => setImplementing(null)} className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {r.progress === "CHANGE_IMPLEMENTED" && (
                      <div className="mt-2">
                        {/* 27 Oct developer corrections: render missing content honestly rather
                            than an empty string — a pre-25-Oct record genuinely has no stored
                            evidence (verified against production), it is not a display bug. */}
                        <p className="text-xs text-muted-foreground">Implemented: {r.implementation_evidence || "Not recorded"}{r.implemented_by_name ? ` (${r.implemented_by_name}, ${fmt(r.implemented_at)})` : ""}</p>
                        {/* A non-Effective verification stays at CHANGE_IMPLEMENTED (honestly not
                            yet confirmed) with its own follow-up due date, rather than the
                            previous outcome disappearing once a new attempt is due. */}
                        {r.verification_outcome && (
                          <p className="mt-1 text-xs font-medium text-amber-700 bg-amber-50 rounded px-2 py-1">
                            Last verification: {r.verification_outcome}{r.verified_by_name ? ` (${r.verified_by_name}, ${fmt(r.verified_at)})` : ""} — {r.verification_evidence}
                            {r.verification_review_due_at && <> · Follow-up due {fmt(r.verification_review_due_at)}</>}
                          </p>
                        )}
                        {Array.isArray(r.verification_history) && r.verification_history.length > 1 && (
                          <div className="mt-1">
                            <button onClick={() => setExpandedHistory(expandedHistory === r.id ? null : r.id)} className="text-[11px] text-primary hover:underline">
                              {expandedHistory === r.id ? "Hide" : "Show"} all {r.verification_history.length} verification attempts
                            </button>
                            {expandedHistory === r.id && (
                              <div className="mt-1.5 space-y-1.5 border-l-2 border-border pl-3">
                                {[...r.verification_history].reverse().map((h: any, i: number) => (
                                  <p key={i} className="text-[11px] text-muted-foreground">
                                    <span className="font-medium text-foreground">{h.outcome}</span>{h.reviewed_at ? ` · ${fmt(h.reviewed_at)}` : ""} — {h.evidence}
                                    {h.review_due_at && <> · follow-up was due {fmt(h.review_due_at)}</>}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {canManage && verifying !== r.id && (
                          <button onClick={() => { setVerifying(r.id); setVerifyOutcome(""); setVerifyEvidence(""); setVerifyReviewDue(""); }} className="mt-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">Verify improvement</button>
                        )}
                        {canManage && verifying === r.id && (
                          <div className="mt-2 space-y-2 rounded-lg border border-border p-3">
                            {/* 27 Oct developer corrections ("Do not preselect Effective"): no
                                outcome is selected by default — the reviewer must make an
                                explicit choice before saving is enabled. */}
                            <div className="flex flex-wrap gap-2">
                              {["Effective", "Partly Effective", "Not Effective", "Too Early", "Insufficient Evidence"].map((o) => (
                                <button key={o} type="button" onClick={() => setVerifyOutcome(o)} className={`text-xs px-2.5 py-1 rounded-full border ${verifyOutcome === o ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>{o}</button>
                              ))}
                            </div>
                            <textarea value={verifyEvidence} onChange={(e) => setVerifyEvidence(e.target.value)} rows={2} placeholder="Evidence behind this verification *" className="w-full text-sm p-2 border border-border rounded-lg bg-background" />
                            {/* 27 Oct owner instruction: anything short of Effective is not a
                                closed matter — it needs a review date so follow-through surfaces
                                in My Work/Decisions Due (Waiting until that date, then due on the
                                day), instead of the lesson silently going quiet. */}
                            {verifyOutcome && verifyOutcome !== "Effective" && (
                              <div>
                                <label className="block text-xs text-muted-foreground mb-1">Follow-up review date *</label>
                                <input type="date" value={verifyReviewDue} onChange={(e) => setVerifyReviewDue(e.target.value)} className="w-full text-sm p-2 border border-border rounded-lg bg-background" />
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button disabled={busy === r.id || !verifyOutcome} onClick={() => {
                                if (!verifyOutcome) { toast.error("Choose an outcome."); return; }
                                if (verifyEvidence.trim().length < 3) { toast.error("Give the evidence behind this verification."); return; }
                                if (verifyOutcome !== "Effective" && !verifyReviewDue) { toast.error("Give a follow-up review date for this outcome."); return; }
                                verifyImprovement(r.id, verifyOutcome, verifyEvidence.trim(), verifyOutcome !== "Effective" ? verifyReviewDue : undefined);
                              }} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">{busy === r.id ? "Saving…" : "Save verification"}</button>
                              <button onClick={() => setVerifying(null)} className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {r.progress === "IMPROVEMENT_VERIFIED" && (
                      <div className="mt-2">
                        {r.verification_outcome && r.verification_evidence ? (
                          <p className="text-xs text-muted-foreground">Verified {r.verification_outcome}{r.verified_by_name ? ` by ${r.verified_by_name}, ${fmt(r.verified_at)}` : ""}: {r.verification_evidence}</p>
                        ) : (
                          <p className="text-xs font-medium text-amber-700 bg-amber-50 rounded px-2 py-1">Verification evidence missing — record requires review.</p>
                        )}
                        {Array.isArray(r.verification_history) && r.verification_history.length > 1 && (
                          <div className="mt-1">
                            <button onClick={() => setExpandedHistory(expandedHistory === r.id ? null : r.id)} className="text-[11px] text-primary hover:underline">
                              {expandedHistory === r.id ? "Hide" : "Show"} all {r.verification_history.length} verification attempts
                            </button>
                            {expandedHistory === r.id && (
                              <div className="mt-1.5 space-y-1.5 border-l-2 border-border pl-3">
                                {[...r.verification_history].reverse().map((h: any, i: number) => (
                                  <p key={i} className="text-[11px] text-muted-foreground">
                                    <span className="font-medium text-foreground">{h.outcome}</span>{h.reviewed_at ? ` · ${fmt(h.reviewed_at)}` : ""} — {h.evidence}
                                    {h.review_due_at && <> · follow-up was due {fmt(h.review_due_at)}</>}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {canManage && r.is_ai_suggested && (
                  <button disabled={busy === r.id} onClick={() => approve(r.id)} className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">Approve as human learning</button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
