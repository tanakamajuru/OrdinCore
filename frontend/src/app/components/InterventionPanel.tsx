import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownRight, Minus, Target, X, Loader2, Flag, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";

const unwrap = (r: any): any => r?.data?.data ?? r?.data ?? r;

const VERDICTS = [
  "Resolved — controls effective",
  "Resolved — no longer applicable",
  "Tolerated — risk accepted",
];
const IMPACTS = ["High", "Medium", "Low"];
const isClosedStatus = (s?: string) => ["closed", "resolved"].includes(String(s || "").toLowerCase());

// Close / rate the risks that make up a theme, without leaving Intervention Action.
// Impact (High/Medium/Low) is the compulsory judgement of consequence and must be set before a
// risk can close; closure itself is evidence-gated on the backend (open actions / linked
// escalations / effectiveness / trajectory) — we surface that verdict rather than bypassing it.
function CloseRiskManager({ theme, onDone }: { theme: any; onDone: () => void }) {
  const [risks, setRisks] = useState<any[]>(() =>
    (theme.risk_refs || []).filter((r: any) => r?.id && !isClosedStatus(r.status)));
  const [openId, setOpenId] = useState<string | null>(null);
  const [verdict, setVerdict] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const patchLocal = (id: string, patch: any) =>
    setRisks((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const setImpact = async (r: any, impact_rating: string) => {
    setBusy(r.id);
    try {
      await apiClient.patch(`/risks/${r.id}/impact-rating`, { impact_rating });
      patchLocal(r.id, { impact_rating });
      toast.success(`Impact set to ${impact_rating}`);
    } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || "Failed to set impact"); }
    finally { setBusy(null); }
  };

  const closeRisk = async (r: any) => {
    if (!verdict) { toast.error("Choose a resolution verdict."); return; }
    if (reason.trim().length < 20) { toast.error("Rationale must be at least 20 characters."); return; }
    setBusy(r.id);
    try {
      await apiClient.post(`/risks/${r.id}/close`, { verdict, reason: reason.trim() });
      toast.success("Risk closed with a resolution verdict. Recurrence monitoring started (60 days).");
      setRisks((rs) => rs.filter((x) => x.id !== r.id));
      setOpenId(null); setVerdict(""); setReason("");
    } catch (e: any) {
      // The backend closure-review gate returns why it can't close yet (open actions, open linked
      // escalation, effectiveness unrated, deteriorating trajectory) — show it verbatim.
      toast.error(e?.response?.data?.message || e?.message || "This risk can't be closed yet.");
    } finally { setBusy(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onDone}>
      <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground">Close / rate risk — {theme.theme}</h3>
            <p className="text-xs text-muted-foreground">Set the impact, then close with an evidence-based verdict.</p>
          </div>
          <button onClick={onDone} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {risks.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              No open risks left on this theme.
            </div>
          ) : risks.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{r.title || "Risk"}</div>
                  <div className="text-[11px] text-muted-foreground">{r.house_name || "—"}{r.open_actions ? ` · ${r.open_actions} open action${r.open_actions === 1 ? "" : "s"}` : ""}</div>
                </div>
                <span className="text-[10px] rounded px-2 py-0.5 bg-muted shrink-0 uppercase">{r.status || "open"}</span>
              </div>

              {/* Impact — compulsory before close */}
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-muted-foreground">Impact:</span>
                {r.impact_rating ? (
                  <span className="text-xs font-semibold text-foreground">{r.impact_rating}</span>
                ) : IMPACTS.map((lvl) => (
                  <button key={lvl} disabled={busy === r.id} onClick={() => setImpact(r, lvl)}
                    className="text-xs px-2.5 py-1 rounded-md border border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                    {lvl}
                  </button>
                ))}
                {!r.impact_rating && <span className="text-[11px] text-amber-600">· required to close</span>}
              </div>

              {openId === r.id ? (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <select value={verdict} onChange={(e) => setVerdict(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm bg-background">
                    <option value="">Choose a verdict…</option>
                    {VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                    placeholder="Why is this risk being closed, and how do you know it is resolved? (min 20 characters)"
                    className="w-full border border-border rounded-lg p-2 text-sm bg-background resize-none" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setOpenId(null); setVerdict(""); setReason(""); }} className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted">Cancel</button>
                    <button onClick={() => closeRisk(r)} disabled={busy === r.id || !verdict || reason.trim().length < 20}
                      className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5">
                      {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Close risk
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { if (!r.impact_rating) { toast.error("Set the risk impact first."); return; } setOpenId(r.id); setVerdict(""); setReason(""); }}
                  title={r.impact_rating ? "Close this risk with a verdict" : "Set the risk impact first"}
                  className="mt-2.5 text-sm font-medium text-primary hover:underline flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" /> Close this risk
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button onClick={onDone} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Done</button>
        </div>
      </div>
    </div>
  );
}

const DIR = {
  Deteriorating: { Icon: ArrowUpRight, color: "#dc2626", label: "Increasing" },
  Improving: { Icon: ArrowDownRight, color: "#059669", label: "Reducing" },
  Stable: { Icon: Minus, color: "#d97706", label: "Stable" },
} as const;

const CONCERN_TONE: Record<string, string> = {
  "Attention": "bg-red-100 text-red-700",
  "Review required": "bg-red-100 text-red-700",
  "Monitor": "bg-amber-100 text-amber-700",
  "Controlled": "bg-emerald-100 text-emerald-700",
  "Ready to close": "bg-emerald-100 text-emerald-700",
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
  const [users, setUsers] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null); // { theme, intervention record or blank }
  const [saving, setSaving] = useState(false);
  const [closeTheme, setCloseTheme] = useState<any>(null); // theme whose risks are being closed/rated

  const load = async () => {
    setLoading(true);
    try { setThemes(unwrap(await apiClient.get("/interventions/themes")) || []); }
    catch { toast.error("Failed to load governance themes"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { apiClient.get("/users?limit=200").then((r: any) => {
    const list = Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.users) ? r.data.users : [];
    setUsers(list);
  }).catch(() => setUsers([])); }, []);

  const openEdit = (t: any) => setEdit({
    theme: t.theme,
    intervention: t.intervention?.intervention || "",
    status: t.intervention?.status || "Planned",
    owner_id: t.intervention?.owner_id || "",
    expected_outcome: t.intervention?.expected_outcome || "",
    review_date: t.intervention?.review_date ? String(t.intervention.review_date).slice(0, 10) : "",
  });

  const save = async () => {
    if (!edit?.intervention?.trim()) { toast.error("Describe the intervention."); return; }
    setSaving(true);
    try {
      const owner = users.find((u) => u.id === edit.owner_id);
      const res: any = await apiClient.post("/interventions", {
        theme: edit.theme,
        intervention: edit.intervention.trim(),
        status: edit.status,
        owner_id: edit.owner_id || null,
        owner_role: owner?.role || null,
        expected_outcome: edit.expected_outcome?.trim() || null,
        review_date: edit.review_date || null,
      });
      const saved = res?.data ?? res;
      setEdit(null);
      // If starting the intervention raised a task on a risk, offer to go action it.
      if (saved?.linked_risk_id) {
        toast.success("Intervention saved — a task was raised on its risk.");
        navigate(`/risk-register/${saved.linked_risk_id}`);
      } else {
        toast.success("Intervention saved");
        load();
      }
    } catch (e: any) { toast.error(e?.message || "Failed to save intervention"); }
    finally { setSaving(false); }
  };

  const attention = useMemo(() => themes.filter((t) => ["Attention", "Review required"].includes(t.concern)).length, [themes]);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2"><Target className="w-6 h-6 text-primary" /> Intervention Action</h1>
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
                      <p className="text-xs text-muted-foreground">{t.services} service{t.services === 1 ? "" : "s"} · {t.risks} risk{t.risks === 1 ? "" : "s"}</p>
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
                          const overdue = due ? due.setHours(0,0,0,0) < new Date().setHours(0,0,0,0) : false;
                          return (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1">
                              <div><span className="text-foreground font-medium">Owner:</span> {intv.owner_name || intv.owner_role || "—"}</div>
                              <div><span className="text-foreground font-medium">Actions:</span> {t.completedActions}/{t.openActions + t.completedActions} done</div>
                              <div className={overdue ? "text-red-600" : ""}>
                                <span className="text-foreground font-medium">Due:</span> {intv.review_date ? new Date(intv.review_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}{overdue ? " · overdue" : ""}
                              </div>
                              <div><span className="text-foreground font-medium">Last reviewed:</span> {intv.last_reviewed_at ? new Date(intv.last_reviewed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</div>
                              <div className="col-span-2"><span className="text-foreground font-medium">Expected:</span> {intv.expected_outcome || "—"}</div>
                            </div>
                          );
                        })()}
                        {/* Assigned-action lifecycle — so the RM can see the delegated work has been
                            done and where it is for review / effectiveness. */}
                        {intv.linked_action_stage && (
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
                        )}
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

                        {/* Observable 14-day before → after evidence around the intervention start.
                            Signal counts / weighted burden / high-critical — no percentage claim. */}
                        {intv.evidence_comparison && (
                          <div className="mt-2 rounded-lg border border-border p-2.5">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Observable evidence (14 days before → after)</div>
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
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No intervention set — {t.openActions} open action{t.openActions === 1 ? "" : "s"}, {t.completedActions} completed.</p>
                    )}
                  </div>

                  {/* Ready-to-close prompt — effective, no new risks in 14 days, no open escalations
                      and not deteriorating. Doctrine: the RM still decides and closes explicitly. */}
                  {t.readyToClose && (
                    <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div className="text-xs text-emerald-800">
                        <span className="font-semibold">Ready to close.</span> {t.readyToCloseReason}
                      </div>
                    </div>
                  )}

                  {/* Close / rate the risks that make up this theme, in place. Only shown when the
                      theme still has open risks to act on. */}
                  {(t.risk_refs || []).some((r: any) => r?.id && !isClosedStatus(r.status)) && (
                    <button onClick={() => setCloseTheme(t)}
                      className={`mt-3 w-full text-sm font-medium rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 ${t.readyToClose ? "text-white bg-emerald-600 hover:bg-emerald-700" : "text-foreground border border-border hover:bg-muted"}`}>
                      <CheckCircle2 className="w-4 h-4" /> Close / rate risk
                    </button>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button onClick={() => openEdit(t)} className="flex-1 text-sm font-medium text-primary bg-primary/10 rounded-lg px-3 py-2 hover:bg-primary/20">
                      {intv ? "Update intervention" : "Set intervention"}
                    </button>
                    {/* Action always opens the OPEN RISK — the intervention's linked risk if set,
                        otherwise the theme's primary open risk. Only falls back to the filtered
                        register if the theme genuinely has no open risk yet. */}
                    {(() => {
                      const riskId = intv?.linked_risk_id || t.primary_risk_id;
                      return (
                        <button
                          onClick={() => navigate(riskId ? `/risk-register/${riskId}` : `/risk-register?theme=${encodeURIComponent(t.theme)}`)}
                          title={riskId ? "Open the risk to complete the action and rate its effectiveness" : "No open risk for this theme yet — open the register to add one"}
                          className="text-sm font-medium text-primary-foreground bg-primary rounded-lg px-3 py-2 hover:bg-primary/90 flex items-center gap-1 whitespace-nowrap">
                          Action <ArrowRight className="w-4 h-4" />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {closeTheme && (
        <CloseRiskManager theme={closeTheme} onDone={() => { setCloseTheme(null); load(); }} />
      )}

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEdit(null)}>
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Intervention — {edit.theme}</h3>
                <p className="text-xs text-muted-foreground">The leadership response to this theme's trajectory.</p>
              </div>
              <button onClick={() => setEdit(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Intervention</label>
                <input value={edit.intervention} onChange={(e) => setEdit({ ...edit, intervention: e.target.value })} placeholder="e.g. Medication audit"
                  className="w-full border border-border rounded-lg p-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-sm bg-background">
                    {["Planned", "In Progress", "Complete", "On Hold"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Owner</label>
                  <select value={edit.owner_id} onChange={(e) => setEdit({ ...edit, owner_id: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-sm bg-background">
                    <option value="">Unassigned</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({String(u.role || "").replace(/_/g, " ")})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Review date</label>
                <input type="date" value={edit.review_date} onChange={(e) => setEdit({ ...edit, review_date: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-sm bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expected outcome</label>
                <textarea value={edit.expected_outcome} onChange={(e) => setEdit({ ...edit, expected_outcome: e.target.value })} rows={2} placeholder="e.g. Reduce medication errors by 50%"
                  className="w-full border border-border rounded-lg p-2.5 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex justify-end gap-3">
              <button onClick={() => setEdit(null)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save intervention
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterventionPanel;
