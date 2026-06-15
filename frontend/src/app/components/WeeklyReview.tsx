import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { Shield, Activity, FileText, AlertTriangle, TrendingUp, CheckCircle2, ListChecks } from "lucide-react";

// Doctrine: the Weekly Governance Review is the formal interpretation layer, not a
// report. It is reduced to FIVE governance questions. The system calculates Q1
// (what changed) and seeds Q4 (effectiveness); the RM supplies judgement.
const POSITIONS = ["Improving", "Stable", "Emerging Concern", "Escalating", "Critical"];
const POSITION_TONE: Record<string, string> = {
  Improving: "bg-emerald-600", Stable: "bg-sky-600", "Emerging Concern": "bg-amber-500",
  Escalating: "bg-orange-600", Critical: "bg-red-600",
};

export function WeeklyReview() {
  const navigate = useNavigate();
  const { id } = useParams();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = (localStorage.getItem("userRole") || user.role || "").toUpperCase().replace(/-/g, "_");
  const isSenior = ["DIRECTOR", "ADMIN", "SUPER_ADMIN", "RESPONSIBLE_INDIVIDUAL"].includes(userRole);

  const [houses, setHouses] = useState<any[]>([]);
  const [houseId, setHouseId] = useState<string>("");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [form, setForm] = useState<any>({ step10_risk_analysis: [] });
  const [status, setStatus] = useState<string>("Draft");
  const [validation, setValidation] = useState<any>(null);

  const set = (field: string, value: any) => setForm((p: any) => ({ ...p, [field]: value }));
  const locked = status === "Locked" || status === "pending_validation";

  useEffect(() => { loadHouses(); }, []);
  useEffect(() => { if (houseId) loadReview(houseId); }, [houseId, id]);

  const loadHouses = async () => {
    try {
      const res = await apiClient.get("/houses?limit=100");
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : (data.items || []);
      setHouses(list);
      const assigned = user.assigned_house_id;
      const def = list.find((h: any) => h.id === assigned) ? assigned : list[0]?.id;
      if (def) setHouseId(def); else setIsLoading(false);
    } catch {
      toast.error("Failed to load services");
      setIsLoading(false);
    }
  };

  const loadReview = async (hid: string) => {
    try {
      setIsLoading(true);
      const weekEnding = new Date().toISOString().split("T")[0];
      const previewRes = await apiClient.get(`/weekly-reviews/preview?house_id=${hid}&week_ending=${weekEnding}`);
      const auto = previewRes.data?.data?.auto_population || {};
      setPreview(previewRes.data?.data || {});

      const activeId = id && id !== "new" ? id : null;
      if (activeId) {
        const reviewRes = await apiClient.get(`/weekly-reviews/${activeId}`);
        const rv = reviewRes.data?.data || reviewRes.data;
        setReviewId(rv.id);
        setForm(rv.content || { step10_risk_analysis: [] });
        setStatus(rv.status || "Draft");
        setValidation({ validation_status: rv.validation_status, validation_comment: rv.validation_comment, validation_at: rv.validation_at });
      } else {
        setForm({
          step1_services: [hid],
          step3_pulse_count: auto.pulse_count,
          step4_signals: auto.signals,
          step5_repeats: auto.repeats,
          step6_worsening: auto.worsening,
          step7_improvements: auto.improvements,
          step10_risk_analysis: (auto.active_risks || []).map((r: any) => ({
            risk_id: r.id, title: r.title,
            trajectory: r.current_trajectory || "Stable",
            controls_effective: r.last_effectiveness === "Effective" ? "Yes" : "Partially",
          })),
        });
      }
    } catch (e) {
      toast.error("Failed to prepare review data");
    } finally {
      setIsLoading(false);
    }
  };

  const anyIneffective = (form.step10_risk_analysis || []).some((r: any) => r.controls_effective === "Partially" || r.controls_effective === "No");

  const validate = (): string | null => {
    if (!houseId) return "Select a service.";
    if (!form.step8_interpretation?.trim()) return "Q2: Tell us what concerns you most.";
    if (!form.step12_decisions?.trim()) return "Q3: Record the actions required (or 'None this week').";
    if (anyIneffective && !form.step11_control_failures?.trim()) return "Q4: Explain why controls are not fully effective.";
    if (!form.step14_overall_position) return "Q5: Choose an overall governance position.";
    return null;
  };

  const persist = async (extra: any = {}) => {
    const res = await apiClient.post(`/weekly-reviews`, {
      house_id: houseId,
      week_ending: new Date().toISOString().split("T")[0],
      content: form,
      step_reached: 15,
      ...extra,
    });
    const saved = res.data?.data || res.data;
    if (saved?.id) setReviewId(saved.id);
    return saved;
  };

  const saveDraft = async () => {
    setIsSaving(true);
    try { await persist(); toast.success("Draft saved"); }
    catch { toast.error("Failed to save draft"); }
    finally { setIsSaving(false); }
  };

  const submit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setIsSaving(true);
    try {
      const saved = await persist();
      const activeId = id && id !== "new" ? id : (reviewId || saved?.id);
      if (userRole === "REGISTERED_MANAGER") {
        await apiClient.post(`/weekly-reviews/${activeId}/finalise`, {});
        toast.success("Governance Review finalised and sent for RI validation");
        setStatus("pending_validation");
      } else {
        await persist({ status: "LOCKED" });
        toast.success("Governance Review locked & published");
        setStatus("Locked");
      }
      navigate("/dashboard");
    } catch { toast.error("Failed to submit review"); }
    finally { setIsSaving(false); }
  };

  const doValidate = async (vStatus: string) => {
    const comment = window.prompt(`Enter ${vStatus.toLowerCase()} comment:`);
    if (comment === null) return;
    setIsSaving(true);
    try {
      const activeId = id || reviewId;
      await apiClient.post(`/weekly-reviews/${activeId}/validate`, { validation_status: vStatus, validation_comment: comment });
      toast.success(`Review ${vStatus.toLowerCase()}`);
      if (houseId) loadReview(houseId);
    } catch { toast.error("Failed to validate review"); }
    finally { setIsSaving(false); }
  };

  const card = "bg-card border border-border rounded-xl p-6 shadow-sm";
  const qLabel = "text-lg text-primary mb-1 flex items-center gap-2 font-semibold";
  const area = "w-full h-28 px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none";

  if (isLoading) return (
    <div className="min-h-screen bg-background"><RoleBasedNavigation /><div className="pt-28 text-center text-muted-foreground">Preparing review…</div></div>
  );

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="max-w-3xl mx-auto pt-28 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Shield size={22} /></div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Weekly Governance Review</h1>
            <p className="text-sm text-muted-foreground">Five governance questions. What did leadership understand, decide, and why.</p>
          </div>
        </div>

        {/* Service + period */}
        <div className={card}>
          <label className="block text-sm font-medium mb-2">Service</label>
          <select value={houseId} onChange={(e) => { setHouseId(e.target.value); }} disabled={locked}
            className="w-full bg-input-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary">
            {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          {preview?.week_range && <p className="text-xs text-muted-foreground mt-2">Week: {preview.week_range.start} → {preview.week_range.end}</p>}
        </div>

        {validation?.validation_status && (
          <div className={`${card} border-l-4 ${validation.validation_status === "Approved" ? "border-emerald-500" : "border-red-500"}`}>
            <p className="text-sm font-medium">RI Validation: {validation.validation_status}</p>
            {validation.validation_comment && <p className="text-sm text-muted-foreground mt-1">{validation.validation_comment}</p>}
          </div>
        )}

        {/* Q1 — auto */}
        <div className={card}>
          <div className={qLabel}><TrendingUp size={18} /> 1. What changed this week?</div>
          <p className="text-xs text-muted-foreground mb-3">Calculated automatically from this week's signals.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-muted/40 rounded-lg p-3"><div className="text-2xl font-semibold">{preview?.auto_population?.pulse_count ?? form.step3_pulse_count ?? 0}</div><div className="text-xs text-muted-foreground">Signals this week</div></div>
            <div className="bg-muted/40 rounded-lg p-3"><div className="text-2xl font-semibold text-amber-600">{preview?.auto_population?.repeats ?? form.step5_repeats ?? 0}</div><div className="text-xs text-muted-foreground">Repeat patterns</div></div>
            <div className="bg-muted/40 rounded-lg p-3"><div className="text-2xl font-semibold text-red-600">{preview?.auto_population?.worsening ?? form.step6_worsening ?? 0}</div><div className="text-xs text-muted-foreground">Worsening</div></div>
            <div className="bg-muted/40 rounded-lg p-3"><div className="text-2xl font-semibold text-emerald-600">{preview?.auto_population?.improvements ?? form.step7_improvements ?? 0}</div><div className="text-xs text-muted-foreground">Improving</div></div>
          </div>
        </div>

        {/* Q2 */}
        <div className={card}>
          <div className={qLabel}><AlertTriangle size={18} /> 2. What concerns you most?</div>
          <p className="text-xs text-muted-foreground mb-3">Your governance judgement — the issue that most needs leadership attention.</p>
          <textarea className={area} disabled={locked} value={form.step8_interpretation || ""} onChange={(e) => set("step8_interpretation", e.target.value)} placeholder="The concern that matters most this week and why…" />
        </div>

        {/* Q3 */}
        <div className={card}>
          <div className={qLabel}><ListChecks size={18} /> 3. What actions are required?</div>
          <p className="text-xs text-muted-foreground mb-3">The decisions you are making in response.</p>
          <textarea className={area} disabled={locked} value={form.step12_decisions || ""} onChange={(e) => set("step12_decisions", e.target.value)} placeholder="Actions / decisions required (or 'None this week')…" />
        </div>

        {/* Q4 — effectiveness */}
        <div className={card}>
          <div className={qLabel}><CheckCircle2 size={18} /> 4. Are previous actions working?</div>
          <p className="text-xs text-muted-foreground mb-3">Effectiveness of the controls already in place.</p>
          {(form.step10_risk_analysis || []).length === 0 && <p className="text-sm text-muted-foreground py-2">No active risks to review.</p>}
          <div className="space-y-2">
            {(form.step10_risk_analysis || []).map((r: any, i: number) => (
              <div key={r.risk_id || i} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2">
                <div className="text-sm min-w-0 truncate">{r.title}</div>
                <select className="bg-input-background border border-border rounded-lg p-2 text-sm shrink-0" disabled={locked}
                  value={r.controls_effective || "Yes"}
                  onChange={(e) => {
                    const next = [...form.step10_risk_analysis];
                    next[i] = { ...r, controls_effective: e.target.value };
                    set("step10_risk_analysis", next);
                  }}>
                  <option value="Yes">Working</option>
                  <option value="Partially">Partially</option>
                  <option value="No">Not working</option>
                </select>
              </div>
            ))}
          </div>
          {anyIneffective && (
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1 text-amber-600">Why are controls not fully effective?</label>
              <textarea className={area} disabled={locked} value={form.step11_control_failures || ""} onChange={(e) => set("step11_control_failures", e.target.value)} placeholder="Control failure analysis…" />
            </div>
          )}
        </div>

        {/* Q5 — position + narrative */}
        <div className={card}>
          <div className={qLabel}><FileText size={18} /> 5. Overall governance position</div>
          <p className="text-xs text-muted-foreground mb-3">Your end-of-week judgement, with a short narrative.</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            {POSITIONS.map((p) => (
              <button key={p} type="button" disabled={locked} onClick={() => set("step14_overall_position", p)}
                className={`px-2 py-2.5 rounded-lg border text-xs sm:text-sm transition-all ${form.step14_overall_position === p ? `${POSITION_TONE[p]} text-white border-transparent` : "bg-card border-border hover:border-primary/50"}`}>
                {p}
              </button>
            ))}
          </div>
          <textarea className={area} disabled={locked} value={form.step15_narrative || ""} onChange={(e) => set("step15_narrative", e.target.value)} placeholder="Governance narrative: what you understood and decided this week…" />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pb-10">
          <button onClick={() => navigate("/dashboard")} className="px-4 py-2 text-muted-foreground hover:text-foreground">Cancel</button>
          <div className="flex gap-3">
            {!locked && <button onClick={saveDraft} disabled={isSaving} className="px-4 py-2 rounded-lg border border-border hover:bg-muted/40">Save draft</button>}
            {isSenior && status === "pending_validation" && (
              <>
                <button onClick={() => doValidate("Rejected")} disabled={isSaving} className="px-4 py-2 rounded-lg bg-red-600 text-white">Reject</button>
                <button onClick={() => doValidate("Approved")} disabled={isSaving} className="px-4 py-2 rounded-lg bg-emerald-600 text-white">Approve</button>
              </>
            )}
            {!locked && <button onClick={submit} disabled={isSaving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">{userRole === "REGISTERED_MANAGER" ? "Finalise review" : "Lock & publish"}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
