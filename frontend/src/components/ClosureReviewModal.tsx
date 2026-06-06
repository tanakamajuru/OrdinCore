import { useState } from "react";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
  target: { type: "escalation" | "risk"; id: string; title?: string };
}

export function ClosureReviewModal({ open, onClose, onClosed, target }: Props) {
  const [patternReduced, setPatternReduced] = useState(false);
  const [actionsCompleted, setActionsCompleted] = useState(false);
  const [effectivenessReviewed, setEffectivenessReviewed] = useState(false);
  const [furtherEscalation, setFurtherEscalation] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const blocked =
    !actionsCompleted ? "All required actions must be complete." :
    !effectivenessReviewed ? "Effectiveness must be reviewed before closure." :
    furtherEscalation ? "Cannot close while further escalation is required." :
    evidence.trim().length < 20 ? "Closure evidence (min 20 characters) is required." :
    null;

  const submit = async () => {
    if (blocked) { toast.error(blocked); return; }
    setBusy(true);
    try {
      const payload = {
        pattern_reduced: patternReduced,
        actions_completed: actionsCompleted,
        effectiveness_reviewed: effectivenessReviewed,
        further_escalation_required: furtherEscalation,
        closure_reason: "Closed after evidence-based review",
        evidence: evidence.trim(),
      };
      if (target.type === "escalation") await apiClient.closeEscalation(target.id, payload);
      else await apiClient.closeRisk(target.id, payload);
      toast.success(`${target.type === "escalation" ? "Escalation" : "Risk"} closed with evidence.`);
      onClosed?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to close.");
    } finally {
      setBusy(false);
    }
  };

  const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-start gap-2 text-sm py-1.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Evidence-Based Closure</h3>
              {target.title && <p className="text-xs text-muted-foreground">{target.title}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-1 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-2">Closure requires all governance gates to pass.</p>
          <Check label="The pattern has reduced." checked={patternReduced} onChange={setPatternReduced} />
          <Check label="All required actions are complete." checked={actionsCompleted} onChange={setActionsCompleted} />
          <Check label="Effectiveness has been reviewed." checked={effectivenessReviewed} onChange={setEffectivenessReviewed} />
          <Check label="Further escalation is still required." checked={furtherEscalation} onChange={setFurtherEscalation} />
          <div className="mt-3">
            <label className="block text-sm font-medium mb-1">Closure evidence</label>
            <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={3}
              placeholder="Describe why closure is justified (min 20 characters)…"
              className="w-full border border-border rounded-lg p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
          {blocked && <p className="text-xs text-amber-600 mt-2">⚠ {blocked}</p>}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={submit} disabled={busy || !!blocked} className="px-4 py-2 rounded-lg bg-success text-success-foreground text-sm hover:bg-success/90 disabled:opacity-50 flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Close with Evidence
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClosureReviewModal;
