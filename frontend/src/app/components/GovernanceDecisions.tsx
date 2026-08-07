import { useEffect, useMemo, useRef, useState } from "react";
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
export function GovernanceDecisions({ houseId, patterns = [] }: { houseId?: string; signals?: any[]; patterns?: any[] }) {
  const [owners, setOwners] = useState<any[]>([]);
  // Signals are fetched PER HOUSE, so a decision is made about this service's own signals.
  const [signals, setSignals] = useState<any[]>([]);
  const [todayList, setTodayList] = useState<any[]>([]);
  const [yList, setYList] = useState<any[]>([]);
  const [ySummary, setYSummary] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  // `source` is "service" | "signal:<id>" | "pattern:<id>" — pins the decision's lineage.
  const [form, setForm] = useState({ what: "", decision: "Create Action" as string, owner_id: "", due_at: "", source: "service" });
  const idemKey = useRef<string | null>(null);

  const loadOwners = async () => {
    try {
      const r: any = await apiClient.get("/users?limit=200");
      const list = r.data?.data || r.data || [];
      setOwners((Array.isArray(list) ? list : list.users || []).filter((u: any) => ["TEAM_LEADER", "REGISTERED_MANAGER", "DIRECTOR"].includes(String(u.role || "").toUpperCase())));
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
  const loadSignals = async () => {
    if (!houseId) { setSignals([]); return; }
    try {
      const r: any = await apiClient.get(`/pulses?house_id=${houseId}&limit=50`);
      const raw = r.data?.data || r.data || [];
      const list = Array.isArray(raw) ? raw : (raw.items || raw.pulses || []);
      // Only signals still awaiting a decision (not linked/closed), newest first so the
      // most recent inflow is easiest to attach a decision to.
      const open = list.filter((s: any) => !["Linked", "Closed"].includes(s.review_status));
      open.sort((a: any, b: any) => new Date(b.created_at || b.entry_date || 0).getTime() - new Date(a.created_at || a.entry_date || 0).getTime());
      setSignals(open);
    } catch { setSignals([]); }
  };
  useEffect(() => { loadOwners(); }, []);
  useEffect(() => { loadDecisions(); loadSignals(); /* eslint-disable-next-line */ }, [houseId]);

  const record = async () => {
    if (form.what.trim().length < 5) { toast.error("Describe the decision."); return; }
    if (!houseId) { toast.error("Choose the service this decision concerns."); return; }
    setBusy(true);
    // Stable key for this submission so a retry/double-click can't create a duplicate.
    if (!idemKey.current) idemKey.current = (crypto?.randomUUID?.() || String(Date.now() + Math.random()));
    try {
      const [kind, sid] = form.source.split(":");
      await apiClient.post("/governance-decisions", {
        house_id: houseId,
        pulse_entry_id: kind === "signal" ? sid : null,
        cluster_id: kind === "pattern" ? sid : null,
        what_is_happening: form.what.trim(),
        decision: form.decision,
        owner_id: form.owner_id || null,
        due_at: form.due_at || null,
        action_description: form.what.trim(),
        idempotency_key: idemKey.current,
      });
      toast.success(form.decision === "Create Action" ? "Decision recorded — task assigned" : "Decision recorded");
      setForm({ what: "", decision: "Create Action", owner_id: "", due_at: "", source: "service" });
      idemKey.current = null;
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
        {(signals.length > 0 || patterns.length > 0) && (
          <div>
            <label className="text-[11px] text-muted-foreground">About (optional — links this decision to its source)</label>
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full mt-1 p-2.5 border-2 border-border rounded-lg bg-background text-sm">
              <option value="service">This service (general)</option>
              {signals.length > 0 && <optgroup label="Signals">
                {signals.map((s: any) => {
                  const dt = s.created_at || s.entry_date;
                  const when = dt ? new Date(dt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
                  const desc = (s.description || "").trim();
                  const kind = s.signal_type || s.governance_domain || "Signal";
                  const person = s.related_person ? ` · ${s.related_person}` : "";
                  return <option key={s.id} value={`signal:${s.id}`}>{when ? `${when} · ` : ""}{kind}{person} — {desc.slice(0, 90)}{desc.length > 90 ? "…" : ""}</option>;
                })}
              </optgroup>}
              {patterns.length > 0 && <optgroup label="Patterns">
                {patterns.slice(0, 12).map((p: any) => {
                  const label = p.cluster_label || p.domain || (Array.isArray(p.risk_domain) ? p.risk_domain[0] : p.risk_domain) || "Pattern";
                  const person = p.linked_person || (p.person && p.person !== "—" ? p.person : "");
                  return <option key={p.id} value={`pattern:${p.id}`}>{label}{person ? ` · ${person}` : ""}</option>;
                })}
              </optgroup>}
            </select>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={form.decision} onChange={(e) => setForm({ ...form, decision: e.target.value })} className="p-2.5 border-2 border-border rounded-lg bg-background text-sm">
            {DECISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} className="p-2.5 border-2 border-border rounded-lg bg-background text-sm" disabled={form.decision === "Close"}>
            <option value="">{form.decision === "Escalate" ? "Escalate to…" : form.decision === "Monitor" ? "Owner (optional)…" : form.decision === "Create Action" ? "Assign to…" : "—"}</option>
            {owners.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({String(u.role || "").replace(/_/g, " ")})</option>)}
          </select>
          <input type="date" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} title={form.decision === "Monitor" ? "Next review date" : form.decision === "Escalate" ? "Respond by" : "Due date"} className="p-2.5 border-2 border-border rounded-lg bg-background text-sm" disabled={form.decision === "Close"} />
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
            {todayList.map((d: any) => {
              const when = d.created_at ? new Date(d.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
              const isClose = String(d.decision || "").toLowerCase().includes("close");
              return (
              <div key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground truncate">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-2">{d.decision}</span>
                  {d.what_is_happening}
                  {isClose
                    ? <span className="text-muted-foreground"> · Closed by {d.recorded_by_name || d.owner_name || "—"}{when ? ` · ${when}` : ""}</span>
                    : <>{d.owner_name ? <span className="text-muted-foreground"> · {d.owner_name}</span> : null}{when ? <span className="text-muted-foreground"> · {when}</span> : null}</>}
                </span>
                <StatusPill s={d.rollup_status} />
              </div>
            );})}
          </div>
        </div>
      )}
    </div>
  );
}

export default GovernanceDecisions;
