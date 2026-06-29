import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { FileDown, FileText, ShieldAlert, Flag, GitBranch, Loader2, Download, Network, FileCheck2, Sparkles, Trash2 } from "lucide-react";
import { apiClient } from "@/services/api";
import { toast } from "sonner";

// Narrated, KLOE-referenced governance reports.
const REPORTS = [
  { key: "weekly-governance", title: "Weekly Governance Narrative", desc: "Plain-English account of the week's signals, patterns and decisions.", icon: FileText, needsService: true, scopePicker: false },
  { key: "cross-service-control", title: "Cross-Service Control Report", desc: "Director view of systemic patterns spanning multiple services (Safe S4 · Well-Led W4).", icon: Network, needsService: false, scopePicker: false },
  { key: "inspection-evidence", title: "Inspection Evidence Pack", desc: "Traceable lineage from observation to action, mapped to CQC KLOEs (S1 · S2 · W2).", icon: FileCheck2, needsService: false, scopePicker: false },
  { key: "strategic-risks", title: "Strategic Risk Report", desc: "Organisational risks currently requiring oversight.", icon: ShieldAlert, needsService: false, scopePicker: false },
  { key: "escalations", title: "Escalation Report", desc: "Evidence that concerns were escalated appropriately.", icon: Flag, needsService: false, scopePicker: false },
  { key: "reconstruction", title: "Reconstruction Report", desc: "The full governance timeline for a client, service, theme or incident.", icon: GitBranch, needsService: false, scopePicker: true },
] as const;

type ReportKey = typeof REPORTS[number]["key"];

const unwrap = (res: any): any => res?.data?.data ?? res?.data ?? res;

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n");
}

export function Reports() {
  const [houses, setHouses] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [start, setStart] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [scope, setScope] = useState<"service" | "client" | "theme" | "incident">("service");
  const [scopeId, setScopeId] = useState("");
  const [busy, setBusy] = useState<ReportKey | null>(null);
  const [active, setActive] = useState<ReportKey | null>(null);
  const [result, setResult] = useState<any>(null);
  const [aiNarrative, setAiNarrative] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [savingKey, setSavingKey] = useState<ReportKey | null>(null);

  const loadSavedReports = () => {
    apiClient.get("/reports/saved").then(r => {
      const list = unwrap(r); setSavedReports(Array.isArray(list) ? list : []);
    }).catch(() => { /* non-fatal */ });
  };

  // Generate the report server-side in the chosen format and retain it in OrdinCore.
  const generateAndSave = async (key: ReportKey) => {
    if (key === "reconstruction" && scope !== "service" && !scopeId.trim()) {
      toast.error(`Enter a ${scope} reference for the reconstruction.`); return;
    }
    setSavingKey(key);
    try {
      const res = await apiClient.get(buildPath(key));
      const data = unwrap(res);
      const meta = REPORTS.find(r => r.key === key);
      await apiClient.post("/reports/save", {
        reportKey: key,
        title: meta?.title || key,
        format,
        periodLabel: `${start} to ${end}`,
        serviceName: houses.find(h => h.id === serviceId)?.name,
        data,
        narrative: active === key ? aiNarrative : undefined,
      });
      toast.success(`Saved to OrdinCore as ${format.toUpperCase()}.`);
      loadSavedReports();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to save report.");
    } finally {
      setSavingKey(null);
    }
  };

  const downloadSaved = async (rep: any) => {
    try {
      const res = await apiClient.get(`/reports/saved/${rep.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${(rep.title || "report").replace(/[^a-z0-9-_ ]/gi, "")}.${rep.format}`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download report.");
    }
  };

  const deleteSaved = async (id: string) => {
    try {
      await apiClient.delete(`/reports/saved/${id}`);
      setSavedReports(s => s.filter((r: any) => r.id !== id));
    } catch {
      toast.error("Could not delete report.");
    }
  };

  const generateNarrative = async () => {
    if (!result || !active) return;
    setAiBusy(true);
    try {
      const title = REPORTS.find(r => r.key === active)?.title || "Governance Report";
      const serviceName = houses.find(h => h.id === serviceId)?.name;
      const res = await apiClient.post("/reports/narrative", {
        reportTitle: title, periodLabel: `${start} to ${end}`, serviceName, data: result,
      });
      const out = unwrap(res);
      setAiNarrative(out?.narrative || "");
      if (out?.generated === false) toast.message("Draft generated from a template — configure NARRATIVE_API_KEY (free via Groq) for AI prose.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate narrative");
    } finally {
      setAiBusy(false);
    }
  };

  const [savedRecon, setSavedRecon] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get("/houses?limit=100").then(r => {
      const list = unwrap(r); const arr = Array.isArray(list) ? list : (list?.data || []);
      setHouses(arr); if (arr[0]) setServiceId(arr[0].id);
    }).catch(() => { /* non-fatal */ });
    apiClient.get("/reports/saved-reconstructions").then(r => {
      const list = unwrap(r); setSavedRecon(Array.isArray(list) ? list : []);
    }).catch(() => { /* non-fatal */ });
    loadSavedReports();
  }, []);

  const buildPath = (key: ReportKey) => {
    const qs = new URLSearchParams();
    if (start) qs.set("start", start);
    if (end) qs.set("end", end);
    if (key === "weekly-governance" && serviceId) qs.set("service_id", serviceId);
    if (key === "reconstruction") {
      qs.set("scope", scope);
      qs.set("id", scope === "service" ? serviceId : scopeId);
    }
    return `/reports/${key}?${qs.toString()}`;
  };

  const run = async (key: ReportKey, download: boolean) => {
    if (key === "reconstruction" && scope !== "service" && !scopeId.trim()) {
      toast.error(`Enter a ${scope} reference for the reconstruction.`); return;
    }
    setBusy(key);
    try {
      const res = await apiClient.get(buildPath(key));
      const data = unwrap(res);
      setActive(key); setResult(data); setAiNarrative("");
      if (download) {
        const rows = data?.risks || data?.escalations || data?.timeline || data?.themes || data?.flags || data?.evidence;
        const stamp = new Date().toISOString().slice(0, 10);
        if (Array.isArray(rows) && rows.length) {
          downloadFile(`${key}-${stamp}.csv`, toCsv(rows), "text/csv");
        } else {
          downloadFile(`${key}-${stamp}.json`, JSON.stringify(data, null, 2), "application/json");
        }
        toast.success("Report downloaded.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate report.");
    } finally {
      setBusy(null);
    }
  };

  const renderPreview = () => {
    if (!result) return null;
    const rows = result.risks || result.escalations || result.timeline || result.themes || result.flags || result.evidence;
    return (
      <div className="mt-6 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{result.report || "Report preview"}</h3>
          {active && (
            <button onClick={() => run(active, true)} className="flex items-center gap-2 text-sm text-primary">
              <Download className="w-4 h-4" /> Download
            </button>
          )}
        </div>
        {/* Narrated reports: plain-English account + CQC KLOE references */}
        {result.narrative && (
          <div className="bg-muted/40 rounded-lg p-4 text-sm leading-7 mb-3">{result.narrative}</div>
        )}

        {/* AI narrative draft — assistive, editable. Never decides; never invents figures. */}
        <div className="border border-border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Narrative (draft)
            </h4>
            <div className="flex items-center gap-3">
              <button onClick={generateNarrative} disabled={aiBusy} className="text-sm text-primary flex items-center gap-1 disabled:opacity-50">
                {aiBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : (aiNarrative ? "Regenerate" : "Generate")}
              </button>
              {aiNarrative && (
                <button onClick={() => downloadFile(`${active}-narrative-${new Date().toISOString().slice(0,10)}.txt`, aiNarrative, "text/plain")} className="text-sm text-muted-foreground flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> .txt
                </button>
              )}
            </div>
          </div>
          {aiNarrative ? (
            <textarea
              value={aiNarrative}
              onChange={e => setAiNarrative(e.target.value)}
              rows={12}
              className="w-full text-sm p-3 border border-border rounded-lg bg-background leading-6"
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Generate an editable, inspection-ready prose draft from this report's data. Review and edit
              before use — it summarises only what the system computed and never invents figures.
            </p>
          )}
        </div>
        {Array.isArray(result.kloe) && result.kloe.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold tracking-widest text-primary">CQC KLOE</span>
            {result.kloe.map((k: string) => (
              <span key={k} className="text-[11px] font-semibold text-primary bg-primary/10 rounded px-2 py-0.5">{k}</span>
            ))}
          </div>
        )}
        {result.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {Object.entries(result.summary).map(([k, v]) => (
              <div key={k} className="border border-border rounded-lg p-3">
                <p className="text-xl font-semibold">{String(v)}</p>
                <p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        )}
        {result.counts && (
          <p className="text-sm text-muted-foreground mb-3">
            {result.counts.total} timeline events — {result.counts.signals} signals, {result.counts.reviews} reviews, {result.counts.escalations} escalations.
          </p>
        )}
        {Array.isArray(rows) && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  {Object.keys(rows[0]).slice(0, 6).map(c => <th key={c} className="py-2 px-2 capitalize">{c.replace(/_/g, " ")}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 25).map((row: any, i: number) => (
                  <tr key={i} className="border-b border-border/50">
                    {Object.keys(rows[0]).slice(0, 6).map(c => (
                      <td key={c} className="py-2 px-2 max-w-[220px] truncate">{String(row[c] ?? "—")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">No data in this period.</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 max-w-[1300px]">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">Narrated governance reports, cross-referenced to CQC Key Lines of Enquiry. Generate &amp; save retains a copy in OrdinCore; pick PDF (narrative) or CSV (raw data).</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">Format</span>
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              <button onClick={() => setFormat("pdf")} className={`px-3 py-1.5 text-sm ${format === "pdf" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>PDF</button>
              <button onClick={() => setFormat("csv")} className={`px-3 py-1.5 text-sm ${format === "csv" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>CSV</button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">From</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">To</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Service</label>
            <select value={serviceId} onChange={e => setServiceId(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm">
              <option value="">All services</option>
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Reconstruction scope</label>
            <div className="flex gap-2">
              <select value={scope} onChange={e => setScope(e.target.value as any)} className="px-2 py-2 border border-border rounded-lg bg-background text-sm">
                <option value="service">Service</option>
                <option value="client">Client</option>
                <option value="theme">Theme</option>
                <option value="incident">Incident</option>
              </select>
              <input
                value={scope === "service" ? (houses.find(h => h.id === serviceId)?.name || "selected service") : scopeId}
                onChange={e => setScopeId(e.target.value)}
                disabled={scope === "service"}
                placeholder={scope === "client" ? "e.g. Alice Anders" : scope === "theme" ? "e.g. Medication" : "incident id"}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Report cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTS.map(r => (
            <div key={r.key} className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3"><r.icon className="w-5 h-5" /></div>
              <h3 className="font-semibold text-foreground">{r.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 flex-1">{r.desc}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => run(r.key, false)} disabled={busy === r.key} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-50">
                  {busy === r.key ? <Loader2 className="w-4 h-4 animate-spin" /> : "Preview"}
                </button>
                <button onClick={() => generateAndSave(r.key)} disabled={savingKey === r.key} title={`Generate & save as ${format.toUpperCase()}`} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50">
                  {savingKey === r.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileDown className="w-4 h-4" /> {format.toUpperCase()}</>}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Saved Reports — generated server-side and retained in-platform */}
        {savedReports.length > 0 && (
          <div className="mt-6 bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-1 flex items-center gap-2"><FileCheck2 className="w-4 h-4 text-primary" /> Saved Reports</h3>
            <p className="text-xs text-muted-foreground mb-4">Reports generated and retained in OrdinCore — your inspection evidence trail.</p>
            <div className="divide-y divide-border">
              {savedReports.map((rep: any) => (
                <div key={rep.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {rep.title}
                      <span className="text-[10px] uppercase bg-muted text-muted-foreground rounded px-1.5 py-0.5 ml-2">{rep.format}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rep.period_label || ""}{rep.service_name ? ` · ${rep.service_name}` : ""} · {new Date(rep.created_at).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <div className="flex gap-4 shrink-0">
                    <button onClick={() => downloadSaved(rep)} className="text-sm text-primary flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Download</button>
                    <button onClick={() => deleteSaved(rep.id)} className="text-sm text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* B6: locked reconstructions now appear in the report set */}
        {savedRecon.length > 0 && (
          <div className="mt-6 bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-1 flex items-center gap-2"><GitBranch className="w-4 h-4 text-primary" /> Saved Reconstructions</h3>
            <p className="text-xs text-muted-foreground mb-4">Locked incident reconstructions, retained as inspection evidence.</p>
            <div className="divide-y divide-border">
              {savedRecon.map(rec => (
                <div key={rec.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium">{rec.scope_label || rec.scope}{rec.incident_date ? ` · ${new Date(rec.incident_date).toLocaleDateString("en-GB")}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{rec.trajectory || "—"} · locked {rec.locked_at ? new Date(rec.locked_at).toLocaleDateString("en-GB") : "—"}</p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => downloadFile(`reconstruction-${rec.id}.txt`, rec.narrative || "", "text/plain")} className="text-sm text-primary flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Narrative</button>
                    <button onClick={() => downloadFile(`reconstruction-${rec.id}.csv`, toCsv(Array.isArray(rec.timeline_events) ? rec.timeline_events : []), "text/csv")} className="text-sm text-muted-foreground flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Timeline CSV</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {renderPreview()}
      </div>
    </div>
  );
}
