import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { ActionEffectivenessPanels } from "./ActionEffectivenessPanels";
import { TrendingUp } from "lucide-react";

// Action Effectiveness page (RM/Director/RI). Completion proves activity, not impact —
// each rating moves the linked risk's trajectory; two Ineffective ratings re-escalate.
export function Effectiveness() {
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
        <ActionEffectivenessPanels />
      </div>
    </div>
  );
}

export default Effectiveness;
