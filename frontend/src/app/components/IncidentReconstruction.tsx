import { useState, useEffect, useMemo } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { AlertCircle, Home, User, ArrowRight, ArrowLeft, Check, Lock, Clock } from "lucide-react";

// Incident Reconstruction (FR9) — reconstruct the governance signal history BY HOUSE or
// BY PERSON up to an incident day, then lock an immutable, CQC-exportable account.
// Read-only assembly: it never alters the record. Backend: GET /reconstruction/:scope/:id
// builds the timeline; POST /reconstruction/record + /record/:id/lock persist & lock.
const SEV: Record<string, string> = {
  Critical: "bg-red-100 text-red-700", High: "bg-amber-100 text-amber-700",
  Moderate: "bg-blue-100 text-blue-700", Low: "bg-emerald-100 text-emerald-700",
};
const sevClass = (s: string) => SEV[s] || "bg-muted text-muted-foreground";

export function IncidentReconstruction() {
  const [stage, setStage] = useState<"setup" | "build">("setup");
  const [mode, setMode] = useState<"house" | "person">("house");
  const [houses, setHouses] = useState<any[]>([]);
  const [persons, setPersons] = useState<string[]>([]);
  const [houseId, setHouseId] = useState("");
  const [person, setPerson] = useState("");
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  // From date — default 8 weeks before the incident date, editable. Without it the
  // backend reconstructed from 1970 (the whole history). Keeps incident date as the To.
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 56); return d.toISOString().split("T")[0];
  });

  const [step, setStep] = useState(1);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [linkedRisks, setLinkedRisks] = useState<any[]>([]);
  const [trajectory, setTrajectory] = useState("Deteriorating");
  const [factors, setFactors] = useState("");
  const [controlFailure, setControlFailure] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient.get("/houses?limit=100").then((r) => {
      const d = r.data?.data || r.data || [];
      setHouses(Array.isArray(d) ? d : d.items || []);
    }).catch(() => {});
    apiClient.get("/reconstruction/persons").then((r) => setPersons(r.data?.data || [])).catch(() => {});
  }, []);

  const scope = mode === "house" ? "service" : "client";
  const scopeRef = mode === "house" ? houseId : person;
  const scopeLabel = mode === "house" ? (houses.find((h) => h.id === houseId)?.name || "Service") : person;

  const generate = async () => {
    if (!scopeRef) { toast.error(mode === "house" ? "Choose a service" : "Choose a person"); return; }
    setBusy(true);
    try {
      const r = await apiClient.get(`/reconstruction/${scope}/${encodeURIComponent(scopeRef)}?start=${fromDate}T00:00:00&end=${incidentDate}T23:59:59`);
      const data = r.data?.data || {};
      setTimeline(data.timeline || []);
      setCounts(data.counts || {});
      // Linked risks: by-house = risks on that house; by-person = risks for THAT person
      // (not every service's risks in the same domain — that was the cross-service leak).
      try {
        const rr = await apiClient.get(mode === "house" ? `/risks?house_id=${houseId}&limit=100` : `/risks?limit=100`);
        const risks = rr.data?.data || rr.data || [];
        if (mode === "house") {
          setLinkedRisks(risks.filter((x: any) => !houseId || x.house_id === houseId));
        } else {
          const personLc = String(person || "").toLowerCase();
          setLinkedRisks(risks.filter((x: any) => String(x.linked_person || x.related_person || "").toLowerCase() === personLc));
        }
      } catch { setLinkedRisks([]); }
      setStage("build"); setStep(1); setLocked(false); setRecordId(null);
    } catch { toast.error("Failed to build reconstruction"); }
    finally { setBusy(false); }
  };

  const hiCount = useMemo(() => timeline.filter((t) => ["High", "Critical"].includes(t.status)).length, [timeline]);
  const domainCount = useMemo(() => new Set(timeline.map((t) => t.theme).filter(Boolean)).size, [timeline]);

  const narrative = useMemo(() => {
    const domains = [...new Set(timeline.map((t) => t.theme).filter(Boolean))];
    return `In the period leading to the incident on ${incidentDate}, ${scopeLabel} generated ${timeline.length} governance signal${timeline.length === 1 ? "" : "s"} across ${domains.length} domain${domains.length === 1 ? "" : "s"} (${domains.join(", ") || "none recorded"}), of which ${hiCount} were High or Critical. The trajectory in the run-up was assessed as ${trajectory}.${controlFailure ? ` Control-failure analysis identified: ${controlFailure}` : ""}${factors ? ` Contributing factors: ${factors}` : ""} This reconstruction links ${linkedRisks.length} risk${linkedRisks.length === 1 ? "" : "s"}, evidencing whether escalation thresholds were met and acted upon in time.`;
  }, [timeline, incidentDate, scopeLabel, hiCount, trajectory, controlFailure, factors, linkedRisks.length]);

  const saveDraft = async () => {
    const body = {
      scope: mode, scope_ref: scopeRef, scope_label: scopeLabel, incident_date: incidentDate,
      trajectory, contributing_factors: factors, control_failure: controlFailure, narrative,
      timeline_events: timeline, summary: { ...counts, high_critical: hiCount, domains: domainCount },
      linked_risk_ids: linkedRisks.map((r) => r.id),
    };
    if (recordId) return recordId;
    const r = await apiClient.post("/reconstruction/record", body);
    const id = r.data?.data?.id;
    setRecordId(id);
    return id;
  };

  const lock = async () => {
    setBusy(true);
    try {
      const id = await saveDraft();
      await apiClient.post(`/reconstruction/record/${id}/lock`, { narrative });
      setLocked(true);
      toast.success("Reconstruction locked — immutable & CQC-exportable");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to lock"); }
    finally { setBusy(false); }
  };

  const card = "bg-card border border-border rounded-xl p-6 shadow-sm";
  const area = "w-full px-3 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none";
  const Header = ({ sub }: { sub: string }) => (
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><AlertCircle size={22} /></div>
      <div>
        <div className="text-[11px] font-semibold tracking-widest uppercase text-primary">Director</div>
        <h1 className="text-2xl font-semibold text-foreground">Incident Reconstruction</h1>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>
    </div>
  );

  if (stage === "setup") {
    return (
      <div className="min-h-screen bg-background">
        <RoleBasedNavigation />
        <div className="p-6 w-full pt-20 max-w-3xl mx-auto">
          <Header sub="Reconstruct the signal history before an incident — by house or by person — for a CQC-defensible account (FR9)." />
          <div className={card}>
            <h2 className="text-lg font-semibold mb-1">1 · Scope the reconstruction</h2>
            <p className="text-sm text-muted-foreground mb-4">Reconstruct everything in a <b>house</b>, or everything concerning one <b>person</b> across services.</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {([["house", Home, "By House", "All signals in one service"], ["person", User, "By Person", "One service user across services"]] as const).map(([m, Icon, t, d]) => (
                <button key={m} onClick={() => setMode(m)} className={`text-left p-4 rounded-xl border ${mode === m ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  <div className="flex items-center gap-2 mb-1"><Icon size={16} className={mode === m ? "text-primary" : "text-muted-foreground"} /><span className={`font-semibold text-sm ${mode === m ? "text-primary" : ""}`}>{t}</span></div>
                  <div className="text-xs text-muted-foreground">{d}</div>
                </button>
              ))}
            </div>
            {mode === "house" ? (
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1.5">House / service</label>
                <select value={houseId} onChange={(e) => setHouseId(e.target.value)} className={area}>
                  <option value="">Select a service…</option>
                  {houses.map((h) => <option key={h.id} value={h.id}>{h.name}{h.sector ? ` — ${h.sector === "DOMICILIARY" ? "Domiciliary" : "Supported Living"}` : ""}</option>)}
                </select>
              </div>
            ) : (
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1.5">Person (service user)</label>
                {persons.length ? (
                  <select value={person} onChange={(e) => setPerson(e.target.value)} className={area}>
                    <option value="">Select a person…</option>
                    {persons.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Person reference, e.g. J Smith" className={area} />
                )}
              </div>
            )}
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">From date</label>
                <input type="date" value={fromDate} max={incidentDate} onChange={(e) => setFromDate(e.target.value)} className={area} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Incident date (up to & including)</label>
                <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} className={area} />
              </div>
            </div>
            <button onClick={generate} disabled={busy} className="w-full justify-center inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium">
              {busy ? "Generating…" : <>Generate reconstruction <ArrowRight size={15} /></>}
            </button>
          </div>
          <div className="mt-4 text-xs text-muted-foreground flex gap-2"><Check size={14} className="text-emerald-600 shrink-0 mt-0.5" /> Read-only history assembled from existing signals — it never alters the record. The lock makes it immutable and CQC-exportable.</div>
        </div>
      </div>
    );
  }

  const StepRail = () => (
    <div className="flex gap-2 mb-5">
      {[[1, "Signal timeline"], [2, "Assessment"], [3, "Narrative & lock"]].map(([n, l]) => (
        <button key={n as number} onClick={() => !locked && setStep(n as number)}
          className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${step === n ? "border-primary bg-primary/5" : "border-border"} ${locked ? "cursor-default" : ""}`}>
          <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-semibold ${step > (n as number) ? "bg-emerald-500 text-white" : step === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{step > (n as number) ? <Check size={11} /> : n}</span>
          <span className={`text-sm font-medium ${step === n ? "text-primary" : ""}`}>{l}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20 max-w-4xl mx-auto">
        <Header sub={`${mode === "house" ? "House" : "Person"} reconstruction · ${scopeLabel} · up to ${incidentDate}`} />
        <div className="flex justify-end mb-3">
          <button onClick={() => { setStage("setup"); setLocked(false); setStep(1); setRecordId(null); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted/40 text-sm"><ArrowLeft size={14} /> New reconstruction</button>
        </div>
        <StepRail />

        {step === 1 && (
          <div className={card}>
            <h2 className="text-base font-semibold mb-3">Pre-incident signal timeline <span className="font-normal text-muted-foreground text-sm">· auto-generated from {scopeLabel}</span></h2>
            {timeline.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">No signals for this scope before {incidentDate}.</div>
            ) : (
              <div className="relative pl-5">
                <div className="absolute left-1.5 top-2 bottom-8 w-0.5 bg-border" />
                {timeline.map((s, i) => (
                  <div key={i} className="relative py-2 pl-4">
                    <div className="absolute -left-[3px] top-3.5 w-2.5 h-2.5 rounded-full border-2 border-background" style={{ background: "var(--primary, #1F6B4A)" }} />
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24 shrink-0">{new Date(s.event_time).toLocaleDateString()}</span>
                      <span className="text-sm flex-1">{s.description || s.theme} <span className="text-muted-foreground">· {s.theme}{s.related_person ? ` · ${s.related_person}` : ""}</span></span>
                      {s.status && <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sevClass(s.status)}`}>{s.status}</span>}
                    </div>
                  </div>
                ))}
                <div className="relative py-2 pl-4">
                  <div className="absolute -left-[5px] top-3 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-background" />
                  <span className="text-sm font-bold text-red-700">⚠ Incident — {incidentDate}</span>
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-5 text-xs text-muted-foreground border-t border-border/50 pt-3">
              <span><b className="text-foreground">{timeline.length}</b> signals</span>
              <span><b className="text-foreground">{hiCount}</b> High/Critical</span>
              <span><b className="text-foreground">{domainCount}</b> domains</span>
              <span><b className="text-foreground">{linkedRisks.length}</b> linked risk{linkedRisks.length === 1 ? "" : "s"}</span>
            </div>
            <div className="mt-4 flex justify-end"><button onClick={() => setStep(2)} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm">Continue to assessment <ArrowRight size={14} /></button></div>
          </div>
        )}

        {step === 2 && (
          <div className={card}>
            <h2 className="text-base font-semibold mb-3">Trajectory & control-failure analysis</h2>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1.5">Trajectory assessment (in the run-up)</label>
              <select value={trajectory} onChange={(e) => setTrajectory(e.target.value)} className={area}>
                {["Improving", "Stable", "Deteriorating"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1.5">Contributing factors</label>
              <textarea rows={2} value={factors} onChange={(e) => setFactors(e.target.value)} placeholder="e.g. staffing shortfall on the relevant shifts; care plan not updated after the first signal" className={area} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Control-failure analysis (what should have caught this earlier?)</label>
              <textarea rows={2} value={controlFailure} onChange={(e) => setControlFailure(e.target.value)} placeholder="e.g. cluster reached threshold on day 5 but was not promoted to a risk until after the incident" className={area} />
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground mb-4">Linked evidence: {linkedRisks.length} risk{linkedRisks.length === 1 ? "" : "s"}{linkedRisks.length ? ` (${linkedRisks.map((r) => r.id || r.risk_code || "").filter(Boolean).slice(0, 6).join(", ")})` : ""}.</div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border hover:bg-muted/40 text-sm"><ArrowLeft size={14} /> Back</button>
              <button onClick={() => setStep(3)} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm">Draft narrative <ArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={card}>
            <h2 className="text-base font-semibold mb-1">Governance narrative {locked && <span className="text-emerald-600 text-sm font-normal">· Locked</span>}</h2>
            <p className="text-xs text-muted-foreground mb-3">Auto-drafted from the structured data above. Once locked it becomes immutable and exportable for CQC.</p>
            <div className="bg-muted/40 rounded-lg p-4 text-sm leading-7">{narrative}</div>
            <div className="bg-primary/5 border-l-2 border-primary rounded-lg p-3 mt-3">
              <div className="text-[10px] font-bold tracking-widest text-primary mb-1">CQC KEY LINE OF ENQUIRY</div>
              <div className="text-xs"><b>S2</b> — How are risks to people assessed, monitored and mitigated?</div>
              <div className="text-xs"><b>W4</b> — How are risks and performance managed and understood across the service?</div>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <button onClick={() => setStep(2)} disabled={locked} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border hover:bg-muted/40 text-sm disabled:opacity-50"><ArrowLeft size={14} /> Back</button>
              {locked ? (
                <span className="inline-flex items-center gap-2 text-emerald-700 font-medium text-sm"><Check size={16} /> Locked & ready for CQC export</span>
              ) : (
                <button onClick={lock} disabled={busy} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm">{busy ? "Locking…" : <>Lock reconstruction <Lock size={14} /></>}</button>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground flex gap-2"><Clock size={14} className="shrink-0 mt-0.5" /> The timeline is assembled from existing signals up to the incident day; the lock makes it immutable and CQC-exportable (FR9, S2 · W4).</div>
      </div>
    </div>
  );
}

export default IncidentReconstruction;
