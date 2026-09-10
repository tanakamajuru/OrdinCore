import { useState } from "react";
import { X, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onClosed?: (result?: any) => void;
  target: { type: "escalation" | "risk"; id: string; title?: string };
  // Gates derived from real state (e.g. the escalation's lifecycle). When true the
  // gate is shown as system-confirmed and locked, rather than a self-attest checkbox.
  derivedActionsComplete?: boolean;
  derivedEffectivenessReviewed?: boolean;
  linkedActionCount?: number;
  onCreateOrLinkAction?: () => void;
  // The decision/notes the closer already wrote on the escalation — reused as the closure
  // evidence so they don't have to type the same thing twice.
  evidence?: string;
}

export function ClosureReviewModal({ open, onClose, onClosed, target, derivedActionsComplete, derivedEffectivenessReviewed, linkedActionCount = 0, onCreateOrLinkAction, evidence }: Props) {
  const [patternReduced, setPatternReduced] = useState(false);
  const [evidenceBasis, setEvidenceBasis] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  // These gates must come from linked records; a checkbox cannot replace system evidence.
  const hasLinkedActions = linkedActionCount > 0;
  const actionsOk = hasLinkedActions && !!derivedActionsComplete;
  const effOk = hasLinkedActions && !!derivedEffectivenessReviewed;

  // An escalation with linked actions closes on the action/effectiveness gate. One with none may
  // close on a genuine alternative basis — never by inventing an action to satisfy the form.
  const blocked =
    !patternReduced ? "Confirm that the reason for escalation has been addressed." :
    !hasLinkedActions && !evidenceBasis ? "Select the genuine evidence basis for closure." :
    hasLinkedActions && !actionsOk ? "All linked corrective actions must be complete." :
    hasLinkedActions && !effOk ? "Effectiveness must be reviewed before closure." :
    ((evidence || "").trim().length < 20) ? "Record meaningful closure evidence in Review outcome and rationale." :
    null;

  const submit = async () => {
    if (blocked) { toast.error(blocked); return; }
    setBusy(true);
    try {
      // Reuse the decision & notes already recorded on the escalation as the closure
      // evidence; fall back to a standard phrase if none was written.
      const evidenceText = (evidence || "").trim() || "Closed after evidence-based review — see decision & notes.";
      const payload = {
        pattern_reduced: patternReduced,
        actions_completed: actionsOk,
        effectiveness_reviewed: effOk,
        // Closing means the concern is resolved here — by definition no further escalation
        // is required (raising it higher is the separate "Escalate further" action).
        further_escalation_required: false,
        closure_reason: "Closed after evidence-based review",
        evidence: evidenceText,
        evidence_basis: hasLinkedActions ? "LINKED_ACTIONS" : evidenceBasis,
      };
      const res: any = target.type === "escalation"
        ? await apiClient.closeEscalation(target.id, payload)
        : await apiClient.closeRisk(target.id, payload);
      toast.success(`${target.type === "escalation" ? "Escalation" : "Risk"} closed with evidence.`);
      // Doctrine: closing the escalation is NOT closing the risk. Hand back the closure result
      // (carrying linked_risk_id / post_closure_risk_review_required) so the caller can return
      // the RM to the post-closure risk decision.
      onClosed?.(res?.data?.data ?? res?.data ?? res);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to close.");
    } finally {
      setBusy(false);
    }
  };

  // System gate: green only when supported by linked records; never self-attested.
  const Gate = ({ label, derived }: { label: string; derived?: boolean }) =>
    derived ? (
      <div className="flex items-start gap-2 text-sm py-1.5 text-success">
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{label} <span className="text-xs text-muted-foreground">(confirmed by system)</span></span>
      </div>
    ) : (
      <div className="flex items-start gap-2 text-sm py-1.5 text-amber-700">
        <span className="w-4 h-4 mt-0.5 shrink-0 rounded-full border border-amber-500" />
        <span>{label} <span className="text-xs text-muted-foreground">(not confirmed)</span></span>
      </div>
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
          {hasLinkedActions ? <>
            <Gate label="All required linked actions are complete." derived={actionsOk} />
            <Gate label="Linked-action effectiveness has been reviewed." derived={effOk} />
          </> : <div className="my-3 rounded-lg border border-border p-3">
            <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-2">Evidence basis where no action was required</label>
            <select value={evidenceBasis} onChange={(e) => setEvidenceBasis(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-sm">
              <option value="">Select evidence basis…</option>
              <option value="EXISTING_CONTROL">Existing control already addressed the concern</option>
              <option value="IMMEDIATE_MEASURE">Immediate safeguarding or safety measure</option>
              <option value="EXTERNAL_INTERVENTION">External professional or emergency intervention</option>
              <option value="NO_LONGER_APPLICABLE">Concern confirmed no longer applicable</option>
            </select>
            {onCreateOrLinkAction && <button type="button" onClick={onCreateOrLinkAction} className="mt-2 text-sm text-primary hover:underline">A new action is genuinely required instead</button>}
          </div>}
          {/* Closure attestation — a human judgement, so it stays a checkbox. Doctrine: an
              escalation can originate from a single critical signal, incident, risk or governance
              decision — not only a pattern — so the escalation attestation speaks to the reason for
              escalation being addressed, while risk closure keeps the pattern-reduced wording. */}
          <label className="flex items-start gap-2 text-sm py-1.5">
            <input type="checkbox" checked={patternReduced} onChange={(e) => setPatternReduced(e.target.checked)} className="mt-0.5" />
            <span>{target.type === "escalation"
              ? "The reason for escalation has been addressed and there is evidence supporting closure."
              : "The pattern has reduced and the concern is resolved."}</span>
          </label>
          {/* Evidence is taken from the "Decision & notes" already recorded on the escalation —
              no need to write it a second time. Tick the gates and close. */}
          {(evidence || "").trim() ? (
            <div className="mt-3 bg-muted/40 border border-border rounded-lg p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Closure evidence — from your decision &amp; notes</p>
              <p className="text-sm text-foreground whitespace-pre-line">{evidence}</p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Your decision &amp; notes on the escalation will be recorded as the closure evidence.</p>
          )}
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
