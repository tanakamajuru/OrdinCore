import { useState } from "react";
import { X, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
  target: { type: "escalation" | "risk"; id: string; title?: string };
  // Gates derived from real state (e.g. the escalation's lifecycle). When true the
  // gate is shown as system-confirmed and locked, rather than a self-attest checkbox.
  derivedActionsComplete?: boolean;
  derivedEffectivenessReviewed?: boolean;
}

export function ClosureReviewModal({ open, onClose, onClosed, target, derivedActionsComplete, derivedEffectivenessReviewed }: Props) {
  const [patternReduced, setPatternReduced] = useState(false);
  const [actionsCompleted, setActionsCompleted] = useState(false);
  const [effectivenessReviewed, setEffectivenessReviewed] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  // A gate is satisfied if the system already confirms it (derived) OR the closer attests it.
  const actionsOk = !!derivedActionsComplete || actionsCompleted;
  const effOk = !!derivedEffectivenessReviewed || effectivenessReviewed;

  const blocked =
    !actionsOk ? "All required actions must be complete." :
    !effOk ? "Effectiveness must be reviewed before closure." :
    evidence.trim().length < 20 ? "Add closure evidence (at least 20 characters)." :
    null;

  const submit = async () => {
    if (blocked) { toast.error(blocked); return; }
    setBusy(true);
    try {
      const payload = {
        pattern_reduced: patternReduced,
        actions_completed: actionsOk,
        effectiveness_reviewed: effOk,
        // Closing means the concern is resolved here — by definition no further escalation
        // is required (raising it higher is the separate "Escalate further" action).
        further_escalation_required: false,
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

  // A gate row: locked + green when system-derived, otherwise an attestation checkbox.
  const Gate = ({ label, derived, checked, onChange }: { label: string; derived?: boolean; checked: boolean; onChange: (v: boolean) => void }) =>
    derived ? (
      <div className="flex items-start gap-2 text-sm py-1.5 text-success">
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{label} <span className="text-xs text-muted-foreground">(confirmed by system)</span></span>
      </div>
    ) : (
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
          <p className="text-xs text-muted-foreground mb-2">
            Closure requires all governance gates to pass. Only close when the concern is genuinely
            resolved — to keep it open, use “Continue monitoring”; to raise it higher, use “Escalate further”.
          </p>
          <Gate label="All required actions are complete." derived={derivedActionsComplete} checked={actionsCompleted} onChange={setActionsCompleted} />
          <Gate label="Effectiveness has been reviewed." derived={derivedEffectivenessReviewed} checked={effectivenessReviewed} onChange={setEffectivenessReviewed} />
          {/* The pattern-reduced attestation is genuinely a human judgement, so it stays a checkbox. */}
          <label className="flex items-start gap-2 text-sm py-1.5">
            <input type="checkbox" checked={patternReduced} onChange={(e) => setPatternReduced(e.target.checked)} className="mt-0.5" />
            <span>The pattern has reduced and the concern is resolved.</span>
          </label>
          <div className="mt-3">
            <label className="block text-sm font-medium mb-1">Closure evidence</label>
            <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={3} spellCheck
              placeholder="Describe why closure is justified (min 20 characters)…"
              className="w-full border border-border rounded-lg p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border">
          {/* Always-visible reason, so a disabled button never looks "dead". */}
          {blocked && <p className="text-xs text-amber-600 mb-3">⚠ {blocked}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
            <button onClick={submit} disabled={busy || !!blocked}
              title={blocked || "Close with evidence"}
              className="px-4 py-2 rounded-lg bg-success text-success-foreground text-sm hover:bg-success/90 disabled:opacity-50 flex items-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Close with Evidence
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClosureReviewModal;
