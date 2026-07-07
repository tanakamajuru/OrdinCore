import { useEffect, useState } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { ActionEffectivenessPanels } from "./ActionEffectivenessPanels";
import { TrendingUp, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/services/api";

// Action Effectiveness page (RM/Director/RI). Completion proves activity, not impact —
// each rating moves the linked risk's trajectory; two Ineffective ratings re-escalate.
// Finding B: the Resolution Effectiveness Rate (did closed risks stay resolved?) sits on top.
export function Effectiveness() {
  const [rer, setRer] = useState<any>(null);
  useEffect(() => {
    apiClient.get("/risks/metrics/resolution-effectiveness").then((r: any) => setRer(r.data || null)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><TrendingUp size={22} /></div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Action Effectiveness</h1>
            <p className="text-sm text-muted-foreground">Whether completed actions actually reduced risk — ratings feed each risk's trajectory.</p>
          </div>
        </div>

        {rer && (
          <div className="mb-5 bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0"><CheckCircle2 className="w-5 h-5" /></div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Resolution Effectiveness Rate</p>
                <p className="text-sm text-foreground">Of risks closed as resolved, how many stayed resolved (no recurrence in the window) — the Well-Led outcome test.</p>
              </div>
            </div>
            <div className="text-right shrink-0 pl-4">
              <p className="text-2xl font-semibold text-foreground">{rer.rate == null ? "—" : `${rer.rate}%`}</p>
              <p className="text-[11px] text-muted-foreground">{rer.stayed}/{rer.resolved} resolved</p>
            </div>
          </div>
        )}

        <ActionEffectivenessPanels />
      </div>
    </div>
  );
}

export default Effectiveness;
