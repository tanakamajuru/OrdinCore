import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/services/api";
import { toast } from "sonner";

export type LearningSource = "EFFECTIVENESS" | "ESCALATION_CLOSURE" | "RISK_CLOSURE" | "PATTERN_CLOSURE" | "WEEKLY_REVIEW" | "INCIDENT";

// Reusable learning-capture panel (learning brief L1–L3). Records a structured, source-linked
// learning assessment. Honest states: staff are never forced to invent a lesson — "No learning
// identified" and "Not yet assessed" are first-class. Posts to the existing /learning API (#183).
export function LearningCapture({
  sourceType, sourceId, sourceReviewId, sourceContext, houseId, title = "Record learning", onDone,
}: {
  sourceType: LearningSource;
  sourceId?: string | null;
  // The exact effectiveness review this lesson came from (distinct from the originating action and
  // from any improvement action linked below).
  sourceReviewId?: string | null;
  // Automatic source context shown so the author never has to re-identify what they are learning from.
  sourceContext?: { label?: string | null; outcome?: string | null; service?: string | null; reviewedAt?: string | null } | null;
  houseId?: string | null;
  title?: string;
  onDone?: () => void;
}) {
  const [state, setState] = useState<"IDENTIFIED" | "NONE_IDENTIFIED" | "NOT_YET_ASSESSED">("IDENTIFIED");
  const [ownerId, setOwnerId] = useState("");
  const [owners, setOwners] = useState<any[]>([]);
  // One key per capture attempt — a retry (double-click, network retry) is idempotent; a distinct
  // later capture mounts fresh and gets a new key, so legitimate repeat lessons are never blocked.
  const idemKey = useRef<string>(crypto?.randomUUID?.() || String(Date.now() + Math.random()));
  const [whatHappened, setWhatHappened] = useState("");
  const [whatLearnt, setWhatLearnt] = useState("");
  const [changeNeeded, setChangeNeeded] = useState("");
  const [noReason, setNoReason] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  // L4: optionally link an EXISTING improvement action that carries the change forward.
  const [linkActionId, setLinkActionId] = useState("");
  const [actions, setActions] = useState<any[]>([]);
  const unwrap = (r: any): any => r?.data?.data ?? r?.data ?? r;
  useEffect(() => {
    if (state !== "IDENTIFIED") return;
    let off = false;
    apiClient.get("/actions/oversight").then((r: any) => {
      if (off) return;
      const rows = unwrap(r) || [];
      setActions((Array.isArray(rows) ? rows : []).filter((a: any) =>
        String(a.status) !== "Cancelled" && (!houseId || String(a.house_id) === String(houseId))));
    }).catch(() => { if (!off) setActions([]); });
    return () => { off = true; };
  }, [state, houseId]);

  // Owners for a deferred ("Not yet assessed") assessment — it needs an accountable person, not just
  // a date, so the deferred lesson cannot drift unowned.
  useEffect(() => {
    if (state !== "NOT_YET_ASSESSED" || owners.length) return;
    let off = false;
    apiClient.get("/users/directory").then((r: any) => { if (!off) setOwners(unwrap(r) || []); }).catch(() => { if (!off) setOwners([]); });
    return () => { off = true; };
  }, [state, owners.length]);

  const save = async () => {
    if (state === "IDENTIFIED" && whatLearnt.trim().length < 3) { toast.error("Record what was learnt."); return; }
    if (state === "NONE_IDENTIFIED" && noReason.trim().length < 3) { toast.error("Give a brief reason why no learning was identified."); return; }
    if (state === "NOT_YET_ASSESSED" && !reviewDate) { toast.error("Set a review date for the learning assessment."); return; }
    if (state === "NOT_YET_ASSESSED" && !ownerId) { toast.error("Name the owner accountable for the deferred assessment."); return; }
    setSaving(true);
    try {
      await apiClient.post("/learning", {
        source_type: sourceType, source_id: sourceId || null, source_review_id: sourceReviewId || undefined,
        idempotency_key: idemKey.current,
        house_id: houseId || null, state,
        what_happened: whatHappened.trim() || undefined,
        what_learnt: state === "IDENTIFIED" ? whatLearnt.trim() : undefined,
        change_needed: state === "IDENTIFIED" ? (changeNeeded.trim() || undefined) : undefined,
        linked_action_id: state === "IDENTIFIED" && linkActionId ? linkActionId : undefined,
        no_learning_reason: state === "NONE_IDENTIFIED" ? noReason.trim() : undefined,
        review_date: state === "NOT_YET_ASSESSED" ? reviewDate : undefined,
        owner_id: state === "NOT_YET_ASSESSED" ? ownerId : undefined,
      });
      toast.success("Learning recorded");
      setDone(true);
      onDone?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not record learning");
    } finally { setSaving(false); }
  };

  if (done) return (
    <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">Learning recorded. It appears in the weekly governance report.</div>
  );

  return (
    <div className="rounded-lg border border-border p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {onDone && <button type="button" onClick={() => { setDone(true); onDone(); }} className="text-xs text-muted-foreground hover:underline">Skip</button>}
      </div>
      {sourceContext && (sourceContext.label || sourceContext.outcome) && (
        <div className="rounded-lg bg-muted/40 border border-border p-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Learning from this review:</span>{" "}
          {sourceContext.label || "Reviewed action"}
          {sourceContext.outcome ? ` · outcome: ${sourceContext.outcome}` : ""}
          {sourceContext.service ? ` · ${sourceContext.service}` : ""}
          {sourceContext.reviewedAt ? ` · reviewed ${new Date(sourceContext.reviewedAt).toLocaleDateString("en-GB")}` : ""}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {([["IDENTIFIED", "Learning identified"], ["NONE_IDENTIFIED", "No learning identified"], ["NOT_YET_ASSESSED", "Not yet assessed"]] as const).map(([v, label]) => (
          <button key={v} type="button" onClick={() => setState(v)}
            className={`text-xs px-2.5 py-1 rounded-full border ${state === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>{label}</button>
        ))}
      </div>
      {state === "IDENTIFIED" && (
        <div className="space-y-2">
          <textarea value={whatHappened} onChange={(e) => setWhatHappened(e.target.value)} rows={2} placeholder="What happened / what was examined (optional)" className="w-full text-sm p-2 border border-border rounded-lg bg-background" />
          <textarea value={whatLearnt} onChange={(e) => setWhatLearnt(e.target.value)} rows={2} placeholder="What was learnt *" className="w-full text-sm p-2 border border-border rounded-lg bg-background" />
          <textarea value={changeNeeded} onChange={(e) => setChangeNeeded(e.target.value)} rows={2} placeholder="Change needed (optional)" className="w-full text-sm p-2 border border-border rounded-lg bg-background" />
          {changeNeeded.trim() && actions.length > 0 && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Link resulting improvement work — an existing action that carries this change forward (optional, separate from the reviewed action)</label>
              <select value={linkActionId} onChange={(e) => setLinkActionId(e.target.value)} className="w-full text-sm p-2 border border-border rounded-lg bg-background">
                <option value="">No linked action</option>
                {actions.map((a: any) => <option key={a.id} value={a.id}>{(a.title || a.action || "Action")}{a.assigned_to_name ? ` · ${a.assigned_to_name}` : ""} · {a.status}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
      {state === "NONE_IDENTIFIED" && (
        <textarea value={noReason} onChange={(e) => setNoReason(e.target.value)} rows={2} placeholder="Brief reason why no learning was identified *" className="w-full text-sm p-2 border border-border rounded-lg bg-background" />
      )}
      {state === "NOT_YET_ASSESSED" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Assessment due:</span>
            <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className="p-2 border border-border rounded-lg bg-background text-sm" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Accountable owner *</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="w-full text-sm p-2 border border-border rounded-lg bg-background">
              <option value="">Choose who is accountable…</option>
              {owners.map((u: any) => <option key={u.id} value={u.id}>{u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim()}{u.role ? ` (${String(u.role).replace(/_/g, " ")})` : ""}</option>)}
            </select>
          </div>
        </div>
      )}
      <button type="button" onClick={save} disabled={saving} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save learning"}</button>
    </div>
  );
}
