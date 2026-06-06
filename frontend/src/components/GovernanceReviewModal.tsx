import { useState } from "react";
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
          <div>
            <label className="block text-sm font-medium mb-1">What is happening?</label>
            <textarea value={whatIsHappening} onChange={(e) => setWhatIsHappening(e.target.value)} rows={3}
              placeholder="Describe the emerging pattern and your assessment…"
              className="w-full border border-border rounded-lg p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
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
              <input type="checkbox" checked={actionRequired} onChange={(e) => setActionRequired(e.target.checked)} /> Action required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={escalationRequired} onChange={(e) => setEscalationRequired(e.target.checked)} /> Escalation required
            </label>
          </div>

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
