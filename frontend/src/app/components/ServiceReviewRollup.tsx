import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { BackButton } from "./ui/BackButton";
import { Layers, Building2, Activity, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { apiClient } from "@/services/api";
import { toast } from "sonner";

// Director/RI read-only roll-up: the week's per-house weekly reviews aggregated into
// one organisational picture. Authoring stays at the house; leadership reads the whole.
const POSITION_TONE: Record<string, string> = {
  Stable: "bg-emerald-100 text-emerald-700",
  Watch: "bg-sky-100 text-sky-700",
  Concern: "bg-amber-100 text-amber-700",
  Escalating: "bg-orange-100 text-orange-700",
  "Serious Concern": "bg-red-100 text-red-700",
};

export function ServiceReviewRollup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [week, setWeek] = useState<string>(() => new URLSearchParams(window.location.search).get("weekEnding") || "");
  const [loading, setLoading] = useState(true);
  const [rollup, setRollup] = useState<any>(null);
  const [signing, setSigning] = useState(false);
  const [conclusion, setConclusion] = useState("");
  const [rationale, setRationale] = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = String(user?.role || localStorage.getItem("userRole") || "").toUpperCase().replace(/-/g, "_");
  // Provider assurance sign-off is the Responsible Individual's decision (separation of duties).
  // A Director validates the service reviews; they do NOT sign provider assurance.
  const isRI = ["RESPONSIBLE_INDIVIDUAL", "ADMIN", "SUPER_ADMIN"].includes(role);
  const isDirector = role === "DIRECTOR";
  const RI_CONCLUSIONS = ["Assured", "Assured with actions", "Further evidence required", "Not assured"];
  const fmtWeek = (v: any) => {
    const s = String(v ?? "").slice(0, 10);
    const d = new Date(`${s}T12:00:00Z`);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };

  useEffect(() => { load(week); }, [week]);

  // Finding O: provider-level sign-off, keyed off the resolved week.
  useEffect(() => {
    const wk = data?.week_ending;
    if (!wk) { setRollup(null); return; }
    apiClient.get(`/weekly-reviews/rollup?week_ending=${wk}`).then((r: any) => setRollup(r.data || null)).catch(() => setRollup(null));
  }, [data?.week_ending]);

  const signProvider = async () => {
    if (!data?.week_ending) return;
    if (!conclusion) { toast.error("Select a provider assurance conclusion."); return; }
    if (rationale.trim().length < 20) { toast.error("Record an evidence-based rationale (at least 20 characters)."); return; }
    setSigning(true);
    try {
      await apiClient.post(`/weekly-reviews/rollup/sign`, { week_ending: data.week_ending, position: conclusion, statement: rationale.trim() });
      toast.success("Provider assurance decision recorded.");
      setConclusion(""); setRationale("");
      const r: any = await apiClient.get(`/weekly-reviews/rollup?week_ending=${data.week_ending}`);
      setRollup(r.data || null);
    } catch (e: any) { toast.error(e?.message || "Failed to record provider assurance decision"); }
    finally { setSigning(false); }
  };

  // Finding M: chase the unread Team Leaders for a published site review.
  const remindUnread = async (reviewId: string) => {
    try {
      const r: any = await apiClient.post(`/weekly-reviews/${reviewId}/remind`, {});
      toast.success(`Reminder sent to ${r.data?.reminded ?? 0} unread.`);
    } catch (e: any) { toast.error(e?.message || "Failed to send reminders"); }
  };

  const load = async (wk: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/weekly-reviews/service-rollup${wk ? `?week_ending=${wk}` : ""}`);
      setData((res as any).data || null);
    } catch {
      toast.error("Failed to load service roll-up");
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (h: any) =>
    h.published ? "Published" : h.validation_status === "Approved" || String(h.status).toUpperCase() === "LOCKED" ? "Validated" :
    h.finalised ? "Awaiting validation" : "Draft";

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20 max-w-7xl mx-auto">
        <BackButton />
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2"><Layers className="w-6 h-6 text-primary" /> Service Review Roll-up</h1>
            <p className="text-sm text-muted-foreground mt-1">The week's house reviews, aggregated into one organisational view. Read-only — each review is authored and acknowledged at its house.</p>
          </div>
          {data?.weeks?.length > 0 && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Week ending</label>
              <select value={data.week_ending || ""} onChange={(e) => setWeek(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-background text-sm">
                {data.weeks.map((w: string) => <option key={w} value={w}>{fmtWeek(w)}</option>)}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : !data?.week_ending ? (
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
            No weekly reviews yet. Once Registered Managers finalise their house reviews, the organisational roll-up appears here.
          </div>
        ) : (
          <>
            {rollup && (
              <div className="mb-6 bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-foreground">Provider Weekly Assurance — Week ending {rollup.week_ending_label || fmtWeek(rollup.week_ending)}</h3>
                    <p className="text-xs text-muted-foreground">{rollup.director_validated_count ?? 0} of {rollup.included_service_count ?? rollup.sites_total ?? 0} service reviews Director validated{typeof rollup.rm_finalised_count === "number" ? ` · ${rollup.rm_finalised_count} RM finalised` : ""}</p>
                  </div>
                  {rollup.signoff ? (
                    <span className="text-sm text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {rollup.signoff.position ? `${rollup.signoff.position} — ` : ""}signed by {rollup.signoff.acknowledged_by_name}</span>
                  ) : null}
                </div>

                {/* Gate: assurance is offered to the RI only when every included service is validated. */}
                {!rollup.signoff && !rollup.assurance_ready && (rollup.blockers?.length > 0) && (
                  <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 font-medium mb-1"><AlertTriangle className="w-4 h-4 shrink-0" /> Provider assurance not ready</div>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {rollup.blockers.map((b: any) => <li key={b.service_id}>{b.name} — {b.reason}</li>)}
                    </ul>
                  </div>
                )}

                {/* RI: record the assurance decision, only when the evidence gate is satisfied. */}
                {!rollup.signoff && isRI && rollup.assurance_ready && (
                  <div className="mt-4 border-t border-border pt-4">
                    <label className="block text-xs font-medium text-foreground mb-1">Provider assurance conclusion</label>
                    <select value={conclusion} onChange={(e) => setConclusion(e.target.value)} className="w-full sm:w-auto px-3 py-2 border border-border rounded-lg bg-background text-sm mb-2">
                      <option value="">Select a conclusion…</option>
                      {RI_CONCLUSIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <label className="block text-xs font-medium text-foreground mb-1">Evidence-based rationale</label>
                    <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={3} placeholder="Summarise the evidence supporting this provider-level assurance conclusion." className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm mb-2" />
                    <button onClick={signProvider} disabled={signing} className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40">{signing ? "Recording…" : "Record assurance decision"}</button>
                  </div>
                )}

                {/* RI but not ready: no control, gate reason shown above. */}
                {!rollup.signoff && isRI && !rollup.assurance_ready && (
                  <p className="mt-3 text-xs text-muted-foreground">Provider assurance sign-off will be available once every service review is Director validated.</p>
                )}

                {/* Director: validates service reviews; does not sign provider assurance. */}
                {!rollup.signoff && isDirector && (
                  <div className="mt-3 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
                    Provider assurance sign-off is the Responsible Individual's decision. Your role is to validate or challenge each service review.
                    <button onClick={() => navigate("/weekly-review")} className="ml-2 text-primary underline">Open outstanding validation</button>
                  </div>
                )}

                {rollup.signoff && <p className="text-xs text-muted-foreground italic mt-2 border-l-2 border-border pl-3">{rollup.signoff.statement}</p>}
                {rollup.sites?.some((s: any) => s.published) && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground mb-1">Chase unread on published sites:</p>
                    <div className="flex flex-wrap gap-2">
                      {rollup.sites.filter((s: any) => s.published && s.review_id).map((s: any) => (
                        <button key={s.review_id} onClick={() => remindUnread(s.review_id)} className="text-[11px] px-2 py-1 rounded border border-border hover:bg-muted">Remind — {s.house}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Org summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-2xl font-semibold text-foreground flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> {data.summary.director_validated_count ?? 0}<span className="text-base text-muted-foreground">/ {data.summary.services_total}</span></div>
                <div className="text-xs text-muted-foreground mt-1">Director validated{typeof data.summary.rm_finalised_count === "number" ? ` · ${data.summary.rm_finalised_count} RM finalised` : ""}</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-2xl font-semibold text-foreground flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> {data.summary.total_signals}</div>
                <div className="text-xs text-muted-foreground mt-1">Signals across services</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 col-span-2">
                <div className="text-xs text-muted-foreground mb-1.5">Positions</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(data.summary.positions).map(([p, n]: any) => (
                    <span key={p} className={`text-xs rounded px-2 py-0.5 ${POSITION_TONE[p] || "bg-muted text-muted-foreground"}`}>{p}: {n}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Awaiting */}
            {data.summary.awaiting?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Awaiting a review this week: {data.summary.awaiting.map((a: any) => a.house_name).join(", ")}</p>
              </div>
            )}

            {/* Per-house cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.houses.map((h: any) => {
                const hasReview = !!h.review_id;
                return (
                <div key={h.review_id || h.house_id} onClick={() => hasReview && navigate(`/weekly-review/${h.review_id}`)}
                  className={`bg-card border-2 rounded-xl p-5 transition-colors ${hasReview ? "border-border cursor-pointer hover:border-primary/40" : "border-dashed border-amber-300"}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{h.house_name}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      {h.position && <span className={`text-xs rounded px-2 py-0.5 ${POSITION_TONE[h.position] || "bg-muted text-muted-foreground"}`}>{h.position}</span>}
                      {hasReview ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <span className="text-[11px] text-amber-700 font-medium">Not started</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {statusLabel(h)}
                    {h.created_by_name && <span>· by {h.created_by_name}</span>}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                    <span><b className="text-foreground">{h.signals}</b> signals</span>
                    <span><b className="text-foreground">{h.repeats}</b> patterns</span>
                    <span><b className="text-foreground">{h.risks}</b> risks</span>
                  </div>
                  {(h.narrative || h.interpretation) && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{h.narrative || h.interpretation}</p>
                  )}
                </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground mt-6">Descriptive, not predictive. This aggregates the leadership positions authored at each house. The RI/Director interprets; the roll-up evidences.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default ServiceReviewRollup;
