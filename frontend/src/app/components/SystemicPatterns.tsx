import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Network, ArrowUpRight, ArrowDownRight, Minus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useGovernanceRefresh } from "@/hooks/useGovernanceRefresh";

const unwrap = (r: any): any => r?.data?.data ?? r?.data ?? r;

// Chapters 8 & 9 — Systemic Governance Patterns (SGPs): recurring governance concerns
// identified across multiple people, teams, houses or services — an organisational issue,
// not an isolated operational event. Reviewed by an authorised governance reviewer
// (RM / Director / RI), not hard-coded to a single title.
const TRAJ: Record<string, { Icon: any; color: string; label: string }> = {
  Deteriorating: { Icon: ArrowUpRight, color: "#dc2626", label: "Recorded evidence indicates deterioration" },
  Improving: { Icon: ArrowDownRight, color: "#059669", label: "Recorded evidence indicates improvement" },
  Stable: { Icon: Minus, color: "#d97706", label: "No material change detected" },
};

// /rm/patterns returns trajectory as an object { dir, basis, points, version }; older shapes and
// other endpoints send a plain direction string. Read the direction either way — rendering the
// object itself is a React "objects are not valid as a child" crash.
const dirOf = (x: any): string =>
  (typeof x === "string" ? x : (x?.dir || x?.direction)) || "Stable";

export function SystemicPatterns() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const guidedFocusRef = useRef(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [outcome, setOutcome] = useState("Continue Monitoring");
  const [rationale, setRationale] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [closureCheck, setClosureCheck] = useState<{ eligible: boolean; blockers: string[] } | null>(null);
  const [checkingClosure, setCheckingClosure] = useState(false);

  const didInitialLoadRef = useRef(false);
  const load = async () => {
    const first = !didInitialLoadRef.current;
    if (first) setLoading(true);
    try {
      // includePromoted: a systemic pattern that has already been promoted to a strategic risk
      // must still appear on this leadership view (with its "View risk" link) — the RM5 decision
      // board excludes promoted ones, but oversight should not lose sight of them.
      const data = unwrap(await apiClient.get("/rm/patterns?includePromoted=1")) || {};
      setItems(Array.isArray(data.across) ? data.across : []);
    } catch { setItems([]); }
    finally { if (first) setLoading(false); didInitialLoadRef.current = true; }
  };
  useEffect(() => { load(); }, []);
  useGovernanceRefresh(load);

  const submitReview = async () => {
    if (rationale.trim().length < 20) { toast.error("A review rationale of at least 20 characters is required."); return; }
    if (outcome === "Continue Monitoring" && (!nextDate || new Date(`${nextDate}T00:00:00`).getTime() <= Date.now())) { toast.error("Choose a future review date to keep monitoring this pattern."); return; }
    if (outcome === "Close" && (!closureCheck || !closureCheck.eligible)) { toast.error("Resolve the displayed closure blockers before closing this pattern."); return; }
    setBusy(true);
    try {
      const res: any = await apiClient.post(`/governance-workflow/patterns/${reviewTarget.id}/review`, { outcome, rationale: rationale.trim(), next_review_date: outcome === "Continue Monitoring" ? nextDate : undefined });
      const na = (res?.data?.data ?? res?.data ?? {}).next_action;
      setReviewTarget(null); setRationale(""); setOutcome("Continue Monitoring"); setNextDate("");
      if (na?.type === "promoted" && na?.risk_id) { toast.success("Review recorded — risk created"); navigate(`/risk-register/${na.risk_id}`); return; }
      if (na?.type === "escalated" && na?.escalation_id) { toast.success("Review recorded — escalation opened"); navigate(`/escalation-log?focus=${na.escalation_id}`); return; }
      toast.success(na?.type === "escalated" ? "Review recorded — escalation opened" : "Systemic pattern review recorded");
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || "Failed to record review"); }
    finally { setBusy(false); }
  };

  const openReview = (p: any) => { setReviewTarget(p); setOutcome("Continue Monitoring"); setRationale(""); setNextDate(""); setClosureCheck(null); };
  useEffect(() => {
    if (!reviewTarget || outcome !== "Close") { setClosureCheck(null); return; }
    let cancelled = false;
    setCheckingClosure(true);
    apiClient.get(`/governance-workflow/patterns/${reviewTarget.id}/closure-eligibility`)
      .then((res: any) => { if (!cancelled) setClosureCheck(unwrap(res)); })
      .catch(() => { if (!cancelled) setClosureCheck({ eligible: false, blockers: ["Closure eligibility could not be verified. Try again before closing."] }); })
      .finally(() => { if (!cancelled) setCheckingClosure(false); });
    return () => { cancelled = true; };
  }, [reviewTarget?.id, outcome]);
  useEffect(() => {
    if (guidedFocusRef.current || !items.length) return;
    const focusId = searchParams.get('focus') || searchParams.get('clusterId');
    if (!focusId) return;
    const target = items.find((p:any) => String(p.id) === String(focusId));
    if (target) { guidedFocusRef.current = true; openReview(target); }
  }, [items, searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 lg:px-10 pt-20 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600"><Network size={22} /></div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Potential Cross-Service Patterns</h1>
            <p className="text-sm text-muted-foreground">Recorded recurring concerns across services requiring leadership review. Detection does not by itself establish a systemic cause.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : items.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center text-muted-foreground mt-6">No potential cross-service patterns were detected from the available recorded evidence.</div>
        ) : (
          <div className="bg-card border-2 border-border rounded-xl overflow-hidden mt-6">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase text-muted-foreground border-b border-border bg-muted/40">
                <th className="py-3 px-4">Pattern</th><th className="px-3">Services affected</th><th className="px-3">Trajectory</th><th className="px-3">Signals</th><th className="px-3">Risk</th><th className="px-3"></th>
              </tr></thead>
              <tbody>
                {items.map((p: any) => {
                  const t = TRAJ[dirOf(p.trajectory)] || TRAJ.Stable;
                  const houses = p.houses || p.affected_house_names || [];
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium text-foreground">{p.domain}{p.person && p.person !== "—" ? <span className="text-muted-foreground font-normal"> · {p.person}</span> : null}
                        {p.last_reviewed_at && <div className="text-[11px] text-muted-foreground font-normal">Reviewed {new Date(p.last_reviewed_at).toLocaleDateString("en-GB")}{p.review_outcome ? ` · ${p.review_outcome}` : ""}</div>}
                      </td>
                      <td className="px-3 text-muted-foreground">
                        {Array.isArray(houses) ? houses.length : 0}{Array.isArray(houses) && houses.length ? <span className="text-[11px]"> ({houses.slice(0, 3).join(", ")}{houses.length > 3 ? "…" : ""})</span> : ""}
                        <div className="text-[10px] text-indigo-600 mt-0.5">
                          {[
                            (Array.isArray(houses) && houses.length >= 2) ? `${houses.length} services` : null,
                            p.days_open != null ? `first detected ${p.days_open}d ago` : null,
                            p.days_since_last_signal != null ? `last signal ${p.days_since_last_signal}d ago` : null,
                            (p.escalation_count > 0) ? `${p.escalation_count} escalation${p.escalation_count === 1 ? "" : "s"}` : null,
                          ].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td className="px-3"><span className="inline-flex items-center gap-1 font-medium" style={{ color: t.color }}><t.Icon size={15} />{t.label}</span></td>
                      <td className="px-3 text-foreground">
                        {p.signalCount} of {p.threshold || 3} required<span className="text-[10px] text-muted-foreground"> · {p.windowDays || 7}d</span>
                        {p.historicalSignalCount > p.signalCount && <div className="text-[10px] text-muted-foreground">{p.historicalSignalCount} historical linked</div>}
                        {Array.isArray(p.subthemes) && p.subthemes.length > 0 && <div className="text-[10px] text-muted-foreground">subtheme: {p.subthemes.slice(0, 2).join(", ")}</div>}
                        {p.signalCount < (p.threshold || 3) && <div className="text-[10px] text-amber-600">not yet an established pattern</div>}
                      </td>
                      <td className="px-3">{p.promotedRiskId ? <button onClick={() => navigate(`/risk-register/${p.promotedRiskId}`)} className="text-primary hover:underline inline-flex items-center gap-0.5">View risk <ChevronRight size={13} /></button> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3"><button onClick={() => openReview(p)} className="text-xs font-medium text-primary border border-primary/30 rounded px-2.5 py-1 hover:bg-primary/10">Review</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {reviewTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setReviewTarget(null)}>
            <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-foreground mb-1">Cross-Service Pattern Review</h3>
              <p className="text-xs text-muted-foreground mb-3">{reviewTarget.domain} — across {(reviewTarget.houses || reviewTarget.affected_house_names || []).length} services. Review the evidence, then choose the governance decision.</p>
              {/* Trajectory is EVIDENCE, shown read-only — it is never a review decision. */}
              {reviewTarget.trajectory && (
                <div className="mb-3 flex items-center gap-2 text-xs rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Recorded evidence trajectory:</span>
                  <span className="font-semibold" style={{ color: (TRAJ as any)[dirOf(reviewTarget.trajectory)]?.color || "#64748b" }}>{(TRAJ as any)[dirOf(reviewTarget.trajectory)]?.label || "No material change detected"}</span>
                </div>
              )}
              <label className="block text-sm font-medium mb-1">Governance decision</label>
              <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="w-full mb-3 p-2.5 border-2 border-border rounded-lg bg-background text-sm">
                {["Continue Monitoring", "Promote to Risk", "Escalate", "Close"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {outcome === "Continue Monitoring" && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Next review date</label>
                  <input type="date" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="w-full p-2.5 border-2 border-border rounded-lg bg-background text-sm" />
                </div>
              )}
              {outcome === "Close" && (
                <div className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                  {checkingClosure ? <p className="text-muted-foreground">Checking closure conditions…</p> : closureCheck?.eligible ? (
                    <p className="font-medium text-emerald-700">All recorded closure conditions are clear.</p>
                  ) : (
                    <>
                      <p className="font-medium text-amber-700">Closure is currently blocked:</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                        {(closureCheck?.blockers || ["Closure conditions have not yet been checked."]).map((b) => <li key={b}>{b}</li>)}
                      </ul>
                    </>
                  )}
                </div>
              )}
              <label className="block text-sm font-medium mb-1">Rationale <span className="text-muted-foreground">(min 20 characters)</span></label>
              <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={3} className="w-full p-2.5 border-2 border-border rounded-lg bg-background text-sm resize-none" placeholder="What does the cross-service evidence show?" />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setReviewTarget(null)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
                <button onClick={submitReview} disabled={busy || rationale.trim().length < 20 || (outcome === "Close" && (checkingClosure || !closureCheck?.eligible))} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? "Saving…" : outcome === "Close" ? "Close pattern" : "Record review"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SystemicPatterns;
