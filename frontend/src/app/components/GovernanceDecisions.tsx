import { useEffect, useMemo, useRef, useState } from "react";
import { Gavel, Plus, CheckCircle2, Clock, AlertTriangle, Eye, ArrowRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

const isoDay = (d: any) => { try { return d ? new Date(d).toISOString().slice(0, 10) : ""; } catch { return ""; } };
const previousDay = (date: string) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const DECISIONS = ["Create Action", "Monitor", "Escalate", "Close"] as const;

/**
 * Daily Governance decision builder.
 *
 * Refinement rule: this screen decides ONLY the selected house/date's live signals.
 * Patterns remain in the existing pattern/pipeline architecture and are deliberately not
 * surfaced here. A signal leaves this picker once actioned, escalated, linked or closed.
 * A monitored signal returns only when its recorded review date is due/overdue.
 */
export function GovernanceDecisions({
  houseId,
  reviewDate,
  readOnly = false,
}: {
  houseId?: string;
  reviewDate: string;
  readOnly?: boolean;
}) {
  const [owners, setOwners] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [dayList, setDayList] = useState<any[]>([]);
  const [previousList, setPreviousList] = useState<any[]>([]);
  const [previousSummary, setPreviousSummary] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    what: "",
    decision: "Create Action" as string,
    owner_id: "",
    due_at: "",
    source: "",
  });
  const [srcOpen, setSrcOpen] = useState(false);
  const idemKey = useRef<string | null>(null);

  const fmtWhen = (dt: any) => {
    try {
      return dt ? new Date(dt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
    } catch { return ""; }
  };

  const sourceLabel = () => {
    if (!form.source) return "Choose the signal this decision relates to";
    const sid = form.source.replace("signal:", "");
    const s = signals.find((x: any) => x.id === sid);
    if (!s) return "Signal";
    const person = s.related_person ? `${s.related_person} · ` : "";
    return `${person}${(s.description || "Signal").slice(0, 80)}`;
  };

  const loadOwners = async () => {
    try {
      const r: any = await apiClient.get("/users?limit=200");
      const list = r.data?.data || r.data || [];
      setOwners((Array.isArray(list) ? list : list.users || []).filter((u: any) =>
        ["TEAM_LEADER", "REGISTERED_MANAGER", "DIRECTOR"].includes(String(u.role || "").toUpperCase())
      ));
    } catch { setOwners([]); }
  };

  const loadDecisions = async () => {
    if (!houseId) return;
    try {
      const prior = previousDay(reviewDate);
      const [d, p] = await Promise.all([
        apiClient.get(`/governance-decisions?date=${reviewDate}&house_id=${houseId}`),
        apiClient.get(`/governance-decisions?date=${prior}&house_id=${houseId}`),
      ]);
      setDayList(d.data?.data?.decisions || []);
      setPreviousList(p.data?.data?.decisions || []);
      setPreviousSummary(p.data?.data?.summary || null);
    } catch { /* non-blocking */ }
  };

  const loadSignals = async () => {
    if (!houseId) { setSignals([]); return; }
    try {
      const [sRes, allDecisionsRes] = await Promise.all([
        apiClient.get(`/pulses?house_id=${houseId}&limit=100`),
        apiClient.get(`/governance-decisions?house_id=${houseId}`),
      ]);
      const raw = sRes.data?.data || sRes.data || [];
      const all = Array.isArray(raw) ? raw : (raw.items || raw.pulses || []);
      const decisions = allDecisionsRes.data?.data?.decisions || [];

      // Latest governance decision per source signal. The list is returned newest first.
      const latestByPulse = new Map<string, any>();
      for (const d of decisions) {
        if (d.pulse_entry_id && !latestByPulse.has(d.pulse_entry_id)) latestByPulse.set(d.pulse_entry_id, d);
      }

      const selectedEnd = new Date(`${reviewDate}T23:59:59`);
      const visible = all.filter((s: any) => {
        const status = String(s.review_status || "New");

        // Fresh daily evidence: exact selected house/date only.
        if ((status === "New" || status === "") && isoDay(s.entry_date || s.created_at) === reviewDate) return true;

        // Monitoring is not an indefinite hiding place. It returns to governance only when
        // the latest Monitor decision's review date has arrived or passed.
        if (status === "Monitoring") {
          const latest = latestByPulse.get(s.id);
          if (!latest || latest.decision !== "Monitor" || !latest.due_at) return false;
          return new Date(latest.due_at) <= selectedEnd;
        }
        return false;
      });

      visible.sort((a: any, b: any) => new Date(b.created_at || b.entry_date || 0).getTime() - new Date(a.created_at || a.entry_date || 0).getTime());
      setSignals(visible);

      // Avoid leaving a stale source selected after it has been actioned/closed/escalated.
      if (form.source) {
        const selectedId = form.source.replace("signal:", "");
        if (!visible.some((s: any) => s.id === selectedId)) setForm((f) => ({ ...f, source: "" }));
      }
    } catch { setSignals([]); }
  };

  useEffect(() => { loadOwners(); }, []);
  useEffect(() => {
    loadDecisions();
    loadSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houseId, reviewDate]);

  const record = async () => {
    if (readOnly) return;
    if (!houseId) { toast.error("Choose the service first."); return; }
    if (!form.source) { toast.error("Choose the signal this decision relates to."); return; }
    if (form.what.trim().length < 5) { toast.error("Describe the governance decision."); return; }
    if (form.decision === "Monitor" && !form.due_at) {
      toast.error("Monitoring requires a next review date.");
      return;
    }

    setBusy(true);
    if (!idemKey.current) idemKey.current = (crypto?.randomUUID?.() || String(Date.now() + Math.random()));
    try {
      const sid = form.source.replace("signal:", "");
      await apiClient.post("/governance-decisions", {
        house_id: houseId,
        pulse_entry_id: sid,
        what_is_happening: form.what.trim(),
        decision: form.decision,
        owner_id: form.owner_id || null,
        due_at: form.due_at || null,
        action_description: form.what.trim(),
        idempotency_key: idemKey.current,
      });
      toast.success(form.decision === "Create Action" ? "Decision recorded — action assigned" : "Decision recorded");
      setForm({ what: "", decision: "Create Action", owner_id: "", due_at: "", source: "" });
      idemKey.current = null;
      await Promise.all([loadDecisions(), loadSignals()]);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to record decision");
    } finally { setBusy(false); }
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

  const previousHasItems = previousList.length > 0;
  const selectedSignal = useMemo(() => signals.find((s: any) => `signal:${s.id}` === form.source), [signals, form.source]);

  return (
    <div className="bg-card border-2 border-border rounded-xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Gavel size={18} className="text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Governance Decisions</h2>
        </div>
        <span className="text-xs text-muted-foreground">{signals.length} signal{signals.length === 1 ? "" : "s"} awaiting / due for review</span>
      </div>

      {previousHasItems && (
        <div className="mb-5 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Previous day's decisions</span>
            {previousSummary && (
              <span className="text-[11px] text-muted-foreground">
                {previousSummary.completed} done · {previousSummary.in_progress} in progress · <span className={previousSummary.overdue ? "text-red-600 font-medium" : ""}>{previousSummary.overdue} overdue</span>
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {previousList.slice(0, 5).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground truncate">{d.source_related_person ? `${d.source_related_person} · ` : ""}{d.what_is_happening}{d.owner_name ? <span className="text-muted-foreground"> · {d.owner_name}</span> : null}</span>
                <StatusPill s={d.rollup_status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {readOnly ? (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">This governance date has already been signed off. Decisions are shown as historical evidence and cannot be changed here.</div>
      ) : signals.length === 0 ? (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">No undecided signals or monitoring reviews are due for this service on this date.</div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <label className="text-[11px] text-muted-foreground">Related to · current signal</label>
            <button type="button" onClick={() => setSrcOpen((o) => !o)}
              className="w-full mt-1 p-2.5 border-2 border-border rounded-lg bg-background text-sm text-left flex items-center justify-between gap-2">
              <span className="truncate">{sourceLabel()}</span>
              <ChevronDown size={15} className="shrink-0 opacity-60" />
            </button>
            {srcOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSrcOpen(false)} />
                <div className="absolute z-20 mt-1 w-full max-h-96 overflow-y-auto rounded-lg border-2 border-border bg-background shadow-lg">
                  {signals.map((s: any) => {
                    const kind = s.governance_domain || s.signal_type || "Signal";
                    const when = fmtWhen(s.created_at || s.entry_date);
                    const monitoringDue = String(s.review_status) === "Monitoring";
                    return (
                      <button key={s.id} type="button" onClick={() => { setForm({ ...form, source: `signal:${s.id}` }); setSrcOpen(false); }}
                        className={`w-full text-left px-3 py-2 border-t first:border-t-0 border-border/40 hover:bg-muted ${form.source === `signal:${s.id}` ? "bg-primary/5" : ""}`}>
                        <div className="text-[11px] text-muted-foreground">{monitoringDue ? "Monitoring review due · " : ""}{when}{s.related_person ? ` · ${s.related_person}` : ""} · {kind}</div>
                        <div className="text-sm text-foreground whitespace-pre-wrap break-words">{(s.description || "—").trim()}</div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {selectedSignal && (
            <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Signal context:</span> {selectedSignal.related_person ? `${selectedSignal.related_person} · ` : ""}{selectedSignal.governance_domain || selectedSignal.signal_type || "Signal"} · {selectedSignal.description || "—"}
            </div>
          )}

          <textarea value={form.what} onChange={(e) => setForm({ ...form, what: e.target.value })} rows={2}
            placeholder="Record the management decision and what is required next."
            className="w-full p-2.5 border-2 border-border rounded-lg bg-background text-sm resize-none" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select value={form.decision} onChange={(e) => setForm({ ...form, decision: e.target.value })} className="p-2.5 border-2 border-border rounded-lg bg-background text-sm">
              {DECISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} className="p-2.5 border-2 border-border rounded-lg bg-background text-sm" disabled={form.decision === "Close"}>
              <option value="">{form.decision === "Escalate" ? "Escalate to…" : form.decision === "Monitor" ? "Owner (optional)…" : "Assign to…"}</option>
              {owners.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({String(u.role || "").replace(/_/g, " ")})</option>)}
            </select>
            <input type="date" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })}
              title={form.decision === "Monitor" ? "Next monitoring review date" : form.decision === "Escalate" ? "Response due" : "Action due date"}
              className="p-2.5 border-2 border-border rounded-lg bg-background text-sm" disabled={form.decision === "Close"} />
          </div>
          {form.decision === "Monitor" && <p className="text-[11px] text-muted-foreground">Monitor requires a review date. The signal leaves the live queue now and returns when that review date is due.</p>}

          <div className="flex justify-end">
            <button onClick={record} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
              <Plus size={15} /> {busy ? "Recording…" : "Record decision"}
            </button>
          </div>
        </div>
      )}

      {dayList.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="text-xs font-semibold text-foreground mb-2">Decisions for this date ({dayList.length})</div>
          <div className="space-y-1.5">
            {dayList.map((d: any) => {
              const when = d.created_at ? new Date(d.created_at).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
              return (
                <div key={d.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-foreground truncate">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-2">{d.decision}</span>
                    {d.source_related_person ? `${d.source_related_person} · ` : ""}{d.what_is_happening}
                    {d.owner_name ? <span className="text-muted-foreground"> · {d.owner_name}</span> : null}
                    {when ? <span className="text-muted-foreground"> · {when}</span> : null}
                  </span>
                  <StatusPill s={d.rollup_status} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default GovernanceDecisions;
