import { useEffect, useMemo, useState } from "react";
import { FileText, Download, CheckCircle2, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

type ScopeType = "PERSON" | "SITE" | "SERVICE" | "REGION" | "ORGANISATION";
type Report = { key: string; title: string; scopes: ScopeType[] };
type Options = { role: string; sites: any[]; services: any[]; regions: any[]; persons: any[] };

const SCOPE_LABEL: Record<ScopeType, string> = {
  PERSON: "Person", SITE: "Site", SERVICE: "Service", REGION: "Region", ORGANISATION: "Organisation",
};
const STATUS_TONE: Record<string, string> = {
  STABLE: "text-emerald-600 bg-emerald-500/10", ATTENTION: "text-amber-600 bg-amber-500/10", CRITICAL: "text-red-600 bg-red-500/10",
};
const unwrap = (r: any) => r?.data?.data ?? r?.data ?? r;
const iso = (d: string) => new Date(d).toISOString();

export function FrozenReports() {
  const [catalog, setCatalog] = useState<Report[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [scope, setScope] = useState<ScopeType>("ORGANISATION");
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [personId, setPersonId] = useState("");
  const [start, setStart] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get("/frozen-reports/catalog").then((r) => setCatalog(unwrap(r) || [])).catch(() => setCatalog([]));
    apiClient.get("/frozen-reports/scope-options").then((r) => setOptions(unwrap(r))).catch(() => setOptions(null));
    loadHistory();
  }, []);

  const loadHistory = () =>
    apiClient.get("/frozen-reports").then((r) => setHistory(unwrap(r) || [])).catch(() => setHistory([]));

  // Which scopes this user may actually pick: the report's scopes ∩ role permissions.
  const role = (options?.role || "").toUpperCase();
  const orgRoles = ["DIRECTOR", "RESPONSIBLE_INDIVIDUAL", "ADMIN", "SUPER_ADMIN"];
  const allowedScopes = useMemo<ScopeType[]>(() => {
    if (!report) return [];
    return report.scopes.filter((s) => {
      if ((s === "ORGANISATION" || s === "REGION") && !orgRoles.includes(role)) return false;
      if (s === "SERVICE" && !orgRoles.includes(role) && role !== "REGISTERED_MANAGER") return false;
      return true;
    });
  }, [report, role]);

  useEffect(() => { if (allowedScopes.length && !allowedScopes.includes(scope)) setScope(allowedScopes[0]); }, [allowedScopes]);

  const pickReport = (r: Report) => { setReport(r); setSnapshot(null); };

  const generate = async () => {
    if (!report) return;
    const scopeBody: any = { type: scope };
    if (scope === "SITE") { if (!siteIds.length) return toast.error("Select at least one site."); scopeBody.siteIds = siteIds; }
    if (scope === "SERVICE") { if (!serviceId) return toast.error("Select a service."); scopeBody.serviceId = serviceId; }
    if (scope === "REGION") { if (!regionId) return toast.error("Select a region."); scopeBody.regionId = regionId; }
    if (scope === "PERSON") {
      if (!personId) return toast.error("Select a person.");
      const p = options?.persons.find((x) => x.id === personId);
      scopeBody.personId = personId; scopeBody.siteIds = p ? [p.house_id] : undefined;
    }
    setGenerating(true);
    try {
      const res = await apiClient.post(`/frozen-reports/${report.key}/generate`, {
        scope: scopeBody, periodStart: iso(start), periodEnd: iso(end + "T23:59:59"),
      });
      setSnapshot(unwrap(res));
      toast.success("Report generated — review, then approve.");
      loadHistory();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "Could not generate the report.");
    } finally { setGenerating(false); }
  };

  const approve = async (id: string) => {
    try {
      await apiClient.post(`/frozen-reports/${id}/approve`, {});
      toast.success("Report approved.");
      if (snapshot?.id === id) setSnapshot({ ...snapshot, status: "APPROVED" });
      loadHistory();
    } catch (e: any) { toast.error(e?.data?.message || e?.message || "Could not approve."); }
  };

  const download = async (id: string) => {
    try {
      const { blob, filename } = await (apiClient as any).getBlob(`/frozen-reports/${id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename || `report-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { toast.error("Could not download the PDF."); }
  };

  const d = snapshot?.data || {};

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 max-w-[1400px]">
        <h1 className="text-2xl font-semibold text-foreground mb-1">Reports</h1>
        <p className="text-sm text-muted-foreground mb-6">Choose a report and the scope you're authorised for. Every report is a frozen, approvable snapshot — the PDF matches exactly what you generated.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report catalogue */}
          <div className="bg-card border-2 border-border rounded-xl p-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground px-2 py-1">Reports</p>
            {catalog.map((r) => (
              <button key={r.key} onClick={() => pickReport(r)}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2.5 ${report?.key === r.key ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                <FileText size={15} /><span className="text-sm font-medium">{r.title}</span>
              </button>
            ))}
          </div>

          {/* Configure + generate */}
          <div className="lg:col-span-2 space-y-4">
            {!report ? (
              <div className="bg-card border-2 border-border rounded-xl p-10 text-center text-muted-foreground">Select a report to begin.</div>
            ) : (
              <>
                <div className="bg-card border-2 border-border rounded-xl p-5">
                  <h2 className="text-lg font-semibold text-foreground mb-3">{report.title}</h2>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Scope</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {allowedScopes.map((s) => (
                      <button key={s} onClick={() => setScope(s)}
                        className={`px-3 py-1.5 rounded-lg text-sm border-2 ${scope === s ? "border-primary bg-primary/5 text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}>
                        {SCOPE_LABEL[s]}
                      </button>
                    ))}
                  </div>

                  {scope === "SITE" && (
                    <div className="mb-4">
                      <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Sites</label>
                      <div className="flex flex-wrap gap-2">
                        {options?.sites.map((s) => {
                          const on = siteIds.includes(s.id);
                          return (
                            <button key={s.id} onClick={() => setSiteIds(on ? siteIds.filter((x) => x !== s.id) : [...siteIds, s.id])}
                              className={`px-3 py-1.5 rounded-lg text-sm border-2 ${on ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {scope === "SERVICE" && (
                    <SelectRow label="Service" value={serviceId} onChange={setServiceId} options={options?.services || []} />
                  )}
                  {scope === "REGION" && (
                    <SelectRow label="Region" value={regionId} onChange={setRegionId} options={options?.regions || []} />
                  )}
                  {scope === "PERSON" && (
                    <SelectRow label="Person" value={personId} onChange={setPersonId} options={(options?.persons || []).map((p) => ({ id: p.id, name: p.name }))} />
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">From</label>
                      <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full p-2.5 border-2 border-border rounded-lg bg-background" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">To</label>
                      <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full p-2.5 border-2 border-border rounded-lg bg-background" />
                    </div>
                  </div>

                  <button onClick={generate} disabled={generating}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                    {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : "Generate report"}
                  </button>
                </div>

                {/* Draft preview */}
                {snapshot && (
                  <div className="bg-card border-2 border-border rounded-xl p-5">
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold uppercase px-2.5 py-1 rounded ${STATUS_TONE[d.organisation?.status] || ""}`}>{d.organisation?.status}</span>
                        <span className="text-sm text-muted-foreground">Governance {d.organisation?.governance_confidence}% · Evidence {d.organisation?.evidence_confidence}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {snapshot.status !== "APPROVED" && (
                          <button onClick={() => approve(snapshot.id)} className="px-3 py-1.5 rounded-lg border-2 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/5 text-sm flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Approve
                          </button>
                        )}
                        <button onClick={() => download(snapshot.id)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-1.5">
                          <Download className="w-4 h-4" /> PDF
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{d.scope_label} · {new Date(d.period?.start).toLocaleDateString("en-GB")}–{new Date(d.period?.end).toLocaleDateString("en-GB")} · {d.site_count} site(s)</p>

                    {d.organisation?.status === "CRITICAL" && (
                      <div className="flex items-start gap-2 text-sm text-red-700 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                        <AlertTriangle className="w-4 h-4 mt-0.5" /> A site is CRITICAL — the organisation position reflects that exception and is not an average.
                      </div>
                    )}

                    {/* Site comparison */}
                    {d.per_site?.length > 0 && (
                      <div className="overflow-x-auto mb-3">
                        <table className="w-full text-sm">
                          <thead><tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                            <th className="py-2">Site</th><th>Status</th><th>Gov %</th><th>Signals</th><th>Open risks</th><th>Overdue</th>
                          </tr></thead>
                          <tbody>
                            {d.per_site.map((s: any) => (
                              <tr key={s.site_id} className="border-b border-border/50">
                                <td className="py-2">{s.site_name}</td>
                                <td><span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${STATUS_TONE[s.status] || ""}`}>{s.status}</span></td>
                                <td>{s.governance_confidence}%</td><td>{s.signals}</td><td>{s.open_risks}</td><td>{s.overdue_actions}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {snapshot.narrative && (
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Governance narrative</p>
                        <p className="text-sm leading-6 whitespace-pre-line text-foreground">{snapshot.narrative}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="bg-card border-2 border-border rounded-xl p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Recent reports</p>
                <div className="divide-y divide-border">
                  {history.slice(0, 8).map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{catalog.find((c) => c.key === h.report_key)?.title || h.report_key}</p>
                        <p className="text-xs text-muted-foreground">{h.scope_type} · {new Date(h.created_at).toLocaleDateString("en-GB")} · {h.status}{h.approved_by_name ? ` by ${h.approved_by_name}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {h.status !== "APPROVED" && <button onClick={() => approve(h.id)} className="text-xs text-emerald-600 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Approve</button>}
                        <button onClick={() => download(h.id)} className="text-xs text-primary flex items-center gap-1"><Download className="w-3.5 h-3.5" />PDF</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: any[] }) {
  return (
    <div className="mb-4">
      <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-2.5 border-2 border-border rounded-lg bg-background">
        <option value="">Select {label.toLowerCase()}…</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
