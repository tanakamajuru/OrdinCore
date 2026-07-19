import { useState, useEffect, useMemo } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { Search, Users, Layers } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

interface ServiceUser {
  id: string;
  first_name?: string;
  last_name?: string;
  display_name: string;
  is_active: boolean;
  house_id: string;
  house_name: string;
  vulnerability?: number;
}

const VULN_LABEL: Record<number, string> = { 1: "1 · Low", 2: "2", 3: "3 · Neutral", 4: "4", 5: "5 · High" };
const VULN_TONE: Record<number, string> = { 1: "text-emerald-600", 2: "text-emerald-600", 3: "text-amber-600", 4: "text-orange-600", 5: "text-red-600" };

export function ServiceUsers() {
  const [users, setUsers] = useState<ServiceUser[]>([]);
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
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load service users");
    } finally {
      setIsLoading(false);
    }
  };

  const setVulnerability = async (u: ServiceUser, v: number) => {
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, vulnerability: v } : x));
    try {
      await apiClient.patch(`/service-users/${u.id}`, { vulnerability: v });
      toast.success(`Vulnerability for ${u.display_name} set to ${v}`);
    } catch {
      toast.error("Failed to update vulnerability");
      load();
    }
  };

  // Group by site for a clear, sorted view.
  const grouped = useMemo(() => {
    const m: Record<string, ServiceUser[]> = {};
    for (const u of users) (m[u.house_name || "Unassigned"] = m[u.house_name || "Unassigned"] || []).push(u);
    return Object.keys(m).sort().map((name) => ({ name, rows: m[name] }));
  }, [users]);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Users size={22} /></div>
          <div>
            <h1 className="text-3xl text-foreground font-semibold">Service Users</h1>
            <p className="text-muted-foreground mt-0.5">The people you protect. Record each person's <b>vulnerability</b> (1–5) — the one clinical judgement the Risk Index can't compute. It weights <i>every</i> risk about that person (the V in the score), so a concern about a highly vulnerable person scores higher than the same concern about a resilient one.</p>
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

        <div className="text-xs text-muted-foreground mb-2">{users.length} service user{users.length === 1 ? "" : "s"}{site !== "all" ? " in this site" : ""}</div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">Loading service users…</div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">No service users found{search ? ` for "${search}"` : ""}.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/30">
                  <th className="py-2.5 px-4">Service User</th>
                  <th className="px-3">Site / Service</th>
                  <th className="px-3">Vulnerability</th>
                  <th className="px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((g) => (
                  g.rows.map((u, i) => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2.5 px-4 font-medium">{u.display_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "—"}</td>
                      <td className="px-3 text-muted-foreground">{i === 0 ? <span className="font-medium text-foreground">{g.name}</span> : g.name}</td>
                      <td className="px-3">
                        <select
                          value={u.vulnerability ?? 3}
                          onChange={(e) => setVulnerability(u, Number(e.target.value))}
                          title="Per-person vulnerability (1–5) — feeds the computed Risk Index"
                          className={`text-xs border border-border rounded px-2 py-1 bg-background font-medium ${VULN_TONE[u.vulnerability ?? 3]}`}
                        >
                          {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{VULN_LABEL[v]}</option>)}
                        </select>
                      </td>
                      <td className="px-3">
                        <span className={`text-xs rounded px-2 py-0.5 ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          {u.is_active ? "Active" : "Inactive"}
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
