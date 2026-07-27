import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { apiClient } from "@/services/api";
import { AlertTriangle, Clock } from "lucide-react";

/**
 * Daily Outstanding Actions banner (design pack §"Daily Outstanding Actions Dashboard — Highest
 * Priority"). Surfaces the signed-in user's own overdue / due-today work at the top of their
 * workspace so outstanding work is impossible to ignore. Read-only; it links to My Actions.
 *
 * This is the visible half of "prevent new work before old work" — it does not hard-block anything
 * (safeguarding and incidents must never be blocked), it makes the backlog unmissable and nudges
 * completion first.
 */

type Outstanding = { open: number; overdue: number; due_today: number; oldest_overdue_days: number | null };

export function OutstandingActionsBanner() {
  const navigate = useNavigate();
  const [data, setData] = useState<Outstanding | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiClient.get("/governance/my-outstanding");
        const payload = (res as any)?.data?.data ?? (res as any)?.data ?? null;
        if (active) setData(payload);
      } catch { if (active) setData(null); }
    })();
    return () => { active = false; };
  }, []);

  if (!data || (data.overdue === 0 && data.due_today === 0)) return null;
  const urgent = data.overdue > 0;

  return (
    <button
      onClick={() => navigate("/my-actions")}
      className={`w-full text-left mb-6 rounded-xl border-2 p-4 flex items-center gap-4 transition-colors ${
        urgent
          ? "border-red-300 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50"
          : "border-amber-300 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50"
      }`}
    >
      {urgent ? <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" /> : <Clock className="w-6 h-6 text-amber-600 shrink-0" />}
      <div className="min-w-0">
        <div className={`font-semibold ${urgent ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300"}`}>
          {data.overdue > 0 && <>{data.overdue} overdue action{data.overdue === 1 ? "" : "s"}{data.oldest_overdue_days != null ? ` · oldest ${data.oldest_overdue_days} day${data.oldest_overdue_days === 1 ? "" : "s"}` : ""}</>}
          {data.overdue > 0 && data.due_today > 0 && " · "}
          {data.due_today > 0 && <>{data.due_today} due today</>}
        </div>
        <div className="text-sm text-muted-foreground">Please complete or update these before taking on new routine work. Tap to open My Actions.</div>
      </div>
    </button>
  );
}
