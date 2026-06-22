import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { Settings, Tags, Activity, AlertTriangle, ClipboardList, FileSearch, Plus, Check, X, Lock, Building2, RefreshCw, Trash2 } from "lucide-react";

const SECTORS = [
  { value: "SUPPORTED_LIVING", label: "Supported Living" },
  { value: "DOMICILIARY", label: "Domiciliary Care" },
];
const TABS = [
  { key: "services", label: "Services & Sector", icon: Building2, sectorScoped: false },
  { key: "domains", label: "Risk Domains", icon: ClipboardList, sectorScoped: true },
  { key: "signals", label: "Signal Library", icon: Tags, sectorScoped: true },
  { key: "thresholds", label: "Pattern Thresholds", icon: Activity, sectorScoped: true },
  { key: "slas", label: "Escalation SLAs", icon: AlertTriangle, sectorScoped: false },
  { key: "templates", label: "Action Templates", icon: ClipboardList, sectorScoped: false },
  { key: "cycles", label: "Review Cycles", icon: RefreshCw, sectorScoped: false },
  { key: "audit", label: "Audit Log", icon: FileSearch, sectorScoped: false },
];
const CADENCES = ["Daily", "Weekly", "Fortnightly", "Monthly", "Quarterly"];

export function GovernanceConfig() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = (localStorage.getItem("userRole") || user.role || "").toUpperCase().replace(/-/g, "_");
  const isSuper = role === "SUPER_ADMIN";
  // Per-service sector + action templates + review cycles are tenant-owned config,
  // so company Admins may edit them too (not just Super Admins).
  const canEditServices = isSuper || role === "ADMIN";
  const canEditTenant = isSuper || role === "ADMIN";

  const [tab, setTab] = useState("services");
  const [sector, setSector] = useState("SUPPORTED_LIVING");
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adding, setAdding] = useState<any>(null);
  const [domainCounts, setDomainCounts] = useState<Record<string, number>>({});

  const activeTab = TABS.find((t) => t.key === tab)!;

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, sector]);

  const endpoint = () => {
    if (tab === "audit") return `/governance-config/audit?limit=100`;
    if (tab === "slas") return `/governance-config/slas`;
    if (tab === "templates") return `/governance-config/action-templates`;
    if (tab === "cycles") return `/governance-config/review-cycles`;
    return `/governance-config/${tab}?sector=${sector}`;
  };

  const load = async () => {
    setIsLoading(true); setAdding(null);
    try {
      if (tab === "services") {
        const [hs, slD, domD] = await Promise.all([
          apiClient.get(`/houses?limit=200`),
          apiClient.get(`/governance-config/domains?sector=SUPPORTED_LIVING`),
          apiClient.get(`/governance-config/domains?sector=DOMICILIARY`),
        ]);
        const houses = hs.data?.data || hs.data || [];
        setRows(Array.isArray(houses) ? houses : houses.items || []);
        const count = (arr: any[]) => (arr || []).filter((d: any) => d.is_active).length;
        setDomainCounts({ SUPPORTED_LIVING: count(slD.data?.data), DOMICILIARY: count(domD.data?.data) });
        return;
      }
      const res = await apiClient.get(endpoint());
      setRows(res.data?.data || []);
    } catch { toast.error("Failed to load configuration"); setRows([]); }
    finally { setIsLoading(false); }
  };

  const setHouseSector = async (houseId: string, sectorValue: string) => {
    try {
      await apiClient.patch(`/houses/${houseId}`, { sector: sectorValue });
      toast.success(`Sector updated — engine now applies ${sectorValue === "DOMICILIARY" ? "Domiciliary" : "Supported Living"} thresholds`);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to update sector"); }
  };

  const patch = async (path: string, body: any, label: string) => {
    try {
      await apiClient.patch(`/governance-config/${path}`, body);
      toast.success(`${label} updated`);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Update failed"); }
  };

  const create = async (path: string, body: any, label: string) => {
    try {
      await apiClient.post(`/governance-config/${path}`, body);
      toast.success(`${label} added`);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Add failed"); }
  };

  const del = async (path: string, label: string) => {
    if (!window.confirm(`Delete this ${label.toLowerCase()}?`)) return;
    try {
      await apiClient.delete(`/governance-config/${path}`);
      toast.success(`${label} deleted`);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Delete failed"); }
  };

  const card = "bg-card border border-border rounded-xl shadow-sm";
  const th = "text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-4";
  const td = "py-2.5 px-4 text-sm border-t border-border/50 align-middle";
  const numInput = "w-20 px-2 py-1 bg-input-background border border-border rounded text-sm";

  // Small inline numeric editor (Save on blur/Enter) for SUPER_ADMIN
  const NumCell = ({ value, onSave }: { value: number; onSave: (v: number) => void }) => {
    const [v, setV] = useState(String(value ?? ""));
    if (!isSuper) return <span>{value}</span>;
    return (
      <input className={numInput} type="number" value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (v !== String(value) && v !== "") onSave(Number(v)); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
    );
  };

  const ActiveToggle = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
    <button disabled={!isSuper} onClick={onToggle}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"} ${isSuper ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}>
      {active ? <Check size={11} /> : <X size={11} />} {active ? "Active" : "Inactive"}
    </button>
  );

  // Tenant-editable toggle (Action Templates / Review Cycles — editable by Admins too).
  const ActiveToggleT = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
    <button disabled={!canEditTenant} onClick={onToggle}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"} ${canEditTenant ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}>
      {active ? <Check size={11} /> : <X size={11} />} {active ? "Active" : "Inactive"}
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Settings size={22} /></div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Governance Configuration</h1>
            <p className="text-sm text-muted-foreground">The signal library, pattern thresholds and SLAs the engine reads.</p>
          </div>
        </div>
        {!isSuper && tab !== "services" && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            <Lock size={13} /> Read-only. Sector libraries, thresholds and SLAs are shared across all services of a sector — only a Super Admin can change them. (Per-service sector is editable under Services & Sector.)
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border mb-4">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {/* Sector + add controls */}
        <div className="flex items-center justify-between mb-3">
          {activeTab.sectorScoped ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sector:</span>
              {SECTORS.map((s) => (
                <button key={s.value} onClick={() => setSector(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${sector === s.value ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border hover:border-primary/50"}`}>{s.label}</button>
              ))}
            </div>
          ) : <div />}
          {isSuper && (tab === "domains" || tab === "signals") && (
            <button onClick={() => setAdding(tab === "domains" ? { name: "", description: "" } : { domain_name: "", signal_label: "" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">
              <Plus size={14} /> Add {tab === "domains" ? "domain" : "signal"}
            </button>
          )}
          {canEditTenant && (tab === "templates" || tab === "cycles") && (
            <button onClick={() => setAdding(tab === "templates" ? { domain_name: "", title: "", description: "" } : { name: "", cadence: "Weekly", day_of_week: "", description: "" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">
              <Plus size={14} /> Add {tab === "templates" ? "template" : "cycle"}
            </button>
          )}
        </div>

        {/* Body */}
        <div className={card}>
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              {tab === "services" && (
                <table className="w-full">
                  <thead><tr><th className={th}>Service</th><th className={th}>Sector (drives the engine)</th><th className={th}>Domains active</th><th className={th}>Status</th></tr></thead>
                  <tbody>
                    {rows.length === 0 && <tr><td className={td + " text-muted-foreground"} colSpan={4}>No services yet.</td></tr>}
                    {rows.map((h) => {
                      const sec = h.sector || "SUPPORTED_LIVING";
                      return (
                        <tr key={h.id}>
                          <td className={td + " font-medium"}>{h.name}</td>
                          <td className={td}>
                            {canEditServices ? (
                              <select value={sec} onChange={(e) => setHouseSector(h.id, e.target.value)} className="px-2 py-1 bg-input-background border border-border rounded text-sm">
                                {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                            ) : <span>{SECTORS.find((s) => s.value === sec)?.label || sec}</span>}
                          </td>
                          <td className={td + " text-muted-foreground"}>{domainCounts[sec] ?? "—"} domains</td>
                          <td className={td}><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${h.is_active !== false ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{h.is_active !== false ? "Active" : "Inactive"}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tab === "domains" && (
                <table className="w-full">
                  <thead><tr><th className={th}>Domain</th><th className={th}>Description</th><th className={th}>CQC KLOE</th><th className={th}>Order</th><th className={th}>Status</th></tr></thead>
                  <tbody>
                    {adding && (
                      <tr className="bg-primary/5">
                        <td className={td}><input className="w-full px-2 py-1 bg-input-background border border-border rounded text-sm" placeholder="Domain name" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} /></td>
                        <td className={td} colSpan={3}><input className="w-full px-2 py-1 bg-input-background border border-border rounded text-sm" placeholder="Description" value={adding.description} onChange={(e) => setAdding({ ...adding, description: e.target.value })} /></td>
                        <td className={td}>
                          <button onClick={() => adding.name && create("domains", { ...adding, sector }, "Domain")} className="text-emerald-600 mr-2"><Check size={16} /></button>
                          <button onClick={() => setAdding(null)} className="text-muted-foreground"><X size={16} /></button>
                        </td>
                      </tr>
                    )}
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className={td + " font-medium"}>{r.name}</td>
                        <td className={td + " text-muted-foreground"}>{r.description || "—"}</td>
                        <td className={td}>{r.kloe_code ? <span className="text-[11px] font-semibold text-primary bg-primary/10 rounded px-2 py-0.5">{r.kloe_label} · {r.kloe_code}</span> : <span className="text-muted-foreground">—</span>}</td>
                        <td className={td}>{r.sort_order}</td>
                        <td className={td}><ActiveToggle active={r.is_active} onToggle={() => patch(`domains/${r.id}`, { is_active: !r.is_active }, "Domain")} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "signals" && (
                <table className="w-full">
                  <thead><tr><th className={th}>Domain</th><th className={th}>Signal</th><th className={th}>Status</th></tr></thead>
                  <tbody>
                    {adding && (
                      <tr className="bg-primary/5">
                        <td className={td}><input className="w-full px-2 py-1 bg-input-background border border-border rounded text-sm" placeholder="Domain name (exact)" value={adding.domain_name} onChange={(e) => setAdding({ ...adding, domain_name: e.target.value })} /></td>
                        <td className={td}><input className="w-full px-2 py-1 bg-input-background border border-border rounded text-sm" placeholder="Signal label" value={adding.signal_label} onChange={(e) => setAdding({ ...adding, signal_label: e.target.value })} /></td>
                        <td className={td}>
                          <button onClick={() => adding.domain_name && adding.signal_label && create("signals", { ...adding, sector }, "Signal")} className="text-emerald-600 mr-2"><Check size={16} /></button>
                          <button onClick={() => setAdding(null)} className="text-muted-foreground"><X size={16} /></button>
                        </td>
                      </tr>
                    )}
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className={td + " text-muted-foreground"}>{r.domain_name}</td>
                        <td className={td + " font-medium"}>{r.signal_label}</td>
                        <td className={td}><ActiveToggle active={r.is_active} onToggle={() => patch(`signals/${r.id}`, { is_active: !r.is_active }, "Signal")} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "thresholds" && (
                <table className="w-full">
                  <thead><tr><th className={th}>Domain</th><th className={th}>Signals to trigger</th><th className={th}>Within (days)</th><th className={th}>Status</th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className={td + " font-medium"}>{r.domain_name}</td>
                        <td className={td}><NumCell value={r.trigger_signal_count} onSave={(v) => patch(`thresholds/${r.id}`, { trigger_signal_count: v }, "Threshold")} /></td>
                        <td className={td}><NumCell value={r.window_days} onSave={(v) => patch(`thresholds/${r.id}`, { window_days: v }, "Threshold")} /></td>
                        <td className={td}><ActiveToggle active={r.is_active} onToggle={() => patch(`thresholds/${r.id}`, { is_active: !r.is_active }, "Threshold")} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "slas" && (
                <table className="w-full">
                  <thead><tr><th className={th}>Trigger</th><th className={th}>Description</th><th className={th}>Due within (hours)</th><th className={th}>Status</th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.trigger_type}>
                        <td className={td + " font-medium"}>{r.trigger_type}</td>
                        <td className={td + " text-muted-foreground"}>{r.description || "—"}</td>
                        <td className={td}><NumCell value={r.hours} onSave={(v) => patch(`slas/${r.trigger_type}`, { hours: v }, "SLA")} /></td>
                        <td className={td}><ActiveToggle active={r.is_active} onToggle={() => patch(`slas/${r.trigger_type}`, { is_active: !r.is_active }, "SLA")} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "templates" && (
                <table className="w-full">
                  <thead><tr><th className={th}>Domain</th><th className={th}>Action title</th><th className={th}>Description</th><th className={th}>Status</th>{canEditTenant && <th className={th}></th>}</tr></thead>
                  <tbody>
                    {adding && (
                      <tr className="bg-primary/5">
                        <td className={td}><input className="w-full px-2 py-1 bg-input-background border border-border rounded text-sm" placeholder="Domain (optional)" value={adding.domain_name} onChange={(e) => setAdding({ ...adding, domain_name: e.target.value })} /></td>
                        <td className={td}><input className="w-full px-2 py-1 bg-input-background border border-border rounded text-sm" placeholder="Action title" value={adding.title} onChange={(e) => setAdding({ ...adding, title: e.target.value })} /></td>
                        <td className={td}><input className="w-full px-2 py-1 bg-input-background border border-border rounded text-sm" placeholder="Description" value={adding.description} onChange={(e) => setAdding({ ...adding, description: e.target.value })} /></td>
                        <td className={td} colSpan={2}>
                          <button onClick={() => adding.title && create("action-templates", adding, "Template")} className="text-emerald-600 mr-2"><Check size={16} /></button>
                          <button onClick={() => setAdding(null)} className="text-muted-foreground"><X size={16} /></button>
                        </td>
                      </tr>
                    )}
                    {rows.length === 0 && !adding && <tr><td className={td + " text-muted-foreground"} colSpan={5}>No action templates yet.</td></tr>}
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className={td + " text-muted-foreground"}>{r.domain_name || "Any"}</td>
                        <td className={td + " font-medium"}>{r.title}</td>
                        <td className={td + " text-muted-foreground"}>{r.description || "—"}</td>
                        <td className={td}><ActiveToggleT active={r.is_active} onToggle={() => patch(`action-templates/${r.id}`, { is_active: !r.is_active }, "Template")} /></td>
                        {canEditTenant && <td className={td}><button onClick={() => del(`action-templates/${r.id}`, "Template")} className="text-red-600 hover:opacity-70"><Trash2 size={15} /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "cycles" && (
                <table className="w-full">
                  <thead><tr><th className={th}>Cycle</th><th className={th}>Cadence</th><th className={th}>Day</th><th className={th}>Description</th><th className={th}>Status</th>{canEditTenant && <th className={th}></th>}</tr></thead>
                  <tbody>
                    {adding && (
                      <tr className="bg-primary/5">
                        <td className={td}><input className="w-full px-2 py-1 bg-input-background border border-border rounded text-sm" placeholder="Cycle name" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} /></td>
                        <td className={td}><select className="px-2 py-1 bg-input-background border border-border rounded text-sm" value={adding.cadence} onChange={(e) => setAdding({ ...adding, cadence: e.target.value })}>{CADENCES.map((c) => <option key={c}>{c}</option>)}</select></td>
                        <td className={td}><input className="w-20 px-2 py-1 bg-input-background border border-border rounded text-sm" placeholder="Day" value={adding.day_of_week} onChange={(e) => setAdding({ ...adding, day_of_week: e.target.value })} /></td>
                        <td className={td}><input className="w-full px-2 py-1 bg-input-background border border-border rounded text-sm" placeholder="Description" value={adding.description} onChange={(e) => setAdding({ ...adding, description: e.target.value })} /></td>
                        <td className={td} colSpan={2}>
                          <button onClick={() => adding.name && create("review-cycles", adding, "Review cycle")} className="text-emerald-600 mr-2"><Check size={16} /></button>
                          <button onClick={() => setAdding(null)} className="text-muted-foreground"><X size={16} /></button>
                        </td>
                      </tr>
                    )}
                    {rows.length === 0 && !adding && <tr><td className={td + " text-muted-foreground"} colSpan={6}>No review cycles yet.</td></tr>}
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className={td + " font-medium"}>{r.name}</td>
                        <td className={td}><span className="text-[11px] font-semibold text-primary bg-primary/10 rounded px-2 py-0.5">{r.cadence}</span></td>
                        <td className={td + " text-muted-foreground"}>{r.day_of_week || "—"}</td>
                        <td className={td + " text-muted-foreground"}>{r.description || "—"}</td>
                        <td className={td}><ActiveToggleT active={r.is_active} onToggle={() => patch(`review-cycles/${r.id}`, { is_active: !r.is_active }, "Review cycle")} /></td>
                        {canEditTenant && <td className={td}><button onClick={() => del(`review-cycles/${r.id}`, "Review cycle")} className="text-red-600 hover:opacity-70"><Trash2 size={15} /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "audit" && (
                <table className="w-full">
                  <thead><tr><th className={th}>When</th><th className={th}>Actor</th><th className={th}>Action</th><th className={th}>Resource</th></tr></thead>
                  <tbody>
                    {rows.length === 0 && <tr><td className={td + " text-muted-foreground"} colSpan={4}>No audit entries yet.</td></tr>}
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className={td + " text-muted-foreground whitespace-nowrap"}>{new Date(r.created_at).toLocaleString()}</td>
                        <td className={td}>{r.actor}</td>
                        <td className={td + " font-medium"}>{r.action}</td>
                        <td className={td + " text-muted-foreground"}>{r.resource || r.entity_type || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GovernanceConfig;
