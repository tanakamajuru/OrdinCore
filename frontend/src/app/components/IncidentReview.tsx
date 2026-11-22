import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Clock, Shield, AlertTriangle, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { Button } from "./ui/button";
import { LearningCapture } from "./LearningCapture";
import apiClient from "@/services/apiClient";

// 22 Nov 2026 brief -> Serious Incident workflow, Steps 3-4. Assign/track/complete a serious
// incident review, backed by incident_reviews (migration 216) via incidentReviews.service.ts.
// Draft fields follow guidedWork.service.ts's own NEEDS_YOU/WAITING split: this screen only ever
// toggles is_waiting explicitly (never inferred), and "Complete" is a distinct action from
// "Save draft" so an in-progress review keeps showing in My Work until it is genuinely finished.

const OUTCOMES = [
  "Further investigation required",
  "Actions or checks outstanding",
  "Ready for resolution",
  "Refer for leadership oversight",
] as const;
const TERMINAL_OUTCOMES = new Set<string>(["Ready for resolution", "Refer for leadership oversight"]);
const MANAGER_ROLES = ["REGISTERED_MANAGER", "DIRECTOR", "ADMIN", "SUPER_ADMIN"];

function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB");
}
function toDateInput(v?: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

const DRAFT_KEYS = [
  "facts", "impact", "warning_signs", "contributing_factors", "evidence_gaps",
  "timeliness_notes", "response_evaluation", "effectiveness_notes", "effectiveness_evidence_needed",
  "effectiveness_recheck_at", "external_reference_notes",
] as const;

const FIELD_LABELS: Record<string, string> = {
  facts: "Facts",
  impact: "Impact",
  warning_signs: "Warning signs",
  contributing_factors: "Contributing factors",
  evidence_gaps: "Evidence gaps",
  timeliness_notes: "Timeliness",
  response_evaluation: "Response",
  effectiveness_notes: "Effectiveness",
};

export function IncidentReview() {
  const { id: incidentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = (user?.role || localStorage.getItem("userRole") || "").toUpperCase().replace(/-/g, "_");
  const canManage = MANAGER_ROLES.includes(userRole);

  const [loading, setLoading] = useState(true);
  const [caseSummary, setCaseSummary] = useState<any>(null);
  const [active, setActive] = useState<any>(null);
  const [completedReviews, setCompletedReviews] = useState<any[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [reviewers, setReviewers] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const [showAssign, setShowAssign] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [assignDue, setAssignDue] = useState("");

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingReason, setWaitingReason] = useState("");
  const [outcome, setOutcome] = useState("");
  const [rationale, setRationale] = useState("");
  const [nextReviewAt, setNextReviewAt] = useState("");

  const [actionTitle, setActionTitle] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [actionDue, setActionDue] = useState("");
  const [actionRationale, setActionRationale] = useState("");
  const [addingAction, setAddingAction] = useState(false);
  const [showLearning, setShowLearning] = useState(false);

  const load = async () => {
    if (!incidentId) return;
    try {
      setLoading(true);
      const [caseRes, activeRes] = await Promise.all([
        apiClient.get(`/incidents/${incidentId}/review/case-summary`),
        apiClient.get(`/incidents/${incidentId}/review`),
      ]);
      const cs = (caseRes.data as any).data;
      const av = (activeRes.data as any).data;
      setCaseSummary(cs);
      setActive(av.active);
      setCompletedReviews(av.completedReviews || []);
      setAssignmentHistory(av.assignmentHistory || []);
      if (av.active) {
        setDraft({
          facts: av.active.facts || "", impact: av.active.impact || "", warning_signs: av.active.warning_signs || "",
          contributing_factors: av.active.contributing_factors || "", evidence_gaps: av.active.evidence_gaps || "",
          timeliness_notes: av.active.timeliness_notes || "", response_evaluation: av.active.response_evaluation || "",
          effectiveness_notes: av.active.effectiveness_notes || "", effectiveness_evidence_needed: av.active.effectiveness_evidence_needed || "",
          effectiveness_recheck_at: toDateInput(av.active.effectiveness_recheck_at),
          external_reference_notes: av.active.external_reference_notes || "",
        });
        setIsWaiting(!!av.active.is_waiting);
        setWaitingReason(av.active.waiting_reason || "");
        setOutcome(av.active.decision_outcome || "");
        setRationale(av.active.decision_rationale || "");
        setNextReviewAt(toDateInput(av.active.next_review_at));
      }
    } catch (err) {
      console.error("Failed to load incident review:", err);
      toast.error("Failed to load incident review.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [incidentId]);

  useEffect(() => {
    if (!incidentId) return;
    apiClient.get("/users/directory").then((r) => setOwners((r.data as any)?.data || (r.data as any) || [])).catch(() => setOwners([]));
    if (!canManage) return;
    apiClient.get(`/incidents/${incidentId}/review/eligible-reviewers`).then((r) => setReviewers((r.data as any)?.data || [])).catch(() => setReviewers([]));
  }, [incidentId, canManage]);

  const isOwner = !!(active && user && active.assigned_to === user.id);
  const canEditActive = !!active && active.status !== "Completed" && (isOwner || ["ADMIN", "SUPER_ADMIN"].includes(userRole));

  const submitAssign = async () => {
    if (!assignTo) { toast.error("Choose a reviewer."); return; }
    setBusy(true);
    try {
      await apiClient.post(`/incidents/${incidentId}/review/assign`, { assigned_to: assignTo, due_at: assignDue || null });
      toast.success("Review assigned.");
      setShowAssign(false);
      setAssignTo(""); setAssignDue("");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign review.");
    } finally { setBusy(false); }
  };

  const saveDraft = async (extra: Record<string, unknown> = {}) => {
    if (!active) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = { ...draft, ...extra };
      if (!("decision_outcome" in extra)) body.decision_outcome = outcome || null;
      if (!("decision_rationale" in extra)) body.decision_rationale = rationale || null;
      if (!("next_review_at" in extra)) body.next_review_at = nextReviewAt || null;
      const res = await apiClient.patch(`/incident-reviews/${active.id}`, body);
      setActive((res.data as any).data);
      toast.success("Draft saved.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save draft.");
    } finally { setBusy(false); }
  };

  const saveWaiting = async (next: boolean) => {
    if (!active) return;
    if (next && !waitingReason.trim()) { toast.error("Explain what evidence this review is waiting on."); return; }
    setBusy(true);
    try {
      const res = await apiClient.post(`/incident-reviews/${active.id}/waiting`, { is_waiting: next, reason: waitingReason });
      setActive((res.data as any).data);
      setIsWaiting(next);
      toast.success(next ? "Marked as waiting." : "No longer waiting.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update waiting state.");
    } finally { setBusy(false); }
  };

  const addAction = async () => {
    if (!active) return;
    if (!actionOwner) { toast.error("Choose who is responsible for this action."); return; }
    if (!actionRationale.trim()) { toast.error("Explain what this review found and why this action is needed."); return; }
    setAddingAction(true);
    try {
      await apiClient.post(`/incident-reviews/${active.id}/actions`, {
        title: actionTitle || undefined, assigned_to: actionOwner, due_date: actionDue || undefined, rationale: actionRationale,
      });
      toast.success("Action added.");
      setActionTitle(""); setActionOwner(""); setActionDue(""); setActionRationale("");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add action.");
    } finally { setAddingAction(false); }
  };

  const linkLearning = async (learningId?: string) => {
    if (!active || !learningId) { setShowLearning(false); return; }
    try {
      await apiClient.post(`/incident-reviews/${active.id}/link-learning`, { learning_record_id: learningId });
      toast.success("Learning linked to this review.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to link learning record.");
    } finally {
      setShowLearning(false);
    }
  };

  const isTerminal = TERMINAL_OUTCOMES.has(outcome);
  const openActionsCount = (caseSummary?.actions || []).filter((a: any) => !a.completed_at).length;

  const completeReview = async () => {
    if (!active) return;
    if (!outcome) { toast.error("Choose a decision outcome."); return; }
    if (!rationale.trim()) { toast.error("A rationale is required to complete this review."); return; }
    if (!isTerminal && !nextReviewAt) { toast.error("A next review date is required when another review round is needed."); return; }
    setBusy(true);
    try {
      await saveDraft({ decision_outcome: outcome, decision_rationale: rationale, next_review_at: nextReviewAt || null });
      const res = await apiClient.post(`/incident-reviews/${active.id}/complete`, {
        decision_outcome: outcome, decision_rationale: rationale, next_review_at: isTerminal ? null : (nextReviewAt || null),
      });
      toast.success("Review completed.");
      void res;
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to complete review.");
    } finally { setBusy(false); }
  };

  const downloadPdf = async (reviewId: string) => {
    try {
      const res = await apiClient.get(`/incident-reviews/${reviewId}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url; a.download = `Serious_Incident_Review_${reviewId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the review PDF.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading incident review...</p>
        </div>
      </div>
    );
  }

  if (!caseSummary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <h2 className="text-xl text-foreground">Incident not found</h2>
      </div>
    );
  }

  const incident = caseSummary.incident;

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20 max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => navigate(`/incidents/${incidentId}`)}
          className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Incident
        </button>

        <div>
          <h1 className="text-2xl text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6" /> Serious Incident Review
          </h1>
          <p className="text-muted-foreground">
            {incident.reference ? `${incident.reference} — ` : ""}{incident.title} · {incident.house_name} · {incident.severity} severity
          </p>
        </div>

        {/* Assignment panel */}
        <div className="bg-card border-2 border-border p-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg text-foreground">Assignment</h2>
              {active ? (
                <p className="text-sm text-muted-foreground">
                  Owner: <span className="font-medium text-foreground">{active.assigned_to_name}</span>
                  {" · "}Due: {fmtDate(active.due_at)}
                  {active.version > 1 && ` · Round ${active.version}`}
                  {active.is_waiting && <span className="ml-2 text-amber-700 font-medium">Waiting on evidence</span>}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No active review assigned for this incident.</p>
              )}
            </div>
            {canManage && !["Resolved", "Closed"].includes(incident.status) && (
              <Button onClick={() => { setShowAssign(true); setAssignTo(active?.assigned_to || ""); setAssignDue(toDateInput(active?.due_at)); }}>
                {active ? "Reassign" : "Assign reviewer"}
              </Button>
            )}
          </div>

          {showAssign && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Reviewer *</label>
                <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="w-full text-sm p-2 border border-border rounded-lg bg-background">
                  <option value="">Choose a reviewer…</option>
                  {reviewers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {[u.first_name, u.last_name].filter(Boolean).join(" ")} ({String(u.role || "").replace(/_/g, " ")})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Due date</label>
                <input type="date" value={assignDue} onChange={(e) => setAssignDue(e.target.value)} className="p-2 border border-border rounded-lg bg-background text-sm" />
              </div>
              <div className="flex gap-2">
                <Button onClick={submitAssign} disabled={busy}>{busy ? "Saving…" : "Save assignment"}</Button>
                <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {assignmentHistory.length > 0 && (
            <div>
              <button className="text-xs text-primary underline" onClick={() => setShowHistory((s) => !s)}>
                {showHistory ? "Hide" : "Show"} assignment history ({assignmentHistory.length})
              </button>
              {showHistory && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {assignmentHistory.map((h: any) => (
                    <li key={h.id}>
                      {fmtDateTime(h.assigned_at)} — {h.assigned_by_name || "Unknown"} assigned {h.assigned_to_name || "Unassigned"}
                      {h.due_at ? `, due ${fmtDate(h.due_at)}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Completed review versions */}
        {completedReviews.length > 0 && (
          <div className="bg-card border-2 border-border p-6 space-y-3">
            <h2 className="text-lg text-foreground">Completed review record{completedReviews.length > 1 ? "s" : ""}</h2>
            {completedReviews.map((r: any) => (
              <div key={r.id} className="border border-border rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Version {r.version} — {r.decision_outcome}</p>
                  <p className="text-xs text-muted-foreground">
                    Completed {fmtDateTime(r.completed_at)} by {r.completed_by_name || "Unknown"}
                    {r.next_review_at ? ` · Next review ${fmtDate(r.next_review_at)}` : ""}
                  </p>
                </div>
                <Button variant="outline" onClick={() => downloadPdf(r.id)}>
                  <Download className="w-4 h-4 mr-1" /> Download review PDF
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Read-only case/evidence summary */}
        <div className="bg-card border-2 border-border p-6 space-y-4">
          <h2 className="text-lg text-foreground">Case & evidence summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Occurred:</span> {fmtDateTime(incident.occurred_at)}</div>
            <div><span className="text-muted-foreground">Location:</span> {incident.location || "Not specified"}</div>
            <div className="md:col-span-2">
              <span className="text-muted-foreground">People involved:</span>{" "}
              {Array.isArray(incident.persons_involved) && incident.persons_involved.length
                ? incident.persons_involved.map((p: any, i: number) => (
                    <span key={i}>{i > 0 ? "; " : ""}{typeof p === "string" ? p : `${p.name}${p.roles?.length ? ` (${p.roles.join(", ")})` : ""}`}</span>
                  ))
                : "None recorded"}
            </div>
            <div className="md:col-span-2"><span className="text-muted-foreground">Immediate response:</span> {incident.immediate_action || "Not recorded"}</div>
            {incident.warning_signals && (
              <div className="md:col-span-2"><span className="text-muted-foreground">Warning signals (as reported):</span> {incident.warning_signals}</div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Attachments</h3>
            {caseSummary.attachments?.length ? (
              <ul className="space-y-1 text-sm">
                {caseSummary.attachments.map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between border border-border rounded px-3 py-2">
                    <span>{a.file_name} <span className="text-xs text-muted-foreground">({a.predates_incident ? "before incident" : "recorded afterward"})</span></span>
                    <a href={a.file_url} target="_blank" rel="noreferrer" className="text-primary underline text-xs">Open</a>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No attachments recorded.</p>}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Existing actions & effectiveness</h3>
            {caseSummary.actions?.length ? (
              <ul className="space-y-1 text-sm">
                {caseSummary.actions.map((a: any) => (
                  <li key={a.id} className="border border-border rounded px-3 py-2">
                    <span className="font-medium">{a.title}</span> — {a.completed_at ? `Completed ${fmtDate(a.completed_at)}` : (a.status || "Open")}
                    {" · "}{a.assigned_to_name}
                    {a.due_date ? ` · Due ${fmtDate(a.due_date)}` : ""}
                    {a.effectiveness_outcome ? ` · Effectiveness: ${a.effectiveness_outcome}` : " · Effectiveness: not yet reviewed"}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No actions linked to this incident yet.</p>}
          </div>
        </div>

        {/* Findings / draft */}
        {active ? (
          <div className="bg-card border-2 border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg text-foreground">Review findings {active.status === "Completed" && "(completed — read only)"}</h2>
            </div>

            {DRAFT_KEYS.filter((k) => !["effectiveness_evidence_needed", "effectiveness_recheck_at"].includes(k)).map((key) => (
              <div key={key}>
                <label className="block text-xs text-muted-foreground mb-1">{FIELD_LABELS[key] || key}</label>
                <textarea
                  value={draft[key] || ""}
                  disabled={!canEditActive}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  rows={2}
                  className="w-full text-sm p-2 border border-border rounded-lg bg-background disabled:opacity-60"
                />
              </div>
            ))}

            <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
              <p className="text-xs font-semibold text-foreground">Where effectiveness is still unknown</p>
              <textarea
                placeholder="What evidence is needed?"
                value={draft.effectiveness_evidence_needed || ""}
                disabled={!canEditActive}
                onChange={(e) => setDraft((d) => ({ ...d, effectiveness_evidence_needed: e.target.value }))}
                rows={2}
                className="w-full text-sm p-2 border border-border rounded-lg bg-background disabled:opacity-60"
              />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Check by:</span>
                <input type="date" value={draft.effectiveness_recheck_at || ""} disabled={!canEditActive}
                  onChange={(e) => setDraft((d) => ({ ...d, effectiveness_recheck_at: e.target.value }))}
                  className="p-2 border border-border rounded-lg bg-background text-sm disabled:opacity-60" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">External reference follow-up</label>
              <textarea
                value={draft.external_reference_notes || ""}
                disabled={!canEditActive}
                onChange={(e) => setDraft((d) => ({ ...d, external_reference_notes: e.target.value }))}
                rows={2}
                className="w-full text-sm p-2 border border-border rounded-lg bg-background disabled:opacity-60"
              />
            </div>

            {canEditActive && (
              <Button onClick={() => saveDraft()} disabled={busy}>{busy ? "Saving…" : "Save draft"}</Button>
            )}

            {/* Waiting toggle */}
            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground mb-2">Waiting state</p>
              {isWaiting ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-amber-700">Waiting on: {active.waiting_reason}</span>
                  {canEditActive && <Button variant="outline" onClick={() => saveWaiting(false)} disabled={busy}>No longer waiting</Button>}
                </div>
              ) : canEditActive ? (
                <div className="flex gap-2 items-start flex-wrap">
                  <input
                    placeholder="What evidence is this waiting on?"
                    value={waitingReason}
                    onChange={(e) => setWaitingReason(e.target.value)}
                    className="flex-1 min-w-[240px] text-sm p-2 border border-border rounded-lg bg-background"
                  />
                  <Button variant="outline" onClick={() => saveWaiting(true)} disabled={busy}>Mark as waiting</Button>
                </div>
              ) : <p className="text-sm text-muted-foreground">Not waiting.</p>}
            </div>

            {/* Actions */}
            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground mb-2">Add an action</p>
              {canEditActive ? (
                <div className="space-y-2">
                  <input placeholder="Action title (optional)" value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} className="w-full text-sm p-2 border border-border rounded-lg bg-background" />
                  <div className="flex gap-2 flex-wrap">
                    <select value={actionOwner} onChange={(e) => setActionOwner(e.target.value)} className="flex-1 min-w-[200px] text-sm p-2 border border-border rounded-lg bg-background">
                      <option value="">Choose who is responsible…</option>
                      {owners.map((u: any) => <option key={u.id} value={u.id}>{u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim()}</option>)}
                    </select>
                    <input type="date" value={actionDue} onChange={(e) => setActionDue(e.target.value)} className="p-2 border border-border rounded-lg bg-background text-sm" />
                  </div>
                  <textarea placeholder="What did this review find, and why is this action needed? *" value={actionRationale} onChange={(e) => setActionRationale(e.target.value)} rows={2} className="w-full text-sm p-2 border border-border rounded-lg bg-background" />
                  <Button onClick={addAction} disabled={addingAction}>{addingAction ? "Adding…" : "Add action"}</Button>
                </div>
              ) : <p className="text-sm text-muted-foreground">Only the assigned reviewer can add actions.</p>}
            </div>

            {/* Learning */}
            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground mb-2">Learning</p>
              {active.learning_record_id ? (
                <p className="text-sm text-muted-foreground">A learning record is linked to this review.</p>
              ) : canEditActive ? (
                showLearning ? (
                  <LearningCapture sourceType="INCIDENT" sourceId={incident.id} houseId={incident.house_id} onDone={linkLearning} />
                ) : (
                  <Button variant="outline" onClick={() => setShowLearning(true)}>Create linked learning</Button>
                )
              ) : <p className="text-sm text-muted-foreground">No learning linked yet.</p>}
            </div>

            {/* Decision */}
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Decision</p>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Outcome *</label>
                <select value={outcome} disabled={!canEditActive} onChange={(e) => setOutcome(e.target.value)} className="w-full text-sm p-2 border border-border rounded-lg bg-background disabled:opacity-60">
                  <option value="">Choose an outcome…</option>
                  {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Rationale *</label>
                <textarea value={rationale} disabled={!canEditActive} onChange={(e) => setRationale(e.target.value)} rows={3} className="w-full text-sm p-2 border border-border rounded-lg bg-background disabled:opacity-60" />
              </div>
              {outcome && !isTerminal && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Next review date *</label>
                  <input type="date" value={nextReviewAt} disabled={!canEditActive} onChange={(e) => setNextReviewAt(e.target.value)} className="p-2 border border-border rounded-lg bg-background text-sm disabled:opacity-60" />
                </div>
              )}

              {canEditActive && (
                <div className="bg-muted/30 border border-border rounded-lg p-3 text-sm space-y-1">
                  <p className="font-semibold text-foreground">Before you complete this review</p>
                  <p>Outcome: {outcome || "Not chosen yet"}</p>
                  <p>Open actions remaining: {openActionsCount}</p>
                  <p>Evidence gaps: {draft.evidence_gaps?.trim() ? draft.evidence_gaps : "None recorded"}</p>
                  {outcome === "Ready for resolution" && (
                    <p className="flex items-center gap-1 text-amber-700"><AlertTriangle className="w-4 h-4" /> This does not close the incident automatically — record a separate resolution decision from Incident Detail.</p>
                  )}
                  {outcome === "Refer for leadership oversight" && (
                    <p className="flex items-center gap-1 text-amber-700"><AlertTriangle className="w-4 h-4" /> Leadership (Director / Responsible Individual) will be notified on completion.</p>
                  )}
                </div>
              )}

              {canEditActive && (
                <Button onClick={completeReview} disabled={busy} className="bg-primary text-primary-foreground">
                  {busy ? "Completing…" : "Complete review"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card border-2 border-border p-6">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Assign a reviewer above to begin the serious incident review.</p>
          </div>
        )}
      </div>
    </div>
  );
}
