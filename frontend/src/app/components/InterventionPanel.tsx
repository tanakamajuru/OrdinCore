import { useEffect, useMemo, useState } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownRight, Minus, Target, X, Loader2, Flag } from "lucide-react";

const unwrap = (r: any): any => r?.data?.data ?? r?.data ?? r;

const DIR = {
  Deteriorating: { Icon: ArrowUpRight, color: "#dc2626", label: "Increasing" },
  Improving: { Icon: ArrowDownRight, color: "#059669", label: "Reducing" },
  Stable: { Icon: Minus, color: "#d97706", label: "Stable" },
} as const;

const CONCERN_TONE: Record<string, string> = {
  "Attention": "bg-red-100 text-red-700",
  "Review required": "bg-red-100 text-red-700",
  "Monitor": "bg-amber-100 text-amber-700",
  "Controlled": "bg-emerald-100 text-emerald-700",
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
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null); // { theme, intervention record or blank }
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setThemes(unwrap(await apiClient.get("/interventions/themes")) || []); }
    catch { toast.error("Failed to load governance themes"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { apiClient.get("/users?limit=200").then((r: any) => {
    const list = Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.users) ? r.data.users : [];
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
      await apiClient.post("/interventions", {
        theme: edit.theme,
        intervention: edit.intervention.trim(),
        status: edit.status,
        owner_id: edit.owner_id || null,
        owner_role: owner?.role || null,
        expected_outcome: edit.expected_outcome?.trim() || null,
        review_date: edit.review_date || null,
      });
      toast.success("Intervention saved");
      setEdit(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save intervention"); }
    finally { setSaving(false); }
  };

  const attention = useMemo(() => themes.filter((t) => ["Attention", "Review required"].includes(t.concern)).length, [themes]);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2"><Target className="w-6 h-6 text-primary" /> Intervention Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Trajectory-based governance — every theme carries a direction of travel and a leadership response, not just a count. {attention > 0 && <span className="text-red-600 font-medium">{attention} theme{attention === 1 ? "" : "s"} need attention.</span>}</p>
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
                      <p className="text-xs text-muted-foreground">{t.services} service{t.services === 1 ? "" : "s"} · {t.risks} risk{t.risks === 1 ? "" : "s"}</p>
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
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1">
                          <div><span className="text-foreground font-medium">Owner:</span> {intv.owner_name || intv.owner_role || "—"}</div>
                          <div><span className="text-foreground font-medium">Actions:</span> {t.completedActions}/{t.openActions + t.completedActions} done</div>
                          <div><span className="text-foreground font-medium">Review:</span> {intv.review_date ? new Date(intv.review_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</div>
                          <div><span className="text-foreground font-medium">Risk now:</span> {t.currentRiskIndex ?? "—"}{intv.risk_index_before != null ? ` (was ${intv.risk_index_before})` : ""}</div>
                          <div className="col-span-2"><span className="text-foreground font-medium">Expected:</span> {intv.expected_outcome || "—"}</div>
                          {intv.effectiveness != null && (
                            <div className="col-span-2">
                              <span className="text-foreground font-medium">Effectiveness:</span>{" "}
                              <span className={intv.effectiveness > 0 ? "text-emerald-600 font-semibold" : intv.effectiveness < 0 ? "text-red-600 font-semibold" : ""}>
                                {intv.effectiveness > 0 ? "+" : ""}{intv.effectiveness}% {intv.effectiveness > 0 ? "risk reduced" : intv.effectiveness < 0 ? "risk increased" : "no change"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No intervention set — {t.openActions} open action{t.openActions === 1 ? "" : "s"}, {t.completedActions} completed.</p>
                    )}
                  </div>

                  <button onClick={() => openEdit(t)} className="mt-3 text-sm font-medium text-primary bg-primary/10 rounded-lg px-3 py-2 hover:bg-primary/20">
                    {intv ? "Update intervention" : "Set intervention"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEdit(null)}>
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Intervention — {edit.theme}</h3>
                <p className="text-xs text-muted-foreground">The leadership response to this theme's trajectory.</p>
              </div>
              <button onClick={() => setEdit(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Intervention</label>
                <input value={edit.intervention} onChange={(e) => setEdit({ ...edit, intervention: e.target.value })} placeholder="e.g. Medication audit"
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
                    {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({String(u.role || "").replace(/_/g, " ")})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Review date</label>
                <input type="date" value={edit.review_date} onChange={(e) => setEdit({ ...edit, review_date: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-sm bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expected outcome</label>
                <textarea value={edit.expected_outcome} onChange={(e) => setEdit({ ...edit, expected_outcome: e.target.value })} rows={2} placeholder="e.g. Reduce medication errors by 50%"
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
