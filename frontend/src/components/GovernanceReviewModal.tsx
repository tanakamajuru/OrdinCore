import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

type Decision = "Monitor" | "Create Action" | "Escalate" | "Close" | "Reopen";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
  context: { risk_id?: string; escalation_id?: string; service_id?: string; theme?: string };
  reviewType?: "RM_REVIEW" | "DIRECTOR_REVIEW" | "RI_ASSURANCE_REVIEW";
}

const DECISIONS: Decision[] = ["Monitor", "Create Action", "Escalate", "Close", "Reopen"];

export function GovernanceReviewModal({ open, onClose, onSubmitted, context, reviewType = "RM_REVIEW" }: Props) {
  const [whatIsHappening, setWhatIsHappening] = useState("");
  const [decision, setDecision] = useState<Decision>("Monitor");
  const [escalationRequired, setEscalationRequired] = useState(false);
  const [actionRequired, setActionRequired] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [openEscalations, setOpenEscalations] = useState<any[]>([]);
  const [openActions, setOpenActions] = useState<any[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Read the risk's current state on open so the reviewer isn't asked to escalate/act
  // blind — the modal was previously stateless and always offered fresh, unchecked
  // decisions even when an escalation was already open (Finding E). Narrowed client-side.
  useEffect(() => {
    if (!open) return;
    if (!context.risk_id) { setOpenEscalations([]); setOpenActions([]); return; }
    let active = true;
    const notClosed = (s: any) => !["Closed", "Resolved", "closed", "resolved", "Complete", "Completed", "Cancelled"].includes(String(s || ""));
    setLoadingInfo(true);
    (async () => {
      try {
        // "What is happening?" is sourced from the signal/pattern behind this item —
        // the reviewer reads the system's account, they do not re-type it.
        const riskRes: any = await apiClient.get(`/risks/${context.risk_id}`).catch(() => ({}));
        const rd = (riskRes as any)?.data?.data ?? (riskRes as any)?.data ?? {};
        const parts = [rd.description, rd.pulse_descriptions]
          .map((x: any) => (x || "").toString().trim()).filter(Boolean);
        const derived = parts.join(" — ") || context.theme || rd.title || "Governance review of this concern";

        const escRes: any = await (apiClient as any).getEscalations(1, 200).catch(() => ({}));
        const escList = escRes?.data?.data ?? escRes?.data ?? [];
        const actRes: any = await apiClient.get("/actions/oversight").catch(() => ({}));
        const actList = (actRes as any)?.data?.data ?? (actRes as any)?.data ?? [];
        if (!active) return;
        setWhatIsHappening(derived);
        setOpenEscalations(Array.isArray(escList) ? escList.filter((e: any) => e.risk_id === context.risk_id && notClosed(e.lifecycle_status || e.status)) : []);
        setOpenActions(Array.isArray(actList) ? actList.filter((a: any) => a.risk_id === context.risk_id && notClosed(a.status)) : []);
      } catch { /* non-fatal — fall back to the plain modal */ }
      finally { if (active) setLoadingInfo(false); }
    })();
    return () => { active = false; };
  }, [open, context.risk_id, context.theme]);

  if (!open) return null;

  const submit = async () => {
    if (whatIsHappening.trim().length < 5) { toast.error("Describe what is happening (min 5 characters)."); return; }
    setBusy(true);
    try {
      await apiClient.createGovernanceReview({
        risk_id: context.risk_id,
        escalation_id: context.escalation_id,
        service_id: context.service_id,
        review_type: reviewType,
        what_is_happening: whatIsHappening.trim(),
        decision,
        escalation_required: escalationRequired || decision === "Escalate",
        action_required: actionRequired || decision === "Create Action",
        evidence: evidence.trim() || undefined,
      });
      toast.success("Governance review recorded.");
      onSubmitted?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record governance review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground">Record Governance Review</h3>
            {context.theme && <p className="text-xs text-muted-foreground">{context.theme}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {(openEscalations.length > 0 || openActions.length > 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
              {openEscalations.length > 0 && (
                <div>⚠ Already escalated — {openEscalations.length} open escalation(s){openEscalations[0]?.escalated_to_name ? ` (to ${openEscalations[0].escalated_to_name})` : ""}.</div>
              )}
              {openActions.length > 0 && <div>{openActions.length} open action(s) already assigned on this risk.</div>}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">What is happening? <span className="text-muted-foreground font-normal">(from the signal)</span></label>
            {context.risk_id ? (
              <div className="w-full border border-border rounded-lg p-3 text-sm bg-muted/40 whitespace-pre-wrap min-h-[3.5rem] text-foreground">
                {loadingInfo ? "Loading signal details…" : (whatIsHappening || "No signal detail available for this concern.")}
              </div>
            ) : (
              <textarea value={whatIsHappening} onChange={(e) => setWhatIsHappening(e.target.value)} rows={3}
                placeholder="Describe the emerging pattern and your assessment…"
                className="w-full border border-border rounded-lg p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Decision</label>
            <select value={decision} onChange={(e) => setDecision(e.target.value as Decision)}
              className="w-full border border-border rounded-lg p-2.5 text-sm bg-background">
              {DECISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={actionRequired} onChange={(e) => setActionRequired(e.target.checked)} /> {openActions.length > 0 ? "Additional action required" : "Action required"}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={escalationRequired} onChange={(e) => setEscalationRequired(e.target.checked)} /> {openEscalations.length > 0 ? "Escalate further" : "Escalation required"}
            </label>
          </div>
          {decision === "Escalate" && openEscalations.length > 0 && (
            <p className="text-xs text-amber-600 -mt-2">This records escalating further — an escalation is already open, so it won't create a duplicate.</p>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Evidence / rationale <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={2}
              placeholder="What evidence supports this decision?"
              className="w-full border border-border rounded-lg p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={submit} disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Record Review
          </button>
        </div>
      </div>
    </div>
  );
}

export default GovernanceReviewModal;
