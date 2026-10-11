import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useAuth } from "@/hooks/useAuth";

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

  const load = async () => {
    setLoading(true);
    try { setRows(unwrap(await apiClient.get(`/learning/register${filter ? `?state=${filter}` : ""}`)) || []); }
    catch { setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const openAssess = (id: string) => { setAssessing(id); setAssessState("IDENTIFIED"); setAssessWhatLearnt(""); setAssessChange(""); setAssessReason(""); };
  // Deep-link from the work queue (/learning?focus=<id>) opens that deferred lesson's assessment.
  useEffect(() => {
    if (focusedRef.current || loading) return;
    const id = searchParams.get("focus");
    if (!id) return;
    const row = rows.find((r) => String(r.id) === id);
    if (row && row.state === "NOT_YET_ASSESSED") { focusedRef.current = true; openAssess(id); setTimeout(() => document.getElementById(`learning-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60); }
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

  const setProgress = async (id: string, progress: string) => {
    setBusy(id);
    try { await apiClient.post(`/learning/${id}/progress`, { progress }); toast.success("Progress updated"); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || "Could not update progress"); }
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
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-foreground">Learning & follow-through</h1>
          <p className="text-sm text-muted-foreground">Lessons recorded across governance, their linked improvement work, and whether the change was implemented and verified.</p>
        </div>

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
                  </div>
                </div>

                {r.state === "IDENTIFIED" && (
                  <div className="mt-2 space-y-1 text-sm">
                    {(r.source_action_title || r.source_review_outcome) && (
                      <p className="text-muted-foreground"><span className="text-foreground font-medium">From review:</span> {r.source_action_title || "Reviewed action"}
                        {r.source_review_outcome ? ` · rated ${r.source_review_outcome}` : ""}
                        {r.source_review_at ? ` · ${new Date(r.source_review_at).toLocaleDateString("en-GB")}` : ""}</p>
                    )}
                    {r.what_happened && <p className="text-muted-foreground"><span className="text-foreground font-medium">What happened:</span> {r.what_happened}</p>}
                    {r.what_learnt && <p className="text-muted-foreground"><span className="text-foreground font-medium">Learnt:</span> {r.what_learnt}</p>}
                    {r.change_needed && <p className="text-muted-foreground"><span className="text-foreground font-medium">Change:</span> {r.change_needed}</p>}
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

                {/* L5 progress ladder: recording a lesson is not the same as implementing or verifying it. */}
                {r.state === "IDENTIFIED" && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {PROGRESS.map((p, i) => {
                      const currentIdx = PROGRESS.findIndex((x) => x.v === r.progress);
                      const reached = i <= currentIdx;
                      return (
                        <button key={p.v} disabled={!canManage || busy === r.id || r.progress === p.v} onClick={() => setProgress(r.id, p.v)}
                          title={canManage ? "Set progress" : undefined}
                          className={`text-[11px] px-2.5 py-1 rounded-full border ${reached ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700" : "border-border text-muted-foreground"} ${canManage && r.progress !== p.v ? "hover:bg-muted cursor-pointer" : ""} disabled:opacity-60`}>
                          {reached ? "✓ " : ""}{p.label}
                        </button>
                      );
                    })}
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
