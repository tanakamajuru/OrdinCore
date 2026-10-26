import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownRight, Minus, Target, X, Loader2, Flag, ArrowRight, CheckCircle2, ShieldAlert, Plus, Link2, AlertTriangle } from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";

const unwrap = (r: any): any => r?.data?.data ?? r?.data ?? r;

// Multiple linked delivery actions per intervention (brief 2 §1). Shows the existing linked actions
// with their canonical delivery evidence, lets the RM link more EXISTING actions (suggested from the
// theme's risks), and unlink — all by stable ID, deduped and audited server-side.
function LinkedActionsManager({ interventionId, theme, canWrite }: { interventionId: string; theme: any; canWrite: boolean }) {
  const [links, setLinks] = useState<any[]>([]);
  const [picking, setPicking] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  // Bug fix (24 Oct developer corrections, "Action retrieval failures appear as empty
  // results"): both catch handlers below replaced a failed request with an empty array, so
  // "No delivery actions linked" / "no candidates" looked identical to a genuine zero-result
  // response when the request had actually failed (network/server error). Track loading and
  // failure explicitly so a failure shows "couldn't load, retry" instead of a false empty state,
  // and never discard a previously-loaded list just because a refresh attempt failed.
  const [linksLoading, setLinksLoading] = useState(true);
  const [linksFailed, setLinksFailed] = useState(false);
  const [candidatesFailed, setCandidatesFailed] = useState(false);
  // 25 Oct brief (P1, "Stop the unrestricted action-picker fallback"): when the theme has no
  // active risk_refs, this used to fall back to EVERY provider action as if all were relevant.
  // Now it shows no candidates by default and says so; widening to the full organisation list
  // is an explicit, separate choice that requires a recorded reason (enforced server-side too).
  const [allActions, setAllActions] = useState<any[]>([]);
  const [widenSearch, setWidenSearch] = useState(false);
  const [wideReason, setWideReason] = useState("");

  const load = async () => {
    setLinksLoading(true); setLinksFailed(false);
    try { setLinks(unwrap(await apiClient.get(`/interventions/${interventionId}/actions`)) || []); }
    catch { setLinksFailed(true); }
    finally { setLinksLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [interventionId]);

  const riskIds = new Set((theme?.risk_refs || []).map((r: any) => String(r.id)));

  const openPicker = async () => {
    setSelected({}); setPicking(true); setCandidatesFailed(false); setWidenSearch(false); setWideReason("");
    try {
      const rows = unwrap(await apiClient.get('/actions/oversight')) || [];
      const linkedIds = new Set(links.map((l: any) => String(l.action_id)));
      const all = (Array.isArray(rows) ? rows : []).filter((a: any) => !linkedIds.has(String(a.id)) && String(a.status) !== 'Cancelled');
      setAllActions(all);
      setCandidates(riskIds.size === 0 ? [] : all.filter((a: any) => riskIds.has(String(a.risk_id))));
    } catch { setCandidatesFailed(true); setCandidates([]); setAllActions([]); }
  };

  const linkSelected = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) { toast.error('Select at least one existing action to link.'); return; }
    if (widenSearch && wideReason.trim().length < 3) { toast.error('Give a reason for linking an action outside this theme.'); return; }
    setBusy(true);
    try {
      setLinks(unwrap(await apiClient.post(`/interventions/${interventionId}/actions`, { action_ids: ids, relevance_reason: widenSearch ? wideReason.trim() : undefined })) || []);
      setPicking(false); toast.success(`Linked ${ids.length} action${ids.length === 1 ? '' : 's'}`);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to link actions'); }
    finally { setBusy(false); }
  };

  const unlink = async (actionId: string) => {
    setBusy(true);
    try { setLinks(unwrap(await apiClient.delete(`/interventions/${interventionId}/actions/${actionId}`)) || []); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to unlink'); }
    finally { setBusy(false); }
  };

  return (
    <div className="mt-3 rounded-lg border border-border p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Linked delivery actions ({links.length})</span>
        {canWrite && !picking && (
          <button onClick={openPicker} className="text-[11px] text-primary flex items-center gap-1 hover:underline"><Plus className="w-3 h-3" /> Link existing action</button>
        )}
      </div>
      {linksLoading ? (
        <p className="text-[11px] text-muted-foreground">Loading…</p>
      ) : linksFailed ? (
        <p className="text-[11px] text-red-600 flex items-center gap-2">
          Couldn't load linked actions. <button onClick={load} className="underline">Retry</button>
        </p>
      ) : links.length === 0 && (
        <p className="text-[11px] text-muted-foreground">No delivery actions linked yet.</p>
      )}
      <div className="space-y-1.5">
        {links.map((l: any) => (
          <div key={l.action_id} className="flex items-start justify-between gap-2 text-xs">
            <div className="min-w-0">
              <p className="text-foreground truncate">{l.title || 'Action'}</p>
              <p className="text-[10px] text-muted-foreground">
                {l.owner || 'Unassigned'} · {l.status}{l.is_completed ? ' · complete' : ''}
                {l.effectiveness ? ` · ${l.effectiveness}` : (l.review_requirement === 'COMPLETION_ONLY' ? ' · no review required' : '')}
              </p>
              {l.relevance_reason && (
                <p className="text-[10px] text-amber-700" title="Linked outside this theme's own risks">Linked for: {l.relevance_reason}</p>
              )}
            </div>
            {canWrite && (
              <button onClick={() => unlink(l.action_id)} disabled={busy} title="Unlink" className="text-muted-foreground hover:text-red-600 shrink-0"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
        ))}
      </div>
      {picking && (
        <div className="mt-2 border-t border-border/60 pt-2">
          <p className="text-[11px] text-muted-foreground mb-1">{riskIds.size ? "Existing actions on this theme's risks" : "This theme has no active risk — no relevant candidates to suggest"} — select to link (no new work is created):</p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {candidatesFailed ? (
              <p className="text-[11px] text-red-600 flex items-center gap-2">
                Couldn't load candidate actions. <button onClick={openPicker} className="underline">Retry</button>
              </p>
            ) : !widenSearch && candidates.length === 0 && (
              <p className="text-[11px] text-muted-foreground">No relevant unlinked actions found for this theme.</p>
            )}
            {(widenSearch ? allActions : candidates).map((a: any) => (
              <label key={a.id} className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={!!selected[a.id]} onChange={(e) => setSelected((s) => ({ ...s, [a.id]: e.target.checked }))} />
                <span className="truncate">{a.title || a.action || 'Action'} <span className="text-[10px] text-muted-foreground">· {a.assigned_to_name || 'Unassigned'} · {a.status}</span></span>
              </label>
            ))}
          </div>
          {/* 25 Oct brief (P1): widening beyond this theme's own risks is a deliberate, explicit
              choice with a recorded reason — never a silent fallback. Server enforces the same
              rule if this is bypassed. */}
          {!candidatesFailed && !widenSearch && (
            <button onClick={() => setWidenSearch(true)} className="mt-1.5 text-[11px] text-muted-foreground underline">Search all organisation actions instead</button>
          )}
          {widenSearch && (
            <div className="mt-1.5">
              <input value={wideReason} onChange={(e) => setWideReason(e.target.value)} placeholder="Why is this action relevant to this theme? *"
                className="w-full text-xs p-1.5 border border-border rounded bg-background" />
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <button onClick={linkSelected} disabled={busy} className="text-[11px] px-2.5 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50">{busy ? 'Linking…' : 'Link selected'}</button>
            <button onClick={() => setPicking(false)} className="text-[11px] px-2.5 py-1 rounded border border-border">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const VERDICTS = [
  "Resolved — controls effective",
  "Resolved — no longer applicable",
  "Tolerated — risk accepted",
];
const IMPACTS = ["High", "Medium", "Low"];
const isClosedStatus = (s?: string) => ["closed", "resolved"].includes(String(s || "").toLowerCase());

// Close / rate the risks that make up a theme, without leaving Intervention Action.
// Impact (High/Medium/Low) is the compulsory judgement of consequence and must be set before a
// risk can close; closure itself is evidence-gated on the backend (open actions / linked
// escalations / effectiveness / trajectory) — we surface that verdict rather than bypassing it.
function CloseRiskManager({ theme, onDone }: { theme: any; onDone: () => void }) {
  const [risks, setRisks] = useState<any[]>(() =>
    (theme.risk_refs || []).filter((r: any) => r?.id && !isClosedStatus(r.status)));
  const [openId, setOpenId] = useState<string | null>(null);
  const [verdict, setVerdict] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const patchLocal = (id: string, patch: any) =>
    setRisks((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const setImpact = async (r: any, impact_rating: string) => {
    setBusy(r.id);
    try {
      await apiClient.patch(`/risks/${r.id}/impact-rating`, { impact_rating });
      patchLocal(r.id, { impact_rating });
      toast.success(`Impact set to ${impact_rating}`);
    } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || "Failed to set impact"); }
    finally { setBusy(null); }
  };

  const closeRisk = async (r: any) => {
    if (!verdict) { toast.error("Choose a resolution verdict."); return; }
    if (reason.trim().length < 20) { toast.error("Rationale must be at least 20 characters."); return; }
    setBusy(r.id);
    try {
      await apiClient.post(`/risks/${r.id}/close`, { verdict, reason: reason.trim() });
      toast.success("Risk closed with a resolution verdict. Recurrence monitoring started (60 days).");
      setRisks((rs) => rs.filter((x) => x.id !== r.id));
      setOpenId(null); setVerdict(""); setReason("");
    } catch (e: any) {
      // The backend closure-review gate returns why it can't close yet (open actions, open linked
      // escalation, effectiveness unrated, deteriorating trajectory) — show it verbatim.
      toast.error(e?.response?.data?.message || e?.message || "This risk can't be closed yet.");
    } finally { setBusy(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onDone}>
      <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground">Close / rate risk — {theme.theme}</h3>
            <p className="text-xs text-muted-foreground">Set the impact, then close with an evidence-based verdict.</p>
          </div>
          <button onClick={onDone} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {risks.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              No open risks left on this theme.
            </div>
          ) : risks.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{r.title || "Risk"}</div>
                  <div className="text-[11px] text-muted-foreground">{r.house_name || "—"}{r.open_actions ? ` · ${r.open_actions} open action${r.open_actions === 1 ? "" : "s"}` : ""}</div>
                </div>
                <span className="text-[10px] rounded px-2 py-0.5 bg-muted shrink-0 uppercase">{r.status || "open"}</span>
              </div>

              {/* Impact — compulsory before close */}
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-muted-foreground">Impact:</span>
                {r.impact_rating ? (
                  <span className="text-xs font-semibold text-foreground">{r.impact_rating}</span>
                ) : IMPACTS.map((lvl) => (
                  <button key={lvl} disabled={busy === r.id} onClick={() => setImpact(r, lvl)}
                    className="text-xs px-2.5 py-1 rounded-md border border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                    {lvl}
                  </button>
                ))}
                {!r.impact_rating && <span className="text-[11px] text-amber-600">· required to close</span>}
              </div>

              {openId === r.id ? (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <select value={verdict} onChange={(e) => setVerdict(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm bg-background">
                    <option value="">Choose a verdict…</option>
                    {VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                    placeholder="Why is this risk being closed, and how do you know it is resolved? (min 20 characters)"
                    className="w-full border border-border rounded-lg p-2 text-sm bg-background resize-none" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setOpenId(null); setVerdict(""); setReason(""); }} className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted">Cancel</button>
                    <button onClick={() => closeRisk(r)} disabled={busy === r.id || !verdict || reason.trim().length < 20}
                      className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5">
                      {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Close risk
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { if (!r.impact_rating) { toast.error("Set the risk impact first."); return; } setOpenId(r.id); setVerdict(""); setReason(""); }}
                  title={r.impact_rating ? "Close this risk with a verdict" : "Set the risk impact first"}
                  className="mt-2.5 text-sm font-medium text-primary hover:underline flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" /> Close this risk
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button onClick={onDone} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Done</button>
        </div>
      </div>
    </div>
  );
}

const DIR = {
  Deteriorating: { Icon: ArrowUpRight, color: "#dc2626", label: "Recorded evidence indicates deterioration" },
  Improving: { Icon: ArrowDownRight, color: "#059669", label: "Recorded evidence indicates improvement" },
  Stable: { Icon: Minus, color: "#d97706", label: "No material change detected" },
  // 25 Oct brief ("Trajectory"): a historical theme's engine result is "Insufficient evidence",
  // not "Stable" — without this entry the lookup fell through to Stable and rendered "No
  // material change detected" for a theme with no active risk to measure at all.
  "Insufficient evidence": { Icon: Minus, color: "#6b7280", label: "No active trajectory — insufficient evidence" },
} as const;

const CONCERN_TONE: Record<string, string> = {
  "Attention": "bg-red-100 text-red-700",
  "Review required": "bg-red-100 text-red-700",
  "Monitor": "bg-amber-100 text-amber-700",
  "Controlled": "bg-emerald-100 text-emerald-700",
  "Ready for closure review": "bg-emerald-100 text-emerald-700",
  "Low concern": "bg-emerald-100 text-emerald-700",
};

const STATUS_TONE: Record<string, string> = {
  "Planned": "bg-slate-100 text-slate-700",
  "In Progress": "bg-blue-100 text-blue-700",
  "Complete": "bg-emerald-100 text-emerald-700",
  "On Hold": "bg-amber-100 text-amber-700",
};

// The 6-week trajectory strip, with the week the intervention began marked.
function Timeline({ weeks }: { weeks: any[] }) {
  const max = Math.max(1, ...weeks.map((w) => Number(w.weight) || 0));
  return (
    <div className="mt-3">
      <div className="flex items-end gap-2 h-16">
        {weeks.map((w, i) => {
          const h = Math.round(((Number(w.weight) || 0) / max) * 100);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              {w.interventionStarted && <Flag className="w-3.5 h-3.5 text-primary mb-0.5" />}
              <div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(6, h)}%`, background: w.interventionStarted ? "#0ea5e9" : undefined }} title={`${w.label}: weight ${w.weight}`} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-1">
        {weeks.map((w, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground leading-tight">
            {w.label.replace("Week ", "W")}
            {w.interventionStarted && <div className="text-[8px] text-primary font-medium">Started</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InterventionPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = String(user?.role || "").toUpperCase().replace(/-/g, "_") === "REGISTERED_MANAGER";
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null); // { theme, intervention record or blank }
  const [saving, setSaving] = useState(false);
  const [closeTheme, setCloseTheme] = useState<any>(null); // theme whose risks are being closed/rated

  const load = async () => {
    setLoading(true);
    try { setThemes(unwrap(await apiClient.get("/interventions/themes")) || []); }
    catch { toast.error("Failed to load governance themes"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  // Keep RM, Director and RI projections aligned. WebSocket gives prompt updates; focus and the
  // 60-second safety poll recover anything missed during disconnection/backgrounding.
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    const base = (import.meta as any).env?.VITE_WS_URL
      || ((import.meta as any).env?.VITE_API_URL || "http://localhost:3001/api/v1").replace(/\/api\/v1\/?$/, "");
    const socket: Socket = io(base, { auth: { token }, transports: ["websocket", "polling"], reconnection: true });
    const refresh = () => load();
    // Refetch only on a real change event. NOT on socket "connect": behind the proxy the websocket
    // reconnects every ~10-15s, and refetch-on-connect turned that into constant self-reloading.
    // The mount effect loads initially; focus + the 60s poll cover resync after a disconnection.
    socket.on("intervention.updated", refresh);
    window.addEventListener("focus", refresh);
    const poll = window.setInterval(refresh, 60_000);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", refresh);
      socket.off("intervention.updated", refresh);
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { apiClient.get("/users/directory").then((r: any) => {
    const list = Array.isArray(r?.data?.data) ? r.data.data : Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.users) ? r.data.users : [];
    setUsers(list);
  }).catch(() => setUsers([])); }, []);

  const openEdit = (t: any) => setEdit({
    theme: t.theme,
    intervention: t.intervention?.intervention || "",
    status: t.intervention?.status || "Planned",
    owner_id: t.intervention?.owner_id || "",
    expected_outcome: t.intervention?.expected_outcome || "",
    review_date: t.intervention?.review_date ? String(t.intervention.review_date).slice(0, 10) : "",
  });

  const save = async () => {
    if (!edit?.intervention?.trim()) { toast.error("Describe the intervention."); return; }
    setSaving(true);
    try {
      const owner = users.find((u) => u.id === edit.owner_id);
      const res: any = await apiClient.post("/interventions", {
        theme: edit.theme,
        intervention: edit.intervention.trim(),
        status: edit.status,
        owner_id: edit.owner_id || null,
        owner_role: owner?.role || null,
        expected_outcome: edit.expected_outcome?.trim() || null,
        review_date: edit.review_date || null,
      });
      const saved = res?.data ?? res;
      setEdit(null);
      // If starting the intervention raised a task on a risk, offer to go action it.
      if (saved?.linked_risk_id) {
        toast.success("Intervention saved — a task was raised on its risk.");
        navigate(`/risk-register/${saved.linked_risk_id}`);
      } else {
        toast.success("Intervention saved");
        load();
      }
    } catch (e: any) { toast.error(e?.message || "Failed to save intervention"); }
    finally { setSaving(false); }
  };

  const attention = useMemo(() => themes.filter((t) => ["Attention", "Review required"].includes(t.concern)).length, [themes]);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2"><Target className="w-6 h-6 text-primary" /> Intervention Action</h1>
          <p className="text-sm text-muted-foreground mt-1">Trajectory-based governance — every theme carries a direction of travel, a leadership response and its measured effect. {attention > 0 && <span className="text-red-600 font-medium">{attention} theme{attention === 1 ? "" : "s"} need attention.</span>}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : themes.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">No active governance themes. Themes appear here once risks are on the register.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {themes.map((t) => {
              const d = (DIR as any)[t.trajectory?.direction] || DIR.Stable;
              const intv = t.intervention;
              return (
                <div key={t.theme} className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{t.theme}</h3>
                      {t.historical ? (
                        <p className="text-xs text-amber-700" title={t.historical_reason}>Historical — no active risk</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t.services} service{t.services === 1 ? "" : "s"} · {t.risks} risk{t.risks === 1 ? "" : "s"}</p>
                      )}
                    </div>
                    <span className={`text-[11px] rounded px-2 py-0.5 shrink-0 ${CONCERN_TONE[t.concern] || "bg-muted"}`}>{t.concern}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2" title={t.trajectory?.basis || ""}>
                    <d.Icon className="w-5 h-5" style={{ color: d.color }} />
                    <span className="text-sm font-semibold" style={{ color: d.color }}>{t.trajectory?.label || d.label}</span>
                  </div>

                  <Timeline weeks={t.timeline || []} />

                  <div className="mt-4 border-t border-border/60 pt-3 flex-1">
                    {intv ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Intervention</span>
                          <span className={`text-[10px] rounded px-2 py-0.5 ${STATUS_TONE[intv.status] || "bg-muted"}`}>{intv.status}</span>
                        </div>
                        <p className="text-sm text-foreground">{intv.intervention}</p>
                        {(() => {
                          const due = intv.review_date ? new Date(intv.review_date) : null;
                          // Bug fix (24 Oct developer corrections, "Overdue display ignores review
                          // completion"): this compared the due date against today with no check
                          // of whether the required effectiveness review had actually happened --
                          // a completed/reviewed plan kept showing overdue forever past its date.
                          // A manually-set status is not proof either; the real signal is a
                          // recorded effectiveness outcome (shown below at intv.effectiveness_review).
                          const reviewCompleted = !!intv.effectiveness_review?.outcome;
                          const overdue = due && !reviewCompleted ? due.setHours(0,0,0,0) < new Date().setHours(0,0,0,0) : false;
                          return (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1">
                              <div><span className="text-foreground font-medium">Owner:</span> {intv.owner_name || intv.owner_role || "—"}</div>
                              {/* Bug fix (24 Oct developer corrections, "Completion count differs
                                  from linked delivery work"): this counts EVERY action on every
                                  active risk in the theme, not just the actions actually linked
                                  to this intervention (that's the separate "Linked delivery
                                  actions" list below) -- labelled explicitly as theme-wide rather
                                  than implying it measures this intervention's own delivery. */}
                              {/* 25 Oct brief ("Counts"): a historical theme hard-codes
                                  openActions/completedActions to 0, which read as "0/0 done"
                                  right beside a genuinely completed linked action below — say
                                  Not applicable instead of implying zero work happened. */}
                              {t.historical ? (
                                <div title="This theme has no active risk, so theme-wide action totals do not apply — see Linked delivery actions below for this plan's own actions.">
                                  <span className="text-foreground font-medium">Theme actions:</span> Not applicable
                                </div>
                              ) : (
                                <div title="Counts every action across all of this theme's active risks, not only actions linked to this plan">
                                  <span className="text-foreground font-medium">Theme actions:</span> {t.completedActions}/{t.openActions + t.completedActions} done
                                </div>
                              )}
                              <div className={overdue ? "text-red-600" : ""}>
                                <span className="text-foreground font-medium">Due:</span> {intv.review_date ? new Date(intv.review_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}{overdue ? " · overdue" : ""}
                              </div>
                              {/* 25 Oct brief ("Dates"): Last reviewed is now an applicable REVIEW
                                  event only (never an edit timestamp); Last updated is shown
                                  separately so an ordinary edit is never mistaken for a review. */}
                              <div><span className="text-foreground font-medium">Last reviewed:</span> {intv.last_reviewed_at ? new Date(intv.last_reviewed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "Not yet reviewed"}</div>
                              <div><span className="text-foreground font-medium">Last updated:</span> {intv.last_updated_at ? new Date(intv.last_updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</div>
                              <div className="col-span-2"><span className="text-foreground font-medium">Expected:</span> {intv.expected_outcome || "—"}</div>
                            </div>
                          );
                        })()}
                        {/* Assigned-action lifecycle — so the RM can see the delegated work has been
                            done and where it is for review / effectiveness. */}
                        {intv.linked_action_stage ? (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            {intv.linked_action_completed_at
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              : <Loader2 className="w-3.5 h-3.5 text-amber-600" />}
                            <span className="text-muted-foreground">Assigned action:</span>
                            <span className={`font-medium ${intv.linked_action_completed_at ? "text-emerald-700" : "text-amber-700"}`}>{intv.linked_action_stage}</span>
                            {intv.linked_action_completed_at && (
                              <span className="text-muted-foreground">· {new Date(intv.linked_action_completed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                            )}
                          </div>
                        ) : (
                          // Fix (24 Oct developer corrections, "Delivery task missing despite
                          // assignment notification"): starting a plan only creates a delivery
                          // action when an eligible cross-service risk or qualifying pattern
                          // exists — otherwise it's saved with no linked_action_id. Previously
                          // this showed nothing at all here, so a saved-but-unlinked plan looked
                          // identical to one still loading. State it explicitly.
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Saved as a plan — no delivery action linked yet (no eligible risk or pattern found).</span>
                          </div>
                        )}
                        {/* Multiple linked delivery actions (brief 2 §1) — the plan's relevant existing
                            actions, with coverage derived from the canonical action state. */}
                        {intv.id && <LinkedActionsManager interventionId={intv.id} theme={t} canWrite={canManage} />}

                        {/* Formal effectiveness — the existing human-reviewed action-effectiveness
                            judgement (Effective / Partially Effective / Not Effective / Too Early).
                            No synthetic Risk-Index percentage is claimed. */}
                        {intv.effectiveness_review?.outcome && (
                          <div className="mt-2 rounded-lg bg-muted/50 p-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Effectiveness (reviewed)</span>
                              <span className={`font-semibold ${
                                intv.effectiveness_review.outcome === "Effective" ? "text-emerald-600"
                                : intv.effectiveness_review.outcome === "Not Effective" ? "text-red-600"
                                : "text-foreground"}`}>{intv.effectiveness_review.outcome}</span>
                            </div>
                            {intv.effectiveness_review.reviewed_at && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">Reviewed {new Date(intv.effectiveness_review.reviewed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</div>
                            )}
                            {intv.effectiveness_review.evidence && (
                              <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap break-words">{intv.effectiveness_review.evidence}</p>
                            )}
                          </div>
                        )}

                        {/* Theme-wide observable 14-day before → after evidence around the intervention start.
                            Signal counts / weighted burden / high-critical — no percentage claim. */}
                        {intv.evidence_comparison && (
                          <div className="mt-2 rounded-lg border border-border p-2.5">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Theme-wide observable evidence (14 days before → after)</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <div className="text-muted-foreground">Before</div>
                                <div className="font-semibold text-foreground">{intv.evidence_comparison.before.signal_count} signals</div>
                                <div className="text-[11px] text-muted-foreground">burden {intv.evidence_comparison.before.weighted_burden} · {intv.evidence_comparison.before.high_or_critical} high/critical</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">After ({intv.evidence_comparison.after.days_observed}d)</div>
                                <div className="font-semibold text-foreground">{intv.evidence_comparison.after.signal_count} signals</div>
                                <div className="text-[11px] text-muted-foreground">burden {intv.evidence_comparison.after.weighted_burden} · {intv.evidence_comparison.after.high_or_critical} high/critical</div>
                              </div>
                            </div>
                            {!intv.evidence_comparison.after_window_complete && (
                              <div className="text-[11px] text-amber-600 mt-1.5">Post-intervention window still in progress — evidence is indicative, not conclusive.</div>
                            )}
                          </div>
                        )}
                        {Array.isArray(intv.oversight_events) && intv.oversight_events.length > 0 && (
                          <div className="mt-2 rounded-lg border border-border p-2.5">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Leadership oversight trail</div>
                            <div className="space-y-2">
                              {intv.oversight_events.map((event: any) => (
                                <div key={event.id} className="text-xs border-l-2 border-primary/40 pl-2">
                                  <div className="font-medium text-foreground">
                                    {String(event.actor_role || "Leadership").replace(/_/g, " ")}
                                    {event.actor_name ? ` · ${event.actor_name}` : ""}
                                  </div>
                                  <div className="text-muted-foreground whitespace-pre-wrap break-words">{event.narrative}</div>
                                  {event.created_at && <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(event.created_at).toLocaleString("en-GB")}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No intervention set — {t.openActions} open action{t.openActions === 1 ? "" : "s"}, {t.completedActions} completed.</p>
                    )}
                  </div>

                  {/* Advisory only: backend readiness rolls up the same canonical risk closure reviews. */}
                  {t.readyToClose && (
                    <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div className="text-xs text-emerald-800">
                        <span className="font-semibold">Ready for closure review.</span> {t.readyToCloseReason}
                      </div>
                    </div>
                  )}
                  {/* 25 Oct brief (P1, "Remove false closure blockers"): a historical card has no
                      active risk to evaluate closure readiness against at all, so this box
                      previously rendered a generic "effectiveness not yet reviewed" / "closure
                      gate" warning as if an open risk had failed a real check. Closure review
                      only applies to a theme with a genuinely open risk. */}
                  {!t.readyToClose && !t.historical && (() => {
                    // Prefer the backend's canonical closure decision (one facade for every
                    // consumer); fall back to the local interpretation only if it is absent.
                    if (t.closure_position?.message) {
                      return (
                        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                          <span className="font-semibold">Not yet ready for closure review.</span>{" "}{t.closure_position.message}
                        </div>
                      );
                    }
                    const outcome = intv?.effectiveness_review?.outcome;
                    const canonicalBlockers = Array.isArray(t.closure_readiness?.risks)
                      ? Array.from(new Set(t.closure_readiness.risks.flatMap((r: any) => r.blockers || []))).join(" ")
                      : "";
                    const message = !intv
                      ? "Set an intervention and its expected outcome before closure can be considered."
                      : !outcome
                        ? "Effectiveness has not yet been reviewed."
                        : outcome === "Too Early To Assess"
                          ? "The observation period is incomplete. Reassess effectiveness when further evidence is available."
                          : outcome === "Not Effective"
                            ? "The intervention did not reduce the risk. Review the control and decide the next action."
                            : outcome === "Partially Effective"
                              ? "The intervention was only partially effective. Further control or review is required."
                              : canonicalBlockers || "One or more underlying risks have not passed the canonical closure gate.";
                    return (
                      <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                        <span className="font-semibold">Not yet ready for closure review.</span>{" "}{message}
                        {outcome !== "Effective" && canonicalBlockers ? ` ${canonicalBlockers}` : ""}
                      </div>
                    );
                  })()}

                  {/* Close / rate the risks that make up this theme, in place. Only shown when the
                      theme still has open risks to act on. */}
                  {canManage && (t.risk_refs || []).some((r: any) => r?.id && !isClosedStatus(r.status)) && (
                    <button onClick={() => setCloseTheme(t)}
                      className={`mt-3 w-full text-sm font-medium rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 ${t.readyToClose ? "text-white bg-emerald-600 hover:bg-emerald-700" : "text-foreground border border-border hover:bg-muted"}`}>
                      <CheckCircle2 className="w-4 h-4" /> Close / rate risk
                    </button>
                  )}

                  <div className="mt-3 flex gap-2">
                    {canManage ? (
                      <button onClick={() => openEdit(t)} className="flex-1 text-sm font-medium text-primary bg-primary/10 rounded-lg px-3 py-2 hover:bg-primary/20">
                        {intv ? "Update intervention" : "Set intervention"}
                      </button>
                    ) : (
                      <div className="flex-1 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                        Assurance view — RM owns the operational intervention record.
                      </div>
                    )}
                    {/* 25 Oct brief ("Navigation"): this previously chose the stored linked risk
                        without checking whether it was still open, so the button could silently
                        open a risk explicitly marked Closed while still saying "Action" as if
                        there were outstanding work. action_target is resolved server-side from
                        the actual canonical risk status; the label and destination now agree —
                        closed-risk access is preserved as history, never implying it needs
                        another closure decision. */}
                    {(() => {
                      const target = t.action_target || { risk_id: null, is_open: false };
                      const riskId = target.risk_id;
                      const label = !riskId ? "Open register" : target.is_open ? "Open active risk" : "View risk history";
                      const title = !riskId
                        ? "No open risk for this theme yet — open the register to add one"
                        : target.is_open
                          ? "Open the risk to complete the action and rate its effectiveness"
                          : "This risk is closed — viewing its history, not an outstanding closure decision";
                      return (
                        <button
                          onClick={() => navigate(riskId ? `/risk-register/${riskId}` : `/risk-register?theme=${encodeURIComponent(t.theme)}`)}
                          title={title}
                          className="text-sm font-medium text-primary-foreground bg-primary rounded-lg px-3 py-2 hover:bg-primary/90 flex items-center gap-1 whitespace-nowrap">
                          {label} <ArrowRight className="w-4 h-4" />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {closeTheme && (
        <CloseRiskManager theme={closeTheme} onDone={() => { setCloseTheme(null); load(); }} />
      )}

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEdit(null)}>
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Intervention — {edit.theme}</h3>
              <p className="text-xs text-muted-foreground">The leadership response to the recorded evidence trajectory. This indicator is not a clinical prediction or confirmation that risk is controlled.</p>
              </div>
              <button onClick={() => setEdit(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Intervention</label>
                <input value={edit.intervention} onChange={(e) => setEdit({ ...edit, intervention: e.target.value })} placeholder="Describe the improvement approach for this theme"
                  className="w-full border border-border rounded-lg p-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-sm bg-background">
                    {["Planned", "In Progress", "Complete", "On Hold"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Owner</label>
                  <select value={edit.owner_id} onChange={(e) => setEdit({ ...edit, owner_id: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-sm bg-background">
                    <option value="">Unassigned</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim()} ({String(u.role || "").replace(/_/g, " ")})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Review date</label>
                <input type="date" value={edit.review_date} onChange={(e) => setEdit({ ...edit, review_date: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-sm bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expected outcome</label>
                <textarea value={edit.expected_outcome} onChange={(e) => setEdit({ ...edit, expected_outcome: e.target.value })} rows={2} placeholder="The measurable improvement this plan should achieve"
                  className="w-full border border-border rounded-lg p-2.5 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex justify-end gap-3">
              <button onClick={() => setEdit(null)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save intervention
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterventionPanel;
