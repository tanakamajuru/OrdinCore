import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Network, ArrowUpRight, ArrowDownRight, Minus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

const unwrap = (r: any): any => r?.data?.data ?? r?.data ?? r;

// Chapters 8 & 9 — Systemic Governance Patterns (SGPs): recurring governance concerns
// identified across multiple people, teams, houses or services — an organisational issue,
// not an isolated operational event. Reviewed by an authorised governance reviewer
// (RM / Director / RI), not hard-coded to a single title.
const TRAJ: Record<string, { Icon: any; color: string; label: string }> = {
  Deteriorating: { Icon: ArrowUpRight, color: "#dc2626", label: "Deteriorating" },
  Improving: { Icon: ArrowDownRight, color: "#059669", label: "Improving" },
  Stable: { Icon: Minus, color: "#d97706", label: "Stable" },
};

export function SystemicPatterns() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [outcome, setOutcome] = useState("Continue Monitoring");
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // includePromoted: a systemic pattern that has already been promoted to a strategic risk
      // must still appear on this leadership view (with its "View risk" link) — the RM5 decision
      // board excludes promoted ones, but oversight should not lose sight of them.
      const data = unwrap(await apiClient.get("/rm/patterns?includePromoted=1")) || {};
      setItems(Array.isArray(data.across) ? data.across : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submitReview = async () => {
    if (rationale.trim().length < 20) { toast.error("A review rationale of at least 20 characters is required."); return; }
    setBusy(true);
    try {
      const res: any = await apiClient.post(`/governance-workflow/patterns/${reviewTarget.id}/review`, { outcome, rationale: rationale.trim() });
      const na = (res?.data?.data ?? res?.data ?? {}).next_action;
      setReviewTarget(null); setRationale(""); setOutcome("Continue Monitoring");
      if (na?.type === "promote") { toast.success("Review recorded — promoting to a risk"); navigate(`/risks/promote?cluster_id=${na.cluster_id}`, { state: { cluster_id: na.cluster_id } }); return; }
      toast.success(na?.type === "escalated" ? "Review recorded — escalation opened" : "Systemic pattern review recorded");
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || "Failed to record review"); }
    finally { setBusy(false); }
  };

  const openReview = (p: any) => { setReviewTarget(p); setOutcome("Continue Monitoring"); setRationale(""); };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 lg:px-10 pt-20 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600"><Network size={22} /></div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Systemic Governance Patterns</h1>
            <p className="text-sm text-muted-foreground">Recurring governance concerns crossing multiple services — organisational issues requiring leadership attention.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : items.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center text-muted-foreground mt-6">No systemic (cross-service) patterns detected. Concerns confined to one service appear on the RM pipeline.</div>
        ) : (
          <div className="bg-card border-2 border-border rounded-xl overflow-hidden mt-6">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase text-muted-foreground border-b border-border bg-muted/40">
                <th className="py-3 px-4">Pattern</th><th className="px-3">Services affected</th><th className="px-3">Trajectory</th><th className="px-3">Signals</th><th className="px-3">Risk</th><th className="px-3"></th>
              </tr></thead>
              <tbody>
                {items.map((p: any) => {
                  const t = TRAJ[p.trajectory] || TRAJ.Stable;
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
                            (p.days_open != null && p.days_open >= 28) ? `persists ${p.days_open}d` : (p.days_open != null ? `${p.days_open}d` : null),
                            (p.escalation_count > 0) ? `${p.escalation_count} escalation${p.escalation_count === 1 ? "" : "s"}` : null,
                          ].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td className="px-3"><span className="inline-flex items-center gap-1 font-medium" style={{ color: t.color }}><t.Icon size={15} />{t.label}</span></td>
                      <td className="px-3 text-foreground">{p.signalCount}</td>
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
              <h3 className="text-lg font-semibold text-foreground mb-1">Systemic Pattern Review</h3>
              <p className="text-xs text-muted-foreground mb-4">{reviewTarget.domain} — across {(reviewTarget.houses || reviewTarget.affected_house_names || []).length} services. Is the organisation-wide response working?</p>
              <label className="block text-sm font-medium mb-1">Outcome</label>
              <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="w-full mb-3 p-2.5 border-2 border-border rounded-lg bg-background text-sm">
                {["Continue Monitoring", "Improving", "Stable", "Deteriorating", "Promote to Risk", "Escalate", "Close"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {outcome === "Close" && <p className="text-[11px] text-amber-600 mb-2">A systemic pattern can only close once its linked risk and escalations are resolved.</p>}
              <label className="block text-sm font-medium mb-1">Rationale <span className="text-muted-foreground">(min 20 characters)</span></label>
              <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={3} className="w-full p-2.5 border-2 border-border rounded-lg bg-background text-sm resize-none" placeholder="What does the cross-service evidence show?" />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setReviewTarget(null)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
                <button onClick={submitReview} disabled={busy || rationale.trim().length < 20} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? "Saving…" : "Record review"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SystemicPatterns;
