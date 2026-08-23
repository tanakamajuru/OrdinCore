import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import apiClient from "@/services/apiClient";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

const DOT: Record<string, string> = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" };
const ROLE_LABEL: Record<string, string> = { TEAM_LEADER: "Team Leader", REGISTERED_MANAGER: "Registered Manager", SUPPORT_WORKER: "Support Worker", DIRECTOR: "Director", RESPONSIBLE_INDIVIDUAL: "Responsible Individual" };
const PAGE = 10;

// Governance Compliance — its own page (moved off the Daily Oversight board), paginated.
export function GovernanceCompliance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get("/governance/compliance");
        setData((res as any)?.data?.data ?? (res as any)?.data ?? null);
      } catch { setData(null); }
      finally { setLoading(false); }
    })();
  }, []);

  const people: any[] = data?.people ?? [];
  const pages = Math.max(1, Math.ceil(people.length / PAGE));
  const safePage = Math.min(page, pages);
  const paged = people.slice((safePage - 1) * PAGE, safePage * PAGE);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 lg:px-10 pt-20 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><ShieldCheck size={22} /></div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Action Tracker</h1>
            <p className="text-sm text-muted-foreground">Are required actions being done on time? Traffic light per person; oldest overdue action ages up the ladder.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : !data || data.staff_tracked === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center text-muted-foreground mt-6">No staff with tracked actions yet.</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 my-5">
              {([["green", data.green, "On track"], ["amber", data.amber, "1–2 overdue"], ["red", data.red, "3+ overdue"]] as const).map(([tone, n, label]) => (
                <div key={tone} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-border">
                  <span className={`w-2.5 h-2.5 rounded-full ${DOT[tone]}`} /><span className="text-lg font-semibold text-foreground">{n}</span><span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
              {data.overdue_total > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-red-200 bg-red-50 dark:bg-red-950/30">
                  <span className="text-lg font-semibold text-red-700 dark:text-red-400">{data.overdue_total}</span><span className="text-xs text-red-700 dark:text-red-400">actions overdue in total</span>
                </div>
              )}
            </div>

            <div className="bg-card border-2 border-border rounded-xl p-4 space-y-1.5">
              {paged.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT[p.rag]}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">{ROLE_LABEL[p.role] || p.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    {p.overdue > 0 && <span className="text-red-600 font-semibold">{p.overdue} overdue{p.oldest_overdue_days != null ? ` · ${p.oldest_overdue_days}d oldest` : ""}</span>}
                    {p.due_today > 0 && <span className="text-amber-600">{p.due_today} due today</span>}
                    {p.overdue === 0 && p.due_today === 0 && <span className="text-emerald-600">All on time</span>}
                    {p.on_time_rate != null && <span className="text-muted-foreground">{p.on_time_rate}% on-time</span>}
                  </div>
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-50">Previous</button>
                <span className="text-sm text-muted-foreground">Page {safePage} of {pages}</span>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={safePage === pages} className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-50">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default GovernanceCompliance;
