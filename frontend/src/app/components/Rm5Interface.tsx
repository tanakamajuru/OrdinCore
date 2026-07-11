import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import {
  Home, GitBranch, FileText, Ambulance, FileDown, ChevronRight, ChevronLeft, Zap, Layers,
  ShieldAlert, ClipboardList, TrendingUp, Network, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { apiClient } from "@/services/api";
import { toast } from "sonner";

/* Stage 4: the RM 5-screen interface (pipeline spine), wired to the live /api/rm BFF and
   the existing detail/promote/weekly/reports screens for actions. Parallel route (/rm5) —
   not the default RM interface until QA'd per role. */

const TRAJ: Record<string, { c: string; I: any }> = {
  Deteriorating: { c: "#dc2626", I: ArrowUpRight },
  Stable: { c: "#64748b", I: Minus },
  Improving: { c: "#059669", I: ArrowDownRight },
};
const SEV: Record<string, string> = {
  Critical: "bg-red-50 text-red-700", High: "bg-orange-50 text-orange-700",
  Medium: "bg-amber-50 text-amber-700", Moderate: "bg-amber-50 text-amber-700", Low: "bg-emerald-50 text-emerald-700",
};
const unwrap = (r: any) => r?.data?.data ?? r?.data ?? r;
const PAGE = 5; // rows/cards per page across every RM5 list

// Shared Prev/Next footer — hidden when everything fits on one page.
function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-3">
      <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 text-sm text-primary disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" />Prev</button>
      <span className="text-xs text-muted-foreground">Page {page} of {pages} · {total} items</span>
      <button onClick={() => onPage(Math.min(pages, page + 1))} disabled={page >= pages} className="inline-flex items-center gap-1 text-sm text-primary disabled:opacity-40 disabled:cursor-not-allowed">Next<ChevronRight className="w-4 h-4" /></button>
    </div>
  );
}

function Traj({ t }: { t: any }) {
  const x = TRAJ[t?.dir] || TRAJ.Stable; const I = x.I;
  return <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: x.c }} title={t?.basis || ""}><I className="w-3.5 h-3.5" />{t?.dir || "Stable"}</span>;
}
const Sev = ({ s }: { s: string }) => <span className={`text-[11px] rounded px-1.5 py-0.5 ${SEV[s] || SEV.Low}`}>{s}</span>;

function GovHead({ q, sub }: { q: string; sub?: string }) {
  return <div className="mb-5"><p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-1">Governance question</p><h1 className="text-xl font-semibold text-foreground">{q}</h1>{sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}</div>;
}

export function Rm5Interface({ initialScreen = "today" }: { initialScreen?: "today" | "pipeline" }) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<string>(initialScreen);
  const [stage, setStage] = useState("patterns");
  const [counts, setCounts] = useState<any>({});
  const [today, setToday] = useState<any>({ todaySignals: [], actionsDue: [] });
  const [patterns, setPatterns] = useState<any>({ within: [], across: [] });
  const [registerRows, setRegisterRows] = useState<any[]>([]);
  const [regType, setRegType] = useState<"active" | "strategic" | "closed">("active");
  const [lens, setLens] = useState<any[]>([]);
  const [lensPage, setLensPage] = useState(1);
  const [sigPage, setSigPage] = useState(1);
  const [duePage, setDuePage] = useState(1);
  const [patWPage, setPatWPage] = useState(1);
  const [patAPage, setPatAPage] = useState(1);
  const [regPage, setRegPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/rm/counts").then((r) => setCounts(unwrap(r) || {})).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        if (screen === "today") setToday(unwrap(await apiClient.get("/rm/today")) || { todaySignals: [], actionsDue: [] });
        else if (screen === "pipeline" && stage === "patterns") setPatterns(unwrap(await apiClient.get("/rm/patterns")) || { within: [], across: [] });
        else if (screen === "pipeline" && stage === "register") setRegisterRows(unwrap(await apiClient.get(`/rm/register?type=${regType}`)) || []);
        else if (screen === "pipeline" && stage === "actions") setLens(unwrap(await apiClient.get("/rm/actions")) || []);
        else if (screen === "pipeline" && stage === "effectiveness") setLens(unwrap(await apiClient.get("/rm/effectiveness")) || []);
      } catch { toast.error("Failed to load"); }
      finally { setLoading(false); }
    };
    load();
  }, [screen, stage, regType]);

  // Reset the paginators whenever we switch into a different list.
  useEffect(() => { setLensPage(1); setPatWPage(1); setPatAPage(1); }, [screen, stage]);
  useEffect(() => { setSigPage(1); setDuePage(1); }, [screen]);
  useEffect(() => { setRegPage(1); }, [regType, screen, stage]);

  const activeStage = screen === "today" ? "signals" : stage;
  const ribbon: [string, string, number, any][] = [
    ["signals", "Signals", counts.signals || 0, Zap], ["patterns", "Patterns", counts.patterns || 0, Layers],
    ["risks", "Risks", counts.risks || 0, ShieldAlert], ["actions", "Actions", counts.actions || 0, ClipboardList],
    ["effectiveness", "Effectiveness", counts.effectiveness || 0, TrendingUp],
  ];
  const ribbonGo = (k: string) => {
    if (k === "signals") { setScreen("today"); return; }
    setScreen("pipeline"); setStage(k === "risks" ? "register" : k);
  };
  const openRisk = (id: string) => id && navigate(`/risk-register/${id}`);
  const promote = (p: any) => p.promotedRiskId ? openRisk(p.promotedRiskId) : navigate(`/risks/promote?cluster_id=${p.id}`, { state: { cluster_id: p.id } });

  const lensTotalPages = Math.max(1, Math.ceil(lens.length / PAGE));
  const lensPageSafe = Math.min(lensPage, lensTotalPages);
  const pagedLens = lens.slice((lensPageSafe - 1) * PAGE, lensPageSafe * PAGE);

  const sigList: any[] = today.todaySignals || [];
  const sigPages = Math.max(1, Math.ceil(sigList.length / PAGE));
  const sigSafe = Math.min(sigPage, sigPages);
  const pagedSignals = sigList.slice((sigSafe - 1) * PAGE, sigSafe * PAGE);

  const dueList: any[] = today.actionsDue || [];
  const duePages = Math.max(1, Math.ceil(dueList.length / PAGE));
  const dueSafe = Math.min(duePage, duePages);
  const pagedDue = dueList.slice((dueSafe - 1) * PAGE, dueSafe * PAGE);

  const withinList: any[] = patterns.within || [];
  const withinPages = Math.max(1, Math.ceil(withinList.length / PAGE));
  const withinSafe = Math.min(patWPage, withinPages);
  const pagedWithin = withinList.slice((withinSafe - 1) * PAGE, withinSafe * PAGE);

  const acrossList: any[] = patterns.across || [];
  const acrossPages = Math.max(1, Math.ceil(acrossList.length / PAGE));
  const acrossSafe = Math.min(patAPage, acrossPages);
  const pagedAcross = acrossList.slice((acrossSafe - 1) * PAGE, acrossSafe * PAGE);

  const regPages = Math.max(1, Math.ceil(registerRows.length / PAGE));
  const regSafe = Math.min(regPage, regPages);
  const pagedReg = registerRows.slice((regSafe - 1) * PAGE, regSafe * PAGE);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 pt-20 w-full">
        {/* ribbon (the pipeline spine) */}
        <div className="bg-card border border-border rounded-xl px-2 py-3 flex items-stretch mb-6 overflow-x-auto">
          {ribbon.map(([k, l, n, I], i) => {
            const on = activeStage === k;
            return <div key={k} className="flex items-center">
              <button onClick={() => ribbonGo(k)} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${on ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                <span className={`p-1.5 rounded-lg ${on ? "bg-white/20" : "bg-muted"}`}><I className="w-4 h-4" style={{ color: on ? "#fff" : undefined }} /></span>
                <span className="text-left"><span className="block text-lg font-semibold leading-none">{n}</span><span className={`block text-[11px] ${on ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{l}</span></span>
              </button>
              {i < ribbon.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground/40 mx-0.5 shrink-0" />}
            </div>;
          })}
        </div>

        {loading && <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}

        {!loading && screen === "today" && (
          <div>
            <GovHead q="What needs me now?" sub="Today's high-priority signals (48h) and everything open against me — each links to its risk." />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-red-600" />High-priority signals</h2>
                <div className="bg-card border border-border rounded-xl divide-y divide-border">
                  {sigList.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No High/Critical signals in the last 48 hours.</div>}
                  {pagedSignals.map((s: any) => (
                    <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0"><div className="text-sm text-foreground truncate">{s.house} · {s.person}</div><div className="text-xs text-muted-foreground truncate">{s.note}</div></div>
                      <div className="flex items-center gap-2 shrink-0"><Sev s={s.sev} /><span className="text-xs text-muted-foreground">{s.d}</span></div>
                    </div>
                  ))}
                </div>
                <Pager page={sigSafe} pages={sigPages} total={sigList.length} onPage={setSigPage} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" />Actions due (all assignees)</h2>
                <div className="bg-card border border-border rounded-xl divide-y divide-border">
                  {dueList.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No open actions.</div>}
                  {pagedDue.map((a: any) => (
                    <button key={a.id} onClick={() => openRisk(a.riskId)} className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/40">
                      <div className="min-w-0"><div className="text-sm text-foreground truncate">{a.title}</div><div className="text-xs text-muted-foreground">{a.assignee} · due {a.due}</div></div>
                      <span className={`text-[10px] uppercase px-2 py-1 rounded ${a.status === "Overdue" ? "bg-red-600 text-white" : "bg-amber-100 text-amber-700"}`}>{a.status}</span>
                    </button>
                  ))}
                </div>
                <Pager page={dueSafe} pages={duePages} total={dueList.length} onPage={setDuePage} />
              </div>
            </div>
          </div>
        )}

        {!loading && screen === "pipeline" && stage === "patterns" && (
          <div>
            <GovHead q="Which patterns need my decision?" sub="System proposes, you decide — nothing is promoted automatically." />
            <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Layers className="w-4 h-4 text-primary" />Within a service</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {withinList.length === 0 && <p className="text-sm text-muted-foreground">No forming patterns.</p>}
              {pagedWithin.map((p: any) => <PatternCard key={p.id} p={p} onPromote={promote} />)}
            </div>
            <Pager page={withinSafe} pages={withinPages} total={withinList.length} onPage={setPatWPage} />
            <h2 className="text-sm font-semibold text-foreground mb-1 mt-6 flex items-center gap-2"><Network className="w-4 h-4 text-indigo-600" />Across services — systemic</h2>
            <p className="text-xs text-muted-foreground mb-2">The same theme in more than one service — what an inspector means by systemic.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {acrossList.length === 0 && <p className="text-sm text-muted-foreground">No cross-service patterns detected.</p>}
              {pagedAcross.map((p: any) => <PatternCard key={p.id} p={p} onPromote={promote} />)}
            </div>
            <Pager page={acrossSafe} pages={acrossPages} total={acrossList.length} onPage={setPatAPage} />
          </div>
        )}

        {!loading && screen === "pipeline" && stage === "register" && (
          <div>
            <GovHead q="What am I actively overseeing?" sub="Open a risk to see everything about it in one place." />
            <div className="flex gap-1 border-b border-border mb-4">
              {(["active", "strategic", "closed"] as const).map((t) => (
                <button key={t} onClick={() => setRegType(t)} className={`px-4 py-2 text-sm -mb-px border-b-2 capitalize ${regType === t ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
              ))}
            </div>
            <div className="space-y-2">
              {registerRows.length === 0 && <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">Nothing here.</div>}
              {pagedReg.map((r: any) => (
                <button key={r.id} onClick={() => openRisk(r.id)} className="w-full text-left bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 hover:border-primary/40">
                  <div className="min-w-0"><div className="text-sm font-medium text-foreground truncate">{r.theme}{r.person !== "—" ? ` · ${r.person}` : ""}</div><div className="text-xs text-muted-foreground">{r.houses.join(", ") || "—"} · {r.openActions} open action(s)</div></div>
                  <div className="flex items-center gap-3 shrink-0"><Traj t={r.trajectory} /><ChevronRight className="w-4 h-4 text-muted-foreground/40" /></div>
                </button>
              ))}
            </div>
            <Pager page={regSafe} pages={regPages} total={registerRows.length} onPage={setRegPage} />
          </div>
        )}

        {!loading && screen === "pipeline" && (stage === "actions" || stage === "effectiveness") && (
          <div>
            <GovHead q={stage === "actions" ? "Is delegated work getting done across my services?" : "Which controls are due a verdict — and are they working?"} sub="A view, not a second copy — each item belongs to a risk. Open it there." />
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {lens.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Nothing here.</div>}
              {pagedLens.map((row: any) => (
                <button key={row.key} onClick={() => openRisk(row.riskId)} className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/40">
                  <div className="min-w-0"><div className="text-sm text-foreground truncate">{row.title}</div><div className="text-xs text-muted-foreground truncate">{row.meta}</div></div>
                  {stage === "actions" ? <span className={`text-[10px] uppercase px-2 py-1 rounded ${row.status === "Overdue" ? "bg-red-600 text-white" : "bg-amber-100 text-amber-700"}`}>{row.status}</span> : <span className="text-xs text-primary">Rate →</span>}
                </button>
              ))}
            </div>
            <Pager page={lensPageSafe} pages={lensTotalPages} total={lens.length} onPage={setLensPage} />
          </div>
        )}

      </div>
    </div>
  );
}

function PatternCard({ p, onPromote }: { p: any; onPromote: (p: any) => void }) {
  const ready = p.signalCount >= p.threshold || p.hasCritical;
  return (
    <div className="bg-card border-2 rounded-xl p-4" style={{ borderColor: p.scope === "cross_service" ? "#c7d2fe" : ready ? "#6ee7b7" : "var(--border, #e2e8f0)" }}>
      <div className="flex items-start justify-between gap-2"><span className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{p.domain}</span><Traj t={p.trajectory} /></div>
      <div className="text-sm font-medium text-foreground mt-0.5">{p.person !== "—" ? `${p.person} · ` : ""}{p.scope === "cross_service" ? `${p.houses.length} services` : (p.houses[0] || "—")}</div>
      {p.scope === "cross_service" && <div className="text-[11px] text-indigo-600 mt-0.5 flex items-center gap-1"><Network className="w-3 h-3" />{p.houses.join(" · ")}</div>}
      <div className="flex gap-1 mt-2 mb-1">{Array.from({ length: p.threshold }).map((_, i) => <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < Math.min(p.signalCount, p.threshold) ? (ready ? "#059669" : "#0e7490") : "#e5e7eb" }} />)}</div>
      <p className="text-[11px] text-muted-foreground mb-2">{p.hasCritical && p.signalCount < p.threshold ? "Critical — ready" : ready ? "Threshold met — ready to promote" : p.isWatch ? "Watch — 1 signal (not yet a pattern)" : `${p.signalCount} of ${p.threshold} signals`}</p>
      {p.promotedRiskId ? (
        <div className="flex gap-2">
          <button onClick={() => onPromote(p)} className="flex-1 text-xs font-medium text-primary bg-primary/10 rounded px-2.5 py-1.5 hover:bg-primary/20">View risk</button>
        </div>
      ) : ready ? (
        <div className="flex gap-2">
          <button onClick={() => onPromote(p)} className="flex-1 text-xs font-medium text-primary-foreground bg-primary rounded px-2.5 py-1.5 hover:bg-primary/90">Promote to risk</button>
        </div>
      ) : (
        <button disabled className="w-full text-xs font-medium text-muted-foreground bg-muted rounded px-2.5 py-1.5 cursor-not-allowed">{p.signalCount} of {p.threshold} signals</button>
      )}
    </div>
  );
}

export default Rm5Interface;
