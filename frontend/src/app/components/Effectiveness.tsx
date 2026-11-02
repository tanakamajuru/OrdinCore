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
            <p className="text-sm text-muted-foreground">Recorded effectiveness reviews, supporting evidence and scheduled follow-up.</p>
          </div>
        </div>

        {/* 30 Oct 2026 developer correction specification ("Action Effectiveness screen"),
            Step 1 hid this pending the Step 7 recurrence-cohort validation. That validation
            found (2 Nov 2026) that risks.service.ts resolutionEffectivenessRate() tested
            `risks.reopened_at`, a column nothing in the codebase ever writes — so "stayed"
            always equalled "resolved" and the panel was structurally guaranteed to show 100%
            regardless of real recurrence. Fixed to check for a linked successor risk via
            `previous_risk_id` instead (confirmed against production: 3 real recurrences across
            29 mature closures, ~90%, not 100%). Restored, renamed per Step 7 ("If restored
            after validation, rename it Recurrence following risk closure"), with a zero
            denominator reading "Not enough eligible records" (never 100%) and "no linked
            recurrence recorded" rather than "stayed closed" (doctrine: do not present this as
            proof of control, action effectiveness or regulatory assurance).

            Not done: Step 7 also asks to verify "reopened original risks" (no code path ever
            reopens the same risks row — confirmed, nothing to check there) AND "relevant
            subsequent adverse signals/patterns" against a closed risk's domain/person that
            never went through promoteFromCluster/promoteFromCandidate (so would carry no
            previous_risk_id link at all). That third recurrence path is not detected by this
            metric and is left as an explicit, flagged gap rather than guessed at. */}
        {rer && (
          <div className="mb-5 bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0"><CheckCircle2 className="w-5 h-5" /></div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Recurrence following risk closure</p>
                <p className="text-sm text-foreground">Of mature resolved risks (those past the {rer.observation_window_days || 60}-day observation window), how many show a linked recurrence via an explicit successor risk. Not proof of control, action effectiveness or regulatory assurance — secondary to operational reviews.</p>
                {rer.summary && <p className="text-[11px] text-muted-foreground mt-1">{rer.summary}</p>}
              </div>
            </div>
            <div className="text-right shrink-0 pl-4">
              <p className="text-2xl font-semibold text-foreground">{rer.rate == null ? "—" : `No linked recurrence: ${rer.rate}%`}</p>
              <p className="text-[11px] text-muted-foreground">{rer.stayed}/{rer.resolved} mature</p>
              {Number(rer.pending_observation || 0) > 0 && <p className="text-[11px] text-amber-600">{rer.pending_observation} under observation</p>}
              {(rer.evidence_base === 'limited' || rer.evidence_base === 'none') && <p className="text-[11px] text-red-600">Limited evidence base</p>}
            </div>
          </div>
        )}

        <ActionEffectivenessPanels />
      </div>
    </div>
  );
}

export default Effectiveness;
