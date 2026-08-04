import { useEffect, useState } from "react";
import { ClipboardList, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

// The Team Leader's dedicated "Daily Governance" section — receives the daily brief the
// RM publishes at sign-off (Chapters 2/3). Acknowledging creates the evidence trail.
export function DailyGovernanceInbox() {
  const [briefs, setBriefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await apiClient.get("/governance/daily-log/team-briefs");
      setBriefs(res.data?.data ?? res.data ?? []);
    } catch { setBriefs([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const acknowledge = async (id: string) => {
    setAcking(id);
    try {
      await apiClient.post(`/governance/daily-log/${id}/acknowledge`);
      setBriefs((b) => b.map((x) => x.id === id ? { ...x, acknowledged: true } : x));
      toast.success("Daily Governance Brief acknowledged");
    } catch { toast.error("Couldn't acknowledge the brief"); }
    finally { setAcking(null); }
  };

  const dateOf = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" }) : "";

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 lg:px-10 pt-20 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><ClipboardList size={22} /></div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Daily Governance</h1>
            <p className="text-sm text-muted-foreground">The daily briefs published by your Registered Manager. Acknowledge each one to confirm you've reviewed the day's priorities.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : briefs.length === 0 ? (
          <div className="bg-card border-2 border-border rounded-xl p-10 text-center mt-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3"><CheckCircle2 size={24} className="text-emerald-600" /></div>
            <p className="font-semibold text-foreground">No governance briefs yet</p>
            <p className="text-sm text-muted-foreground mt-1">When your RM signs off a day with new priorities, the brief appears here.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-6">
            {briefs.map((b) => {
              const nothingNew = !b.material_change || !b.team_brief;
              return (
                <div key={b.id} className={`bg-card border-2 rounded-xl p-5 ${nothingNew ? "border-border" : "border-primary/25"}`}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-primary" />
                      <span className="font-semibold text-foreground">{b.house_name || "Service"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{dateOf(b.published_at || b.review_date)}</span>
                  </div>
                  {nothingNew ? (
                    <p className="text-sm text-muted-foreground">No new governance priorities. Continue with existing actions.</p>
                  ) : (
                    <>
                      <div className="text-sm text-foreground leading-6 whitespace-pre-line">{b.team_brief}</div>
                      <div className="mt-4 flex justify-end">
                        {b.acknowledged ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium"><CheckCircle2 size={16} /> Acknowledged</span>
                        ) : (
                          <button onClick={() => acknowledge(b.id)} disabled={acking === b.id} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                            <CheckCircle2 size={16} /> {acking === b.id ? "Confirming…" : "Confirm reviewed"}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyGovernanceInbox;
