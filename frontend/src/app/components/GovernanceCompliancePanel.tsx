import { useEffect, useState } from "react";
import { apiClient } from "@/services/api";
import { ShieldCheck } from "lucide-react";

/**
 * Governance Compliance — the third dimension alongside Risk and Trajectory. Answers "are staff
 * carrying out the required actions within the expected timescales?" with a per-person traffic
 * light and the age of the oldest overdue action. A high-risk service with green compliance is
 * being managed; poor compliance is itself a leadership concern.
 *
 * Read-only. Scoped by the server: a Team Leader sees their own house(s); RM+ see the company.
 */

type Person = {
  id: string; name: string; role: string;
  open: number; overdue: number; due_today: number;
  oldest_overdue_days: number | null; on_time_rate: number | null;
  rag: "green" | "amber" | "red";
};
type Summary = { people: Person[]; red: number; amber: number; green: number; overdue_total: number; staff_tracked: number };

const DOT: Record<string, string> = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" };
const ROLE_LABEL: Record<string, string> = {
  REGISTERED_MANAGER: "Registered Manager", TEAM_LEADER: "Team Leader",
  SUPPORT_WORKER: "Support Worker", DIRECTOR: "Director", RESPONSIBLE_INDIVIDUAL: "Responsible Individual",
};

export function GovernanceCompliancePanel() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiClient.get("/governance/compliance");
        const payload = (res as any)?.data?.data ?? (res as any)?.data ?? null;
        if (active) setData(payload);
      } catch { if (active) setData(null); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  if (loading) return null;
  if (!data || data.staff_tracked === 0) return null;

  return (
    <div className="bg-card border-2 border-border p-6">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={18} className="text-primary" />
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Governance Compliance</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Are the required actions being done on time? Traffic light per person; oldest overdue action ages up the ladder.
      </p>

      {/* Headline traffic-light counts */}
      <div className="flex flex-wrap gap-3 mb-5">
        {([["green", data.green, "On track"], ["amber", data.amber, "1–2 overdue"], ["red", data.red, "3+ overdue"]] as const).map(
          ([tone, n, label]) => (
            <div key={tone} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-border">
              <span className={`w-2.5 h-2.5 rounded-full ${DOT[tone]}`} />
              <span className="text-lg font-semibold text-foreground">{n}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          )
        )}
        {data.overdue_total > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-red-200 bg-red-50 dark:bg-red-950/30">
            <span className="text-lg font-semibold text-red-700 dark:text-red-400">{data.overdue_total}</span>
            <span className="text-xs text-red-700 dark:text-red-400">actions overdue in total</span>
          </div>
        )}
      </div>

      {/* Per-person rows, worst first */}
      <div className="space-y-1.5">
        {data.people.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT[p.rag]}`} />
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">{ROLE_LABEL[p.role] || p.role}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs shrink-0">
              {p.overdue > 0 && (
                <span className="text-red-600 font-semibold">
                  {p.overdue} overdue{p.oldest_overdue_days != null ? ` · ${p.oldest_overdue_days}d oldest` : ""}
                </span>
              )}
              {p.due_today > 0 && <span className="text-amber-600">{p.due_today} due today</span>}
              {p.overdue === 0 && p.due_today === 0 && <span className="text-emerald-600">All on time</span>}
              {p.on_time_rate != null && <span className="text-muted-foreground">{p.on_time_rate}% on-time</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
