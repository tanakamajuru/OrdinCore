import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { FileDown, FileText, ShieldAlert, Flag, GitBranch, Loader2, Download } from "lucide-react";
import { apiClient } from "@/services/api";
import { toast } from "sonner";

// The doctrine permits exactly four downloadable reports.
const REPORTS = [
  { key: "weekly-governance", title: "Weekly Governance Report", desc: "What happened this week and what was done.", icon: FileText, needsService: true, scopePicker: false },
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

  useEffect(() => {
    apiClient.get("/houses?limit=100").then(r => {
      const list = unwrap(r); const arr = Array.isArray(list) ? list : (list?.data || []);
      setHouses(arr); if (arr[0]) setServiceId(arr[0].id);
    }).catch(() => { /* non-fatal */ });
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
      setActive(key); setResult(data);
      if (download) {
        const rows = data?.risks || data?.escalations || data?.timeline || data?.themes;
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
    const rows = result.risks || result.escalations || result.timeline || result.themes;
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
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Four downloadable governance reports — what was noticed, what leaders did, what was escalated, and the full story.</p>
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

        {/* Four report cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {REPORTS.map(r => (
            <div key={r.key} className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3"><r.icon className="w-5 h-5" /></div>
              <h3 className="font-semibold text-foreground">{r.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 flex-1">{r.desc}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => run(r.key, false)} disabled={busy === r.key} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-50">
                  {busy === r.key ? <Loader2 className="w-4 h-4 animate-spin" /> : "Preview"}
                </button>
                <button onClick={() => run(r.key, true)} disabled={busy === r.key} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50">
                  <FileDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {renderPreview()}
      </div>
    </div>
  );
}
