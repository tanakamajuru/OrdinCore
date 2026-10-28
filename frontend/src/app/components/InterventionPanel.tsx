import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownRight, Minus, Target, Loader2, Flag, ArrowRight, CheckCircle2, Link2, AlertTriangle, ChevronRight } from "lucide-react";
import { io, type Socket } from "socket.io-client";

const unwrap = (r: any): any => r?.data?.data ?? r?.data ?? r;

// Multiple linked delivery actions per intervention (brief 2 §1). Shows the existing linked actions
// with their canonical delivery evidence, lets the RM link more EXISTING actions (suggested from the
// theme's risks), and unlink — all by stable ID, deduped and audited server-side.
// 27 Oct developer instructions (P1, "Complete the read-only conversion"): linking/unlinking is
// retired server-side (410) — this is now a pure read-only display of what's already linked.
function LinkedActionsManager({ interventionId }: { interventionId: string }) {
  const [links, setLinks] = useState<any[]>([]);
  // Bug fix (24 Oct developer corrections, "Action retrieval failures appear as empty
  // results"): track loading/failure explicitly so a failed request never looks like a
  // genuine zero-result response.
  const [linksLoading, setLinksLoading] = useState(true);
  const [linksFailed, setLinksFailed] = useState(false);

  const load = async () => {
    setLinksLoading(true); setLinksFailed(false);
    try { setLinks(unwrap(await apiClient.get(`/interventions/${interventionId}/actions`)) || []); }
    catch { setLinksFailed(true); }
    finally { setLinksLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [interventionId]);

  return (
    <div className="mt-3 rounded-lg border border-border p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Linked delivery actions ({links.length})</span>
      </div>
      {linksLoading ? (
        <p className="text-[11px] text-muted-foreground">Loading…</p>
      ) : linksFailed ? (
        <p className="text-[11px] text-red-600 flex items-center gap-2">
          Couldn't load linked actions. <button onClick={load} className="underline">Retry</button>
        </p>
      ) : links.length === 0 && (
        <p className="text-[11px] text-muted-foreground">No delivery actions linked yet.</p>
      )}
      <div className="space-y-1.5">
        {links.map((l: any) => (
          <div key={l.action_id} className="flex items-start justify-between gap-2 text-xs">
            <div className="min-w-0">
              <p className="text-foreground truncate">{l.title || 'Action'}</p>
              <p className="text-[10px] text-muted-foreground">
                {l.owner || 'Unassigned'} · {l.status}{l.is_completed ? ' · complete' : ''}
                {l.effectiveness ? ` · ${l.effectiveness}` : (l.review_requirement === 'COMPLETION_ONLY' ? ' · no review required' : '')}
              </p>
              {l.relevance_reason && (
                <p className="text-[10px] text-amber-700" title="Linked outside this theme's own risks">Linked for: {l.relevance_reason}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DIR = {
  Deteriorating: { Icon: ArrowUpRight, color: "#dc2626", label: "Recorded evidence indicates deterioration" },
  Improving: { Icon: ArrowDownRight, color: "#059669", label: "Recorded evidence indicates improvement" },
  Stable: { Icon: Minus, color: "#d97706", label: "No material change detected" },
  // 25 Oct brief ("Trajectory"): a historical theme's engine result is "Insufficient evidence",
  // not "Stable" — without this entry the lookup fell through to Stable and rendered "No
  // material change detected" for a theme with no active risk to measure at all.
  "Insufficient evidence": { Icon: Minus, color: "#6b7280", label: "No active trajectory — insufficient evidence" },
} as const;

const CONCERN_TONE: Record<string, string> = {
  "Attention": "bg-red-100 text-red-700",
  "Review required": "bg-red-100 text-red-700",
  "Monitor": "bg-amber-100 text-amber-700",
  "Controlled": "bg-emerald-100 text-emerald-700",
  "Ready for closure review": "bg-emerald-100 text-emerald-700",
  "Low concern": "bg-emerald-100 text-emerald-700",
};

const STATUS_TONE: Record<string, string> = {
  "Planned": "bg-slate-100 text-slate-700",
  "In Progress": "bg-blue-100 text-blue-700",
  "Complete": "bg-emerald-100 text-emerald-700",
  "On Hold": "bg-amber-100 text-amber-700",
};

// The 6-week trajectory strip, with the week the intervention began marked.
function Timeline({ weeks }: { weeks: any[] }) {
  const max = Math.max(1, ...weeks.map((w) => Number(w.weight) || 0));
  return (
    <div className="mt-3">
      <div className="flex items-end gap-2 h-16">
        {weeks.map((w, i) => {
          const h = Math.round(((Number(w.weight) || 0) / max) * 100);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              {w.interventionStarted && <Flag className="w-3.5 h-3.5 text-primary mb-0.5" />}
              <div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(6, h)}%`, background: w.interventionStarted ? "#0ea5e9" : undefined }} title={`${w.label}: weight ${w.weight}`} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-1">
        {weeks.map((w, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground leading-tight">
            {w.label.replace("Week ", "W")}
            {w.interventionStarted && <div className="text-[8px] text-primary font-medium">Started</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InterventionPanel() {
  const navigate = useNavigate();
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // 27 Oct developer instructions (P1, "Reconcile historical plans"): read-only inventory of
  // historical/unlinked/ambiguous plans, classified server-side. Never mutates anything.
  const [reconciliation, setReconciliation] = useState<any[]>([]);
  const [showReconciliation, setShowReconciliation] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setThemes(unwrap(await apiClient.get("/interventions/themes")) || []); }
    catch { toast.error("Failed to load governance themes"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { apiClient.get("/interventions/reconciliation").then((r: any) => setReconciliation(unwrap(r) || [])).catch(() => setReconciliation([])); }, []);
  // Keep RM, Director and RI projections aligned. WebSocket gives prompt updates; focus and the
  // 60-second safety poll recover anything missed during disconnection/backgrounding.
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    const base = (import.meta as any).env?.VITE_WS_URL
      || ((import.meta as any).env?.VITE_API_URL || "http://localhost:3001/api/v1").replace(/\/api\/v1\/?$/, "");
    const socket: Socket = io(base, { auth: { token }, transports: ["websocket", "polling"], reconnection: true });
    const refresh = () => load();
    // Refetch only on a real change event. NOT on socket "connect": behind the proxy the websocket
    // reconnects every ~10-15s, and refetch-on-connect turned that into constant self-reloading.
    // The mount effect loads initially; focus + the 60s poll cover resync after a disconnection.
    socket.on("intervention.updated", refresh);
    window.addEventListener("focus", refresh);
    const poll = window.setInterval(refresh, 60_000);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", refresh);
      socket.off("intervention.updated", refresh);
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attention = useMemo(() => themes.filter((t) => ["Attention", "Review required"].includes(t.concern)).length, [themes]);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2"><Target className="w-6 h-6 text-primary" /> Management Response Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Trajectory-based governance — every theme carries a direction of travel, a leadership response and its measured effect. {attention > 0 && <span className="text-red-600 font-medium">{attention} theme{attention === 1 ? "" : "s"} need attention.</span>}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : themes.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">No active governance themes. Themes appear here once risks are on the register.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {themes.map((t) => {
              const d = (DIR as any)[t.trajectory?.direction] || DIR.Stable;
              const intv = t.intervention;
              return (
                <div key={t.theme} className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{t.theme}</h3>
                      {t.historical ? (
                        <p className="text-xs text-amber-700" title={t.historical_reason}>Historical — no active risk</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t.services} service{t.services === 1 ? "" : "s"} · {t.risks} risk{t.risks === 1 ? "" : "s"}</p>
                      )}
                    </div>
                    <span className={`text-[11px] rounded px-2 py-0.5 shrink-0 ${CONCERN_TONE[t.concern] || "bg-muted"}`}>{t.concern}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2" title={t.trajectory?.basis || ""}>
                    <d.Icon className="w-5 h-5" style={{ color: d.color }} />
                    <span className="text-sm font-semibold" style={{ color: d.color }}>{t.trajectory?.label || d.label}</span>
                  </div>

                  <Timeline weeks={t.timeline || []} />

                  <div className="mt-4 border-t border-border/60 pt-3 flex-1">
                    {intv ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Intervention</span>
                          <span className={`text-[10px] rounded px-2 py-0.5 ${STATUS_TONE[intv.status] || "bg-muted"}`}>{intv.status}</span>
                        </div>
                        <p className="text-sm text-foreground">{intv.intervention}</p>
                        {(() => {
                          const due = intv.review_date ? new Date(intv.review_date) : null;
                          // Bug fix (24 Oct developer corrections, "Overdue display ignores review
                          // completion"): this compared the due date against today with no check
                          // of whether the required effectiveness review had actually happened --
                          // a completed/reviewed plan kept showing overdue forever past its date.
                          // A manually-set status is not proof either; the real signal is a
                          // recorded effectiveness outcome (shown below at intv.effectiveness_review).
                          const reviewCompleted = !!intv.effectiveness_review?.outcome;
                          const overdue = due && !reviewCompleted ? due.setHours(0,0,0,0) < new Date().setHours(0,0,0,0) : false;
                          return (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1">
                              <div><span className="text-foreground font-medium">Owner:</span> {intv.owner_name || intv.owner_role || "—"}</div>
                              {/* Bug fix (24 Oct developer corrections, "Completion count differs
                                  from linked delivery work"): this counts EVERY action on every
                                  active risk in the theme, not just the actions actually linked
                                  to this intervention (that's the separate "Linked delivery
                                  actions" list below) -- labelled explicitly as theme-wide rather
                                  than implying it measures this intervention's own delivery. */}
                              {/* 25 Oct brief ("Counts"): a historical theme hard-codes
                                  openActions/completedActions to 0, which read as "0/0 done"
                                  right beside a genuinely completed linked action below — say
                                  Not applicable instead of implying zero work happened. */}
                              {t.historical ? (
                                <div title="This theme has no active risk, so theme-wide action totals do not apply — see Linked delivery actions below for this plan's own actions.">
                                  <span className="text-foreground font-medium">Theme actions:</span> Not applicable
                                </div>
                              ) : (
                                <div title="Counts every action across all of this theme's active risks, not only actions linked to this plan">
                                  <span className="text-foreground font-medium">Theme actions:</span> {t.completedActions}/{t.openActions + t.completedActions} done
                                </div>
                              )}
                              <div className={overdue ? "text-red-600" : ""}>
                                <span className="text-foreground font-medium">Due:</span> {intv.review_date ? new Date(intv.review_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}{overdue ? " · overdue" : ""}
                              </div>
                              {/* 25 Oct brief ("Dates"): Last reviewed is now an applicable REVIEW
                                  event only (never an edit timestamp); Last updated is shown
                                  separately so an ordinary edit is never mistaken for a review. */}
                              <div><span className="text-foreground font-medium">Last reviewed:</span> {intv.last_reviewed_at ? new Date(intv.last_reviewed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "Not yet reviewed"}</div>
                              <div><span className="text-foreground font-medium">Last updated:</span> {intv.last_updated_at ? new Date(intv.last_updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</div>
                              <div className="col-span-2"><span className="text-foreground font-medium">Expected:</span> {intv.expected_outcome || "—"}</div>
                            </div>
                          );
                        })()}
                        {/* Assigned-action lifecycle — so the RM can see the delegated work has been
                            done and where it is for review / effectiveness. */}
                        {intv.linked_action_stage ? (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            {intv.linked_action_completed_at
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              : <Loader2 className="w-3.5 h-3.5 text-amber-600" />}
                            <span className="text-muted-foreground">Assigned action:</span>
                            <span className={`font-medium ${intv.linked_action_completed_at ? "text-emerald-700" : "text-amber-700"}`}>{intv.linked_action_stage}</span>
                            {intv.linked_action_completed_at && (
                              <span className="text-muted-foreground">· {new Date(intv.linked_action_completed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                            )}
                          </div>
                        ) : (
                          // Fix (24 Oct developer corrections, "Delivery task missing despite
                          // assignment notification"): starting a plan only creates a delivery
                          // action when an eligible cross-service risk or qualifying pattern
                          // exists — otherwise it's saved with no linked_action_id. Previously
                          // this showed nothing at all here, so a saved-but-unlinked plan looked
                          // identical to one still loading. State it explicitly.
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Saved as a plan — no delivery action linked yet (no eligible risk or pattern found).</span>
                          </div>
                        )}
                        {/* Multiple linked delivery actions (brief 2 §1) — the plan's relevant existing
                            actions, with coverage derived from the canonical action state. */}
                        {intv.id && <LinkedActionsManager interventionId={intv.id} />}

                        {/* Formal effectiveness — the existing human-reviewed action-effectiveness
                            judgement (Effective / Partially Effective / Not Effective / Too Early).
                            No synthetic Risk-Index percentage is claimed. */}
                        {intv.effectiveness_review?.outcome && (
                          <div className="mt-2 rounded-lg bg-muted/50 p-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Effectiveness (reviewed)</span>
                              <span className={`font-semibold ${
                                intv.effectiveness_review.outcome === "Effective" ? "text-emerald-600"
                                : intv.effectiveness_review.outcome === "Not Effective" ? "text-red-600"
                                : "text-foreground"}`}>{intv.effectiveness_review.outcome}</span>
                            </div>
                            {intv.effectiveness_review.reviewed_at && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">Reviewed {new Date(intv.effectiveness_review.reviewed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</div>
                            )}
                            {intv.effectiveness_review.evidence && (
                              <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap break-words">{intv.effectiveness_review.evidence}</p>
                            )}
                          </div>
                        )}

                        {/* Theme-wide observable 14-day before → after evidence around the intervention start.
                            Signal counts / weighted burden / high-critical — no percentage claim. */}
                        {intv.evidence_comparison && (
                          <div className="mt-2 rounded-lg border border-border p-2.5">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Theme-wide observable evidence (14 days before → after)</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <div className="text-muted-foreground">Before</div>
                                <div className="font-semibold text-foreground">{intv.evidence_comparison.before.signal_count} signals</div>
                                <div className="text-[11px] text-muted-foreground">burden {intv.evidence_comparison.before.weighted_burden} · {intv.evidence_comparison.before.high_or_critical} high/critical</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">After ({intv.evidence_comparison.after.days_observed}d)</div>
                                <div className="font-semibold text-foreground">{intv.evidence_comparison.after.signal_count} signals</div>
                                <div className="text-[11px] text-muted-foreground">burden {intv.evidence_comparison.after.weighted_burden} · {intv.evidence_comparison.after.high_or_critical} high/critical</div>
                              </div>
                            </div>
                            {!intv.evidence_comparison.after_window_complete && (
                              <div className="text-[11px] text-amber-600 mt-1.5">Post-intervention window still in progress — evidence is indicative, not conclusive.</div>
                            )}
                          </div>
                        )}
                        {Array.isArray(intv.oversight_events) && intv.oversight_events.length > 0 && (
                          <div className="mt-2 rounded-lg border border-border p-2.5">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Leadership oversight trail</div>
                            <div className="space-y-2">
                              {intv.oversight_events.map((event: any) => (
                                <div key={event.id} className="text-xs border-l-2 border-primary/40 pl-2">
                                  <div className="font-medium text-foreground">
                                    {String(event.actor_role || "Leadership").replace(/_/g, " ")}
                                    {event.actor_name ? ` · ${event.actor_name}` : ""}
                                  </div>
                                  <div className="text-muted-foreground whitespace-pre-wrap break-words">{event.narrative}</div>
                                  {event.created_at && <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(event.created_at).toLocaleString("en-GB")}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No intervention set — {t.openActions} open action{t.openActions === 1 ? "" : "s"}, {t.completedActions} completed.</p>
                    )}
                  </div>

                  {/* Advisory only: backend readiness rolls up the same canonical risk closure reviews. */}
                  {t.readyToClose && (
                    <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div className="text-xs text-emerald-800">
                        <span className="font-semibold">Ready for closure review.</span> {t.readyToCloseReason}
                      </div>
                    </div>
                  )}
                  {/* 25 Oct brief (P1, "Remove false closure blockers"): a historical card has no
                      active risk to evaluate closure readiness against at all, so this box
                      previously rendered a generic "effectiveness not yet reviewed" / "closure
                      gate" warning as if an open risk had failed a real check. Closure review
                      only applies to a theme with a genuinely open risk. */}
                  {!t.readyToClose && !t.historical && (() => {
                    // Prefer the backend's canonical closure decision (one facade for every
                    // consumer); fall back to the local interpretation only if it is absent.
                    if (t.closure_position?.message) {
                      return (
                        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                          <span className="font-semibold">Not yet ready for closure review.</span>{" "}{t.closure_position.message}
                        </div>
                      );
                    }
                    const outcome = intv?.effectiveness_review?.outcome;
                    const canonicalBlockers = Array.isArray(t.closure_readiness?.risks)
                      ? Array.from(new Set(t.closure_readiness.risks.flatMap((r: any) => r.blockers || []))).join(" ")
                      : "";
                    const message = !intv
                      ? "Set an intervention and its expected outcome before closure can be considered."
                      : !outcome
                        ? "Effectiveness has not yet been reviewed."
                        : outcome === "Too Early To Assess"
                          ? "The observation period is incomplete. Reassess effectiveness when further evidence is available."
                          : outcome === "Not Effective"
                            ? "The intervention did not reduce the risk. Review the control and decide the next action."
                            : outcome === "Partially Effective"
                              ? "The intervention was only partially effective. Further control or review is required."
                              : canonicalBlockers || "One or more underlying risks have not passed the canonical closure gate.";
                    return (
                      <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                        <span className="font-semibold">Not yet ready for closure review.</span>{" "}{message}
                        {outcome !== "Effective" && canonicalBlockers ? ` ${canonicalBlockers}` : ""}
                      </div>
                    );
                  })()}

                  {/* 27 Oct developer instructions (P1, "Complete the read-only conversion"):
                      setting/updating the intervention and closing/rating a risk now happen in
                      the Risk Register / Action Tracker, not here — Management Response Overview
                      only displays the resulting trajectory, timeline and evidence. */}
                  <div className="mt-3 flex gap-2">
                    <div className="flex-1 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                      Read-only view — manage the intervention and risk via the Risk Register.
                    </div>
                    {/* 25 Oct brief ("Navigation"): this previously chose the stored linked risk
                        without checking whether it was still open, so the button could silently
                        open a risk explicitly marked Closed while still saying "Action" as if
                        there were outstanding work. action_target is resolved server-side from
                        the actual canonical risk status; the label and destination now agree —
                        closed-risk access is preserved as history, never implying it needs
                        another closure decision. */}
                    {(() => {
                      // 27 Oct developer instructions ("Correct the closed-risk destination
                      // defect"): action_target is now resolved by exact ID against canonical
                      // risk state (never inferred from the active-theme list), so a missing
                      // `available` flag is its own explicit "unavailable" state rather than
                      // silently reading as active.
                      const target = t.action_target || { risk_id: null, is_open: false, available: false };
                      const riskId = target.risk_id;
                      const unavailable = !!riskId && target.available === false;
                      const label = !riskId ? "Open register" : unavailable ? "Risk unavailable" : target.is_open ? "Open active risk" : "View risk history";
                      const title = !riskId
                        ? "No open risk for this theme yet — open the register to add one"
                        : unavailable
                          ? "This linked risk record could not be found — open the register instead"
                          : target.is_open
                            ? "Open the risk to complete the action and rate its effectiveness"
                            : "This risk is closed — viewing its history, not an outstanding closure decision";
                      const destination = (riskId && !unavailable) ? `/risk-register/${riskId}` : `/risk-register?theme=${encodeURIComponent(t.theme)}`;
                      return (
                        <button
                          onClick={() => navigate(destination)}
                          title={title}
                          className="text-sm font-medium text-primary-foreground bg-primary rounded-lg px-3 py-2 hover:bg-primary/90 flex items-center gap-1 whitespace-nowrap">
                          {label} <ArrowRight className="w-4 h-4" />
                        </button>
                      );
                    })()}
                  </div>
                  {/* 27 Oct developer instructions: when the intervention's linked risk differs
                      from the theme's current primary risk, expose both with their distinct
                      statuses rather than silently picking one. */}
                  {t.current_risk_target?.risk_id && (
                    <button onClick={() => navigate(`/risk-register/${t.current_risk_target.risk_id}`)}
                      className="mt-1.5 text-xs text-primary hover:underline text-right">
                      This theme also has a current {t.current_risk_target.is_open ? "active" : "closed"} risk →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 27 Oct developer instructions (P1, "Reconcile historical plans without reopening
            risks"): read-only inventory of historical/unlinked/ambiguous plans — classified
            server-side, never mutates a record. Genuine delivery work surfaces independently in
            My Work / RM Decisions Due; this view exists so an RM can see the true position
            across every historical plan in one place before reconciling it manually. */}
        {reconciliation.length > 0 && (
          <div className="mt-8 bg-card border border-border rounded-xl">
            <button onClick={() => setShowReconciliation((s) => !s)} className="w-full flex items-center justify-between px-5 py-4 text-left">
              <div>
                <h2 className="font-semibold text-foreground">Historical plan reconciliation</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{reconciliation.length} plan{reconciliation.length === 1 ? "" : "s"} with no current active risk, classified for review. Read-only — this never reopens a risk or changes a record.</p>
              </div>
              <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showReconciliation ? "rotate-90" : ""}`} />
            </button>
            {showReconciliation && (
              <div className="border-t border-border divide-y divide-border">
                {reconciliation.map((r: any) => {
                  const CLASS_LABEL: Record<string, string> = {
                    historical_completed_no_work: "Completed — no work remaining",
                    historical_outstanding_work: "Outstanding work remains",
                    unlinked_plan: "Never linked to a delivery risk",
                    ambiguous_review_required: "Ambiguous — RM review required",
                  };
                  const CLASS_TONE: Record<string, string> = {
                    historical_completed_no_work: "bg-emerald-100 text-emerald-700",
                    historical_outstanding_work: "bg-red-100 text-red-700",
                    unlinked_plan: "bg-muted text-muted-foreground",
                    ambiguous_review_required: "bg-amber-100 text-amber-700",
                  };
                  return (
                    <div key={r.intervention_id} className="px-5 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-foreground">{r.theme}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {r.owner_name ? `Owner: ${r.owner_name} · ` : ""}Plan status: {r.plan_status}
                          {r.linked_risk_id && ` · Linked risk: ${r.linked_risk_status || "unknown"}`}
                          {r.effectiveness_outcome && ` · Effectiveness: ${r.effectiveness_outcome}`}
                        </div>
                        {r.outstanding_work && (
                          <div className="text-xs text-amber-700 mt-1">
                            {r.outstanding_work.open_linked_actions?.length > 0 && <div>{r.outstanding_work.open_linked_actions.length} open linked action(s) — follow up via Action Tracker/My Work.</div>}
                            {r.outstanding_work.awaiting_effectiveness?.length > 0 && <div>{r.outstanding_work.awaiting_effectiveness.length} action(s) awaiting an effectiveness verdict.</div>}
                            {r.outstanding_work.needs_effectiveness_follow_up && <div>{r.outstanding_work.needs_effectiveness_follow_up}</div>}
                          </div>
                        )}
                      </div>
                      <span className={`text-[11px] rounded px-2 py-0.5 shrink-0 ${CLASS_TONE[r.classification] || "bg-muted"}`}>{CLASS_LABEL[r.classification] || r.classification}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default InterventionPanel;
