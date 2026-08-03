import { useEffect, useMemo, useState } from "react";
import { Gavel, Plus, CheckCircle2, Clock, AlertTriangle, Eye, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = () => iso(new Date());
const yesterday = () => iso(new Date(Date.now() - 86400000));

const DECISIONS = ["Create Action", "Monitor", "Escalate", "Close"] as const;

// Chapter 3 — Governance Decisions: the leadership decisions recorded during the Daily
// Governance Review. "Create Action" generates a linked, lineage-carrying task for a
// Team Leader in the existing task system.
export function GovernanceDecisions({ houseId }: { houseId?: string }) {
  const [owners, setOwners] = useState<any[]>([]);
  const [todayList, setTodayList] = useState<any[]>([]);
  const [yList, setYList] = useState<any[]>([]);
  const [ySummary, setYSummary] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ what: "", decision: "Create Action" as string, owner_id: "", due_at: "" });

  const loadOwners = async () => {
    try {
      const r: any = await apiClient.get("/users?limit=200");
      const list = r.data?.data || r.data || [];
      setOwners((Array.isArray(list) ? list : list.users || []).filter((u: any) => ["TEAM_LEADER", "REGISTERED_MANAGER"].includes(String(u.role || "").toUpperCase())));
    } catch { setOwners([]); }
  };
  const loadDecisions = async () => {
    try {
      const [t, y] = await Promise.all([
        apiClient.get(`/governance-decisions?date=${today()}${houseId ? `&house_id=${houseId}` : ""}`),
        apiClient.get(`/governance-decisions?date=${yesterday()}${houseId ? `&house_id=${houseId}` : ""}`),
      ]);
      setTodayList((t.data?.data?.decisions) || []);
      setYList((y.data?.data?.decisions) || []);
      setYSummary(y.data?.data?.summary || null);
    } catch { /* ignore */ }
  };
  useEffect(() => { loadOwners(); }, []);
  useEffect(() => { loadDecisions(); /* eslint-disable-next-line */ }, [houseId]);

  const record = async () => {
    if (form.what.trim().length < 5) { toast.error("Describe the decision."); return; }
    if (!houseId) { toast.error("Choose the service this decision concerns."); return; }
    setBusy(true);
    try {
      await apiClient.post("/governance-decisions", {
        house_id: houseId,
        what_is_happening: form.what.trim(),
        decision: form.decision,
        owner_id: form.owner_id || null,
        due_at: form.due_at || null,
        action_description: form.what.trim(),
      });
      toast.success(form.decision === "Create Action" ? "Decision recorded — task assigned" : "Decision recorded");
      setForm({ what: "", decision: "Create Action", owner_id: "", due_at: "" });
      loadDecisions();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to record decision"); }
    finally { setBusy(false); }
  };

  const StatusPill = ({ s }: { s: string }) => {
    const map: Record<string, { c: string; Icon: any }> = {
      Completed: { c: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
      "In progress": { c: "bg-blue-100 text-blue-700", Icon: Clock },
      Overdue: { c: "bg-red-100 text-red-700", Icon: AlertTriangle },
      Monitoring: { c: "bg-amber-100 text-amber-700", Icon: Eye },
    };
    const m = map[s] || { c: "bg-muted text-muted-foreground", Icon: ArrowRight };
    return <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded ${m.c}`}><m.Icon size={11} />{s}</span>;
  };

  const yHasItems = yList.length > 0;

  return (
    <div className="bg-card border-2 border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Gavel size={18} className="text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Governance Decisions</h2>
      </div>

      {/* Yesterday's decisions — did leadership's decisions get carried out? */}
      {yHasItems && (
        <div className="mb-5 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Yesterday's decisions</span>
            {ySummary && (
              <span className="text-[11px] text-muted-foreground">{ySummary.completed} done · {ySummary.in_progress} in progress · <span className={ySummary.overdue ? "text-red-600 font-medium" : ""}>{ySummary.overdue} overdue</span></span>
            )}
          </div>
          <div className="space-y-1.5">
            {yList.slice(0, 5).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground truncate">{d.what_is_happening}{d.owner_name ? <span className="text-muted-foreground"> · {d.owner_name}</span> : null}</span>
                <StatusPill s={d.rollup_status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision builder */}
      <div className="space-y-3">
        <textarea value={form.what} onChange={(e) => setForm({ ...form, what: e.target.value })} rows={2}
          placeholder="Leadership decision — e.g. Complete a medication audit at this service"
          className="w-full p-2.5 border-2 border-border rounded-lg bg-background text-sm resize-none" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={form.decision} onChange={(e) => setForm({ ...form, decision: e.target.value })} className="p-2.5 border-2 border-border rounded-lg bg-background text-sm">
            {DECISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} className="p-2.5 border-2 border-border rounded-lg bg-background text-sm" disabled={form.decision !== "Create Action"}>
            <option value="">{form.decision === "Create Action" ? "Assign to…" : "—"}</option>
            {owners.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({String(u.role || "").replace(/_/g, " ")})</option>)}
          </select>
          <input type="date" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} className="p-2.5 border-2 border-border rounded-lg bg-background text-sm" disabled={form.decision !== "Create Action"} />
        </div>
        <div className="flex justify-end">
          <button onClick={record} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
            <Plus size={15} /> {busy ? "Recording…" : "Record decision"}
          </button>
        </div>
      </div>

      {/* Today's decisions */}
      {todayList.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="text-xs font-semibold text-foreground mb-2">Today's decisions ({todayList.length})</div>
          <div className="space-y-1.5">
            {todayList.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground truncate">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-2">{d.decision}</span>
                  {d.what_is_happening}{d.owner_name ? <span className="text-muted-foreground"> · {d.owner_name}</span> : null}
                </span>
                <StatusPill s={d.rollup_status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GovernanceDecisions;
