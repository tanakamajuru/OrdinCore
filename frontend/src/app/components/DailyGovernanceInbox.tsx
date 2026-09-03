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
  // Default view is the last 24 hours; a date range widens it. Paginated newest-first.
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

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

  const briefTime = (b: any) => new Date(b.published_at || b.review_date || b.created_at || 0).getTime();
  const usingRange = !!(fromDate || toDate);
  const filtered = [...briefs]
    .sort((a, b) => briefTime(b) - briefTime(a)) // newest first
    .filter((b) => {
      const t = briefTime(b);
      if (usingRange) {
        if (fromDate && t < new Date(fromDate + "T00:00:00").getTime()) return false;
        if (toDate && t > new Date(toDate + "T23:59:59").getTime()) return false;
        return true;
      }
      // Default: only the last 24 hours.
      return Date.now() - t <= 24 * 60 * 60 * 1000;
    });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedBriefs = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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

        {/* Date-range filter — defaults to the last 24 hours until a range is chosen. */}
        <div className="flex flex-wrap items-end gap-4 mt-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">From</label>
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="border border-border rounded-lg p-2 text-sm bg-background" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">To</label>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="border border-border rounded-lg p-2 text-sm bg-background" />
          </div>
          {usingRange ? (
            <button onClick={() => { setFromDate(""); setToDate(""); setPage(1); }} className="text-sm text-primary hover:underline pb-2">Reset to last 24h</button>
          ) : (
            <span className="text-sm text-muted-foreground pb-2">Showing the last 24 hours — pick a range to see earlier briefs.</span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border-2 border-border rounded-xl p-10 text-center mt-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3"><CheckCircle2 size={24} className="text-emerald-600" /></div>
            <p className="font-semibold text-foreground">{usingRange ? "No briefs in this date range" : "No governance briefs in the last 24 hours"}</p>
            <p className="text-sm text-muted-foreground mt-1">{usingRange ? "Try widening the range." : "Pick a date range above to see earlier briefs, or check back when your RM signs off a day."}</p>
          </div>
        ) : (
          <div className="space-y-3 mt-6">
            {pagedBriefs.map((b) => {
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">Prev</button>
                <span className="text-xs text-muted-foreground">Page {safePage} of {totalPages} · {filtered.length} brief{filtered.length === 1 ? "" : "s"}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">Next</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyGovernanceInbox;
