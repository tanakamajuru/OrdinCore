import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { Shield, Activity, Check, Lock, ArrowLeft, ArrowRight, Send, Clock, Users, FileDown, History } from "lucide-react";

// 13-step Weekly Governance Review wizard (per the doctrine/JSX MVP). Steps unlock in
// order; steps 2–10 auto-populate from the week's data; the RM supplies interpretation,
// overall position and narrative, then finalises (locks) for RI/Director validation.
const STEPS = [
  "Scope", "Signal Volume", "Pattern Summary", "Cluster Review", "Risk Touchpoint",
  "Action Effectiveness", "Escalations", "Safeguarding", "Medication", "Workforce",
  "Leadership Interpretation", "Overall Position", "Narrative",
];
const POSITIONS = ["Stable", "Watch", "Concern", "Escalating", "Serious Concern"];

export function WeeklyReview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = (localStorage.getItem("userRole") || user.role || "").toUpperCase().replace(/-/g, "_");
  const isSenior = ["DIRECTOR", "ADMIN", "SUPER_ADMIN", "RESPONSIBLE_INDIVIDUAL"].includes(userRole);

  const [houses, setHouses] = useState<any[]>([]);
  const [houseId, setHouseId] = useState("");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [escStats, setEscStats] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [status, setStatus] = useState("Draft");
  const [validation, setValidation] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [doneStep, setDoneStep] = useState(0);
  const [acks, setAcks] = useState<{ total: number; acknowledged: number; roster: any[] } | null>(null);
  const [priorWeeks, setPriorWeeks] = useState<any[]>([]);
  const [showPrior, setShowPrior] = useState(false);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const statusU = (status || "").toUpperCase();
  const locked = statusU === "LOCKED" || status === "pending_validation" || statusU === "PUBLISHED";
  const isValidatedLocked = statusU === "LOCKED" || validation?.validation_status === "Approved";
  const isPublished = statusU === "PUBLISHED";
  const myId = user.id || user.user_id;
  const myAck = acks?.roster?.find((r: any) => r.id === myId);

  useEffect(() => { loadHouses(); }, []);
  useEffect(() => { if (houseId) loadReview(houseId); }, [houseId, id]);

  const loadHouses = async () => {
    try {
      const res = await apiClient.get("/houses?limit=100");
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : (data.items || []);
      setHouses(list);
      const def = list.find((h: any) => h.id === user.assigned_house_id) ? user.assigned_house_id : list[0]?.id;
      if (def) setHouseId(def); else setIsLoading(false);
    } catch { toast.error("Failed to load services"); setIsLoading(false); }
  };

  const loadReview = async (hid: string) => {
    try {
      setIsLoading(true);
      const weekEnding = new Date().toISOString().split("T")[0];
      const [pv, es] = await Promise.all([
        apiClient.get(`/weekly-reviews/preview?house_id=${hid}&week_ending=${weekEnding}`),
        apiClient.get(`/escalations/stats`).catch(() => ({})),
      ]);
      setPreview(pv.data?.data || {});
      setEscStats((es as any)?.data?.data || (es as any)?.data || {});
      const auto = pv.data?.data?.auto_population || {};
      const activeId = id && id !== "new" ? id : null;
      if (activeId) {
        const rv = (await apiClient.get(`/weekly-reviews/${activeId}`)).data?.data;
        setReviewId(rv.id);
        setForm(rv.content || {});
        setStatus(rv.status || "Draft");
        setStep((rv.step_reached ? rv.step_reached - 1 : 0));
        setDoneStep((rv.step_reached ? rv.step_reached - 1 : 0));
        setValidation({ validation_status: rv.validation_status, validation_comment: rv.validation_comment });
      } else {
        setForm({
          step1_services: [hid],
          step3_pulse_count: auto.pulse_count,
          step4_signals: auto.signals,
          step5_repeats: auto.repeats,
          step6_worsening: auto.worsening,
          step7_improvements: auto.improvements,
          step10_risk_analysis: (auto.active_risks || []),
        });
        setStep(0); setDoneStep(0); setStatus("Draft"); setReviewId(null); setValidation(null);
      }
    } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || "Failed to prepare review"); }
    finally { setIsLoading(false); }
  };

  const auto = preview?.auto_population || {};
  const signals: any[] = auto.signals || form.step4_signals || [];
  const hi = signals.filter((s) => ["High", "Critical"].includes(s.severity)).length;
  const repeats: any[] = Array.isArray(auto.repeats) ? auto.repeats : (form.step5_repeats || []);
  const activeRisks: any[] = auto.active_risks || form.step10_risk_analysis || [];
  const domainCount = (needle: string) => signals.filter((s) => {
    const ds = Array.isArray(s.risk_domain) ? s.risk_domain : [s.risk_domain];
    return ds.some((d: any) => String(d || "").toLowerCase().includes(needle));
  }).length;

  const persist = async (nextStep: number, extra: any = {}) => {
    const res = await apiClient.post(`/weekly-reviews`, {
      house_id: houseId,
      week_ending: new Date().toISOString().split("T")[0],
      content: form,
      step_reached: nextStep + 1,
      ...extra,
    });
    const saved = res.data?.data || res.data;
    if (saved?.id) setReviewId(saved.id);
    return saved;
  };

  const validateStep = (s: number): string | null => {
    if (s === 10 && !form.step8_interpretation?.trim()) return "Add your leadership interpretation.";
    if (s === 11 && !form.step14_overall_position) return "Choose an overall governance position.";
    return null;
  };

  const advance = async () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    setIsSaving(true);
    try {
      if (step < 12) { await persist(step + 1); setStep(step + 1); setDoneStep(Math.max(doneStep, step + 1)); window.scrollTo(0, 0); }
    } catch { toast.error("Failed to save progress"); }
    finally { setIsSaving(false); }
  };

  const finalise = async () => {
    setIsSaving(true);
    try {
      const saved = await persist(12);
      const activeId = id && id !== "new" ? id : (reviewId || saved?.id);
      if (userRole === "REGISTERED_MANAGER") {
        await apiClient.post(`/weekly-reviews/${activeId}/finalise`, {});
        toast.success("Weekly Review finalised & sent for RI validation");
        setStatus("pending_validation");
      } else {
        await persist(12, { status: "LOCKED" });
        toast.success("Weekly Review locked & published");
        setStatus("Locked");
      }
      navigate("/dashboard");
    } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || "Failed to finalise review"); }
    finally { setIsSaving(false); }
  };

  const loadAcks = async (rid: string) => {
    try {
      const res = await apiClient.get(`/weekly-reviews/${rid}/acknowledgements`);
      setAcks(res.data?.data || null);
    } catch { /* roster optional */ }
  };

  useEffect(() => {
    const rid = (id && id !== "new") ? id : reviewId;
    if (rid && (isPublished || isValidatedLocked)) loadAcks(rid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, reviewId, id]);

  const publishToTeam = async () => {
    const rid = (id && id !== "new") ? id : reviewId;
    if (!rid) return;
    setIsSaving(true);
    try {
      const res = await apiClient.post(`/weekly-reviews/${rid}/publish`, {});
      const n = res.data?.data?.recipients;
      toast.success(`Published to the team${typeof n === "number" ? ` · ${n} notified` : ""}`);
      setStatus("published");
      loadAcks(rid);
    } catch { toast.error("Failed to publish — the review must be validated first."); }
    finally { setIsSaving(false); }
  };

  const acknowledge = async () => {
    const rid = (id && id !== "new") ? id : reviewId;
    if (!rid) return;
    try {
      await apiClient.post(`/weekly-reviews/${rid}/acknowledge`, {});
      toast.success("Marked as read");
      loadAcks(rid);
    } catch { toast.error("Failed to acknowledge"); }
  };

  const downloadPdf = async () => {
    const rid = (id && id !== "new") ? id : reviewId;
    if (!rid) return;
    try {
      const base = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001/api/v1";
      const resp = await fetch(`${base}/weekly-reviews/${rid}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      if (!resp.ok) throw new Error();
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `weekly-review-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error("Failed to download PDF"); }
  };

  const togglePrior = async () => {
    if (showPrior) { setShowPrior(false); return; }
    setShowPrior(true);
    if (priorWeeks.length || !houseId) return;
    try {
      const res = await apiClient.get(`/weekly-reviews/house/${houseId}`);
      const rid = (id && id !== "new") ? id : reviewId;
      setPriorWeeks((res.data?.data || []).filter((r: any) => r.id !== rid));
    } catch { /* archive optional */ }
  };

  const doValidate = async (vStatus: string) => {
    const comment = window.prompt(`Enter ${vStatus.toLowerCase()} comment:`);
    if (comment === null) return;
    setIsSaving(true);
    try {
      await apiClient.post(`/weekly-reviews/${id || reviewId}/validate`, { validation_status: vStatus, validation_comment: comment });
      toast.success(`Review ${vStatus.toLowerCase()}`);
      if (houseId) loadReview(houseId);
    } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || "Failed to validate"); }
    finally { setIsSaving(false); }
  };

  const card = "bg-card border border-border rounded-xl p-6 shadow-sm";
  const area = "w-full h-32 px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none";
  const isAuto = step >= 1 && step <= 9;

  if (isLoading) return <div className="min-h-screen bg-background"><RoleBasedNavigation /><div className="pt-28 text-center text-muted-foreground">Preparing review…</div></div>;

  const stepBody = () => {
    switch (step) {
      case 0: return (
        <div>
          <label className="block text-sm font-medium mb-2">Service scope</label>
          <select value={houseId} onChange={(e) => setHouseId(e.target.value)} disabled={locked}
            className="w-full bg-input-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary">
            {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          {preview?.week_range && <p className="text-xs text-muted-foreground mt-2">Reviewing {preview.week_range.start} → {preview.week_range.end}.</p>}
        </div>
      );
      case 1: return <p className="text-sm leading-7"><b>{auto.pulse_count ?? signals.length ?? 0} signals</b> captured this week, of which <b>{hi}</b> were High or Critical.</p>;
      case 2: return <p className="text-sm leading-7">The engine identified <b>{repeats.length}</b> repeat pattern{repeats.length === 1 ? "" : "s"} reaching review.</p>;
      case 3: return repeats.length ? <ul className="text-sm space-y-2">{repeats.map((r, i) => <li key={i} className="border-b border-border/50 pb-2">{typeof r === "string" ? r : (r.risk_domain || JSON.stringify(r))}</li>)}</ul> : <p className="text-sm text-muted-foreground">No clusters reached threshold this week.</p>;
      case 4: return <p className="text-sm leading-7"><b>{activeRisks.length}</b> active risk{activeRisks.length === 1 ? "" : "s"} on the register, each traceable to a promoted cluster.</p>;
      case 5: return <p className="text-sm leading-7">Action effectiveness is rated in the Action Tracker; two consecutive Ineffective ratings push a risk back into escalation. {activeRisks.length} risk{activeRisks.length === 1 ? "" : "s"} have linked actions.</p>;
      case 6: return <p className="text-sm leading-7"><b>{escStats?.open ?? escStats?.total ?? 0}</b> open escalation{(escStats?.open ?? 0) === 1 ? "" : "s"}, each carrying an SLA due date and swept for overdue.</p>;
      case 7: return <p className="text-sm leading-7"><b>{domainCount("safeguard")}</b> safeguarding signal{domainCount("safeguard") === 1 ? "" : "s"}. Any single safeguarding signal triggers immediate review.</p>;
      case 8: return <p className="text-sm leading-7"><b>{domainCount("medication")}</b> medication governance signal{domainCount("medication") === 1 ? "" : "s"} this week.</p>;
      case 9: return <p className="text-sm leading-7"><b>{domainCount("workforce") + domainCount("staffing")}</b> workforce / staffing signal{(domainCount("workforce") + domainCount("staffing")) === 1 ? "" : "s"} recorded.</p>;
      case 10: return (
        <div>
          <label className="block text-sm font-medium mb-2">Leadership interpretation (your words)</label>
          <textarea className={area} disabled={locked} value={form.step8_interpretation || ""} onChange={(e) => set("step8_interpretation", e.target.value)} placeholder="What does this week mean for safety and quality?" />
        </div>
      );
      case 11: return (
        <div>
          <label className="block text-sm font-medium mb-2">Overall governance position</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {POSITIONS.map((p) => (
              <button key={p} type="button" disabled={locked} onClick={() => set("step14_overall_position", p)}
                className={`px-2 py-2.5 rounded-lg border text-xs sm:text-sm ${form.step14_overall_position === p ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border hover:border-primary/50"}`}>{p}</button>
            ))}
          </div>
        </div>
      );
      case 12: return (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Finalising locks the record permanently.</p>
          <div className="bg-muted/40 rounded-lg p-4 text-sm leading-7 mb-3">
            This week {auto.pulse_count ?? 0} signals produced {repeats.length} threshold pattern{repeats.length === 1 ? "" : "s"} and {activeRisks.length} register entr{activeRisks.length === 1 ? "y" : "ies"}. Leadership position: <b>{form.step14_overall_position || "—"}</b>.{form.step8_interpretation ? ` Interpretation: "${form.step8_interpretation}"` : ""}
          </div>
          <label className="block text-sm font-medium mb-2">Governance narrative</label>
          <textarea className={area} disabled={locked} value={form.step15_narrative || ""} onChange={(e) => set("step15_narrative", e.target.value)} placeholder="The defensible account of what leadership understood and decided this week…" />
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="max-w-4xl mx-auto pt-28 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Shield size={22} /></div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Weekly Governance Review</h1>
            <p className="text-sm text-muted-foreground">13 sequential steps · sections 2–10 auto-populate · locked after finalisation.</p>
          </div>
        </div>

        {validation?.validation_status && (
          <div className={`${card} mb-4 border-l-4 ${validation.validation_status === "Approved" ? "border-emerald-500" : "border-red-500"}`}>
            <p className="text-sm font-medium">RI Validation: {validation.validation_status}</p>
            {validation.validation_comment && <p className="text-sm text-muted-foreground mt-1">{validation.validation_comment}</p>}
          </div>
        )}

        {/* Publish to team — appears once the review is validated/locked. Separates
            "governed" from "communicated": the team that recorded the signals and
            carries out the actions gets the review, with a logged acknowledgement. */}
        {(isValidatedLocked || isPublished) && (
          <div className={`${card} mb-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                {isPublished
                  ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700"><Check size={16} /> Published to the team</span>
                  : <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground"><Lock size={15} /> Validated & locked</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={downloadPdf}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm flex items-center gap-1.5">
                  <FileDown size={14} /> Download PDF
                </button>
                <button onClick={togglePrior}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm flex items-center gap-1.5">
                  <History size={14} /> Prior weeks
                </button>
                {!isPublished && (
                  <button onClick={publishToTeam} disabled={isSaving}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm flex items-center gap-1.5 disabled:opacity-50">
                    <Send size={14} /> Publish to team
                  </button>
                )}
              </div>
            </div>

            {showPrior && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Prior weeks · {houses.find(h => h.id === houseId)?.name || 'this service'}</p>
                {priorWeeks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No earlier reviews for this service.</p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {priorWeeks.map((r: any) => (
                      <button key={r.id} onClick={() => navigate(`/weekly-review/${r.id}`)}
                        className="w-full flex items-center justify-between py-2 text-left text-sm hover:bg-muted/40 px-1 rounded">
                        <span>W/E {r.week_ending}</span>
                        <span className="text-xs text-muted-foreground capitalize">{String(r.status || '').toLowerCase().replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isPublished && (
              <div className="mt-4 border-t border-border/60 pt-4">
                {/* This user's own acknowledgement */}
                {myAck && (
                  myAck.acknowledged ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-700 mb-4">
                      <Check size={16} /> You acknowledged this review{myAck.acknowledged_at ? ` · ${new Date(myAck.acknowledged_at).toLocaleString("en-GB")}` : ""}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-sm text-amber-800 flex items-center gap-1.5"><Clock size={14} /> You haven't acknowledged this review yet.</span>
                      <button onClick={acknowledge} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm">Mark as read</button>
                    </div>
                  )
                )}

                {/* Progress + roster */}
                {acks && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><Users size={13} /> Team acknowledgement</span>
                      <span className="text-sm font-medium">{acks.acknowledged} of {acks.total}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-emerald-500" style={{ width: `${acks.total ? (acks.acknowledged / acks.total) * 100 : 0}%` }} />
                    </div>
                    <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
                      {acks.roster.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                          <div>
                            <span className="font-medium">{r.name}{r.id === myId ? " (you)" : ""}</span>
                            <span className="text-xs text-muted-foreground ml-2 capitalize">{String(r.role || "").toLowerCase().replace(/_/g, " ")}</span>
                          </div>
                          {r.acknowledged
                            ? <span className="text-xs text-emerald-700 flex items-center gap-1"><Check size={13} /> Read{r.acknowledged_at ? ` · ${new Date(r.acknowledged_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</span>
                            : <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={13} /> Awaiting</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-5">
          {/* Step rail */}
          <div className="w-56 shrink-0">
            {STEPS.map((s, i) => {
              const isDone = doneStep > i || (i < step);
              const lockedStep = i > step && i > doneStep;
              const active = i === step;
              return (
                <button key={s} disabled={lockedStep} onClick={() => !lockedStep && setStep(i)}
                  className={`flex gap-2.5 items-center w-full text-left px-3 py-2 rounded-lg mb-0.5 text-sm ${active ? "bg-primary/10 text-primary font-medium" : lockedStep ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-muted/40"}`}>
                  <span className={`w-5 h-5 rounded-full shrink-0 grid place-items-center text-[10px] font-semibold ${isDone ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{isDone ? <Check size={11} /> : i + 1}</span>
                  <span className="truncate flex-1">{s}</span>
                  {lockedStep && <Lock size={11} />}
                </button>
              );
            })}
          </div>

          {/* Step body */}
          <div className={`${card} flex-1`}>
            <div className="text-xs text-muted-foreground mb-1">Step {step + 1} of 13</div>
            <h2 className="text-xl text-foreground font-semibold mb-3">{STEPS[step]}</h2>
            {isAuto && <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded px-2 py-1 mb-3"><Activity size={12} /> Auto-populated from this week's data</div>}
            <div className="mb-4">{stepBody()}</div>
            <div className="flex items-center gap-3 pt-2 border-t border-border/50">
              {step > 0 && <button onClick={() => setStep(step - 1)} className="px-4 py-2 rounded-lg border border-border hover:bg-muted/40 text-sm flex items-center gap-1.5"><ArrowLeft size={14} /> Back</button>}
              <div className="ml-auto flex gap-3">
                {isSenior && status === "pending_validation" && (
                  <>
                    <button onClick={() => doValidate("Rejected")} disabled={isSaving} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm">Reject</button>
                    <button onClick={() => doValidate("Approved")} disabled={isSaving} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">Approve</button>
                  </>
                )}
                {!locked && step < 12 && <button onClick={advance} disabled={isSaving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm flex items-center gap-1.5">Confirm & continue <ArrowRight size={14} /></button>}
                {!locked && step === 12 && <button onClick={finalise} disabled={isSaving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm flex items-center gap-1.5">{userRole === "REGISTERED_MANAGER" ? "Finalise & lock" : "Lock & publish"} <Lock size={14} /></button>}
                {locked && <span className="text-sm text-emerald-700 flex items-center gap-1.5"><Check size={16} /> {status === "pending_validation" ? "Finalised — awaiting validation" : "Locked"}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
