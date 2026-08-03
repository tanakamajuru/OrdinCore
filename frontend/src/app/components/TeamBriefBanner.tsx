import { useEffect, useState } from "react";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

// Chapter 2 — the Daily Governance Brief a Team Leader sees each day.
// If there is a material change, the brief is shown and must be acknowledged (evidence
// that operational leaders were informed). Otherwise a proportionate "nothing new" note.
export function TeamBriefBanner() {
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState(false);

  const load = async () => {
    try {
      const res = await apiClient.get("/governance/daily-log/team-brief");
      setBrief(res.data?.data ?? res.data ?? null);
    } catch { setBrief(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const acknowledge = async () => {
    if (!brief?.id) return;
    setAcking(true);
    try {
      await apiClient.post(`/governance/daily-log/${brief.id}/acknowledge`);
      setBrief({ ...brief, acknowledged: true });
      toast.success("Daily Governance Brief acknowledged");
    } catch { toast.error("Couldn't acknowledge the brief"); }
    finally { setAcking(false); }
  };

  if (loading) return null;

  // No brief published for the TL's service today, or no material change.
  if (!brief || !brief.material_change || !brief.team_brief) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 mb-4 flex items-center gap-3">
        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
        <p className="text-sm text-muted-foreground">No new governance priorities today. Continue with existing actions.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border-2 border-primary/30 rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-primary" />
          <h3 className="font-semibold text-foreground">Daily Governance Brief</h3>
          {brief.house_name && <span className="text-xs text-muted-foreground">· {brief.house_name}</span>}
        </div>
        {brief.published_at && <span className="text-xs text-muted-foreground">{new Date(brief.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</span>}
      </div>
      <div className="text-sm text-foreground leading-6 whitespace-pre-line">{brief.team_brief}</div>
      <div className="mt-4 flex items-center justify-end">
        {brief.acknowledged ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium"><CheckCircle2 size={16} /> Acknowledged</span>
        ) : (
          <button onClick={acknowledge} disabled={acking} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
            <CheckCircle2 size={16} /> {acking ? "Confirming…" : "Confirm reviewed"}
          </button>
        )}
      </div>
    </div>
  );
}

export default TeamBriefBanner;
