import { useEffect, useState } from "react";
import { Building2, Plus, MapPin, Layers, Home } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

// Admin: model the site → service → region hierarchy the frozen reports scope on.
export function OrgStructureAdmin() {
  const [data, setData] = useState<{ services: any[]; regions: any[]; houses: any[] }>({ services: [], regions: [], houses: [] });
  const [loading, setLoading] = useState(true);
  const [newService, setNewService] = useState("");
  const [newRegion, setNewRegion] = useState("");

  const load = async () => {
    try {
      const res = await apiClient.get("/org-structure");
      setData(res.data?.data ?? res.data ?? { services: [], regions: [], houses: [] });
    } catch { toast.error("Failed to load structure"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const add = async (kind: "services" | "regions", name: string, reset: () => void) => {
    if (name.trim().length < 2) { toast.error("Enter a name."); return; }
    try { await apiClient.post(`/org-structure/${kind}`, { name: name.trim() }); reset(); load(); toast.success("Added"); }
    catch (e: any) { toast.error(e?.response?.data?.message || "Failed to add"); }
  };

  const assign = async (houseId: string, field: "service_id" | "region_id", value: string, current: any) => {
    const body = { service_id: current.service_id, region_id: current.region_id, [field]: value || null };
    try {
      await apiClient.post(`/org-structure/houses/${houseId}/assign`, body);
      setData((d) => ({ ...d, houses: d.houses.map((h) => h.id === houseId ? { ...h, [field]: value || null } : h) }));
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to assign"); }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 lg:px-10 pt-20 max-w-[1100px] mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Building2 size={22} /></div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Organisation Structure</h1>
            <p className="text-sm text-muted-foreground">Group your sites into services and regions — reports can then be scoped by service or region.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Services */}
          <div className="bg-card border-2 border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><Layers size={16} className="text-primary" /> Services <span className="text-xs text-muted-foreground">({data.services.length})</span></h2>
            <div className="space-y-1.5 mb-3">
              {data.services.map((s) => <div key={s.id} className="flex items-center justify-between text-sm"><span className="text-foreground">{s.name}</span><span className="text-xs text-muted-foreground">{s.sites} site{s.sites === 1 ? "" : "s"}</span></div>)}
              {data.services.length === 0 && <p className="text-sm text-muted-foreground">No services yet.</p>}
            </div>
            <div className="flex gap-2">
              <input value={newService} onChange={(e) => setNewService(e.target.value)} placeholder="New service name" className="flex-1 p-2 border-2 border-border rounded-lg bg-background text-sm" />
              <button onClick={() => add("services", newService, () => setNewService(""))} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-1"><Plus size={15} /> Add</button>
            </div>
          </div>

          {/* Regions */}
          <div className="bg-card border-2 border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><MapPin size={16} className="text-primary" /> Regions <span className="text-xs text-muted-foreground">({data.regions.length})</span></h2>
            <div className="space-y-1.5 mb-3">
              {data.regions.map((r) => <div key={r.id} className="flex items-center justify-between text-sm"><span className="text-foreground">{r.name}</span><span className="text-xs text-muted-foreground">{r.sites} site{r.sites === 1 ? "" : "s"}</span></div>)}
              {data.regions.length === 0 && <p className="text-sm text-muted-foreground">No regions yet.</p>}
            </div>
            <div className="flex gap-2">
              <input value={newRegion} onChange={(e) => setNewRegion(e.target.value)} placeholder="New region name" className="flex-1 p-2 border-2 border-border rounded-lg bg-background text-sm" />
              <button onClick={() => add("regions", newRegion, () => setNewRegion(""))} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-1"><Plus size={15} /> Add</button>
            </div>
          </div>
        </div>

        {/* Sites assignment */}
        <div className="bg-card border-2 border-border rounded-xl p-5 mt-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><Home size={16} className="text-primary" /> Sites</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase text-muted-foreground border-b border-border"><th className="py-2 pr-3">Site</th><th className="pr-3">Service</th><th>Region</th></tr></thead>
              <tbody>
                {data.houses.map((h) => (
                  <tr key={h.id} className="border-b border-border/50">
                    <td className="py-2 pr-3 text-foreground">{h.name}</td>
                    <td className="pr-3">
                      <select value={h.service_id || ""} onChange={(e) => assign(h.id, "service_id", e.target.value, h)} className="p-1.5 border border-border rounded bg-background text-sm">
                        <option value="">— Unassigned —</option>
                        {data.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={h.region_id || ""} onChange={(e) => assign(h.id, "region_id", e.target.value, h)} className="p-1.5 border border-border rounded bg-background text-sm">
                        <option value="">— Unassigned —</option>
                        {data.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrgStructureAdmin;
