import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { apiClient } from "@/services/api";
import { ShieldAlert } from "lucide-react";

/**
 * Governance Overview decision banner (Nov 2026 brief: "Governance Overview: prompts in Decisions
 * Due", §5 — "Add a banner such as '3 concerns require your decision', linked to the matching
 * outstanding records. Derive it from the same authorised source set as Decisions Due").
 *
 * Reads /guided-work — the exact same read model My Work/Decisions Due itself renders from — so
 * this banner can never disagree with the page it links to. Counts items tagged category
 * 'DECISION' (a role decision the user owns: new signals, candidate risks, pattern/monitoring
 * reviews, escalations) as distinct from 'ASSIGNED' (personally assigned work, already covered by
 * OutstandingActionsBanner). Read-only; never clears/creates anything.
 */
export function DecisionsDueBanner() {
  const navigate = useNavigate();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiClient.get("/guided-work");
        const payload = (res as any)?.data?.data ?? (res as any)?.data ?? null;
        const needsYou = Array.isArray(payload?.needsYou) ? payload.needsYou : [];
        const decisions = needsYou.filter((i: any) => i?.category === "DECISION").length;
        if (active) setCount(decisions);
      } catch { if (active) setCount(null); }
    })();
    return () => { active = false; };
  }, []);

  if (!count) return null;

  return (
    <button
      onClick={() => navigate("/my-work")}
      className="w-full text-left mb-6 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 p-4 flex items-center gap-4 transition-colors"
    >
      <ShieldAlert className="w-6 h-6 text-primary shrink-0" />
      <div className="min-w-0">
        <div className="font-semibold text-primary">{count} concern{count === 1 ? "" : "s"} require{count === 1 ? "s" : ""} your decision</div>
        <div className="text-sm text-muted-foreground">New signals, candidate risks and reviews due — open Decisions Due to work through them.</div>
      </div>
    </button>
  );
}
