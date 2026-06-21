import { useState, useEffect, useMemo } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { Search, Users, Layers } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

interface Patient {
  id: string;
  first_name?: string;
  last_name?: string;
  display_name: string;
  is_active: boolean;
  house_id: string;
  house_name: string;
}

export function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [houses, setHouses] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [site, setSite] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadHouses(); }, []);

  // Debounced reload when search or site changes.
  useEffect(() => {
    const t = setTimeout(() => { load(); }, 250);
    return () => clearTimeout(t);
  }, [search, site]);

  const loadHouses = async () => {
    try {
      const res = await apiClient.get("/houses?limit=200");
      const data = (res as any).data?.data || (res as any).data || [];
      setHouses(Array.isArray(data) ? data : (data.items || []));
    } catch { /* non-fatal */ }
  };

  const load = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (site !== "all") params.set("house_id", site);
      const qs = params.toString();
      const res = await apiClient.get(`/service-users${qs ? `?${qs}` : ""}`);
      const data = (res as any).data?.data || (res as any).data || [];
      setPatients(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load patients");
    } finally {
      setIsLoading(false);
    }
  };

  // Group by site for a clear, sorted view.
  const grouped = useMemo(() => {
    const m: Record<string, Patient[]> = {};
    for (const p of patients) (m[p.house_name || "Unassigned"] = m[p.house_name || "Unassigned"] || []).push(p);
    return Object.keys(m).sort().map((name) => ({ name, rows: m[name] }));
  }, [patients]);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Users size={22} /></div>
          <div>
            <h1 className="text-3xl text-primary font-semibold">Service Users</h1>
            <p className="text-muted-foreground mt-0.5">Anonymised references used in signal capture, across your services.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search service users by name…"
              className="w-full pl-9 pr-3 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="relative sm:w-64">
            <Layers className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              <option value="all">All sites / services</option>
              {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-2">{patients.length} service user{patients.length === 1 ? "" : "s"}{site !== "all" ? " in this site" : ""}</div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">Loading service users…</div>
          ) : patients.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">No service users found{search ? ` for "${search}"` : ""}.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/30">
                  <th className="py-2.5 px-4">Service User</th>
                  <th className="px-3">Site / Service</th>
                  <th className="px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((g) => (
                  g.rows.map((p, i) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2.5 px-4 font-medium">{p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "—"}</td>
                      <td className="px-3 text-muted-foreground">{i === 0 ? <span className="font-medium text-foreground">{g.name}</span> : g.name}</td>
                      <td className="px-3">
                        <span className={`text-xs rounded px-2 py-0.5 ${p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
