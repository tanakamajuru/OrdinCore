import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Home, Users, Building2, UsersRound, SlidersHorizontal, ShieldCheck, Database, HelpCircle,
  Shield, Lock, Calendar, AlertTriangle, ChevronRight, UserPlus, ArrowLeftRight, KeyRound,
  RefreshCw, CheckCircle2, UserX, FileDown, ArrowRight,
} from "lucide-react";
import apiClient from "@/services/apiClient";

type Overview = {
  company: string;
  stats: { active_users: number; services: number; access_reviews_due: number; security_alerts: number };
  attention: { access_reviews_due: number; inactive_assigned: number; failed_login_alerts: number; accounts_without_mfa: number };
  assignments: { id: string; name: string; service_type: string; staff: number }[];
  activity: { id: string; actor: string; text: string; at: string }[];
  security: { mfa_required: boolean; session_timeout_minutes: number; exports_restricted: boolean };
};
type AccessReview = {
  id: string; status: string; reason: string; due_at: string;
  user_id: string; user_name: string; email: string; role: string; account_status: string; last_login: string | null;
};
type Section = "overview" | "security" | "retention";

const initials = (name: string) => (name || "?").split(" ").filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("") || "?";
const ago = (iso: string) => {
  if (!iso) return "";
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24); return `${d} day${d > 1 ? "s" : ""} ago`;
};

export default function OrganisationAdmin() {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("overview");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/company-admin/overview");
      setData(res.data?.data || null);
    } catch { toast.error("Failed to load the admin overview."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const NAV: { key: Section | "link"; label: string; icon: any; to?: string }[] = [
    { key: "overview", label: "Overview", icon: Home },
    { key: "link", label: "People & Access", icon: Users, to: "/admin-users" },
    { key: "link", label: "Services", icon: Building2, to: "/admin/houses" },
    { key: "link", label: "Service Users", icon: UsersRound, to: "/admin/service-users" },
    { key: "link", label: "Governance Configuration", icon: SlidersHorizontal, to: "/governance-config" },
    { key: "security", label: "Audit & Security", icon: ShieldCheck },
    { key: "retention", label: "Data & Retention", icon: Database },
    { key: "link", label: "Help", icon: HelpCircle, to: "/help-admin" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="ordin-sidebar w-64 shrink-0 min-h-screen flex flex-col text-[#D9E8F3]" style={{ background: "linear-gradient(180deg,#0D2944,#081B2E)" }}>
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-primary/90 flex items-center justify-center"><Shield size={18} className="text-white" /></div>
          <div><div className="font-bold tracking-tight text-white leading-none">ORDIN <span className="font-light">CORE</span></div><div className="text-[10px] text-sky-200/70 mt-0.5">Safer care. Stronger organisations.</div></div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n, i) => {
            const active = n.key !== "link" && section === n.key;
            return (
              <button key={i} onClick={() => n.key === "link" ? navigate(n.to!) : setSection(n.key as Section)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-primary text-white shadow-[inset_3px_0_0_#71C4EE]" : "text-sky-100/80 hover:bg-white/8 hover:text-white"}`}>
                <n.icon size={18} strokeWidth={1.8} /> {n.label}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-4 text-[11px] text-sky-200/50 leading-snug">Good governance<br />brighter tomorrows.</div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-[1200px]">
        <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Organisation Administration</h1>
            <p className="text-muted-foreground mt-1"><span className="font-semibold text-foreground/80">{data?.company || "…"}</span> · Provider workspace</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-sm font-semibold"><Shield size={15} /> Company Admin</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-700 px-3 py-1.5 text-sm font-semibold border border-emerald-200"><Lock size={14} /> Tenant isolated</span>
          </div>
        </header>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex items-center gap-3 mb-6">
          <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
          <span className="text-sm text-emerald-900">You can only view and manage <strong>{data?.company || "your organisation"}</strong></span>
        </div>

        {loading ? <div className="py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          : section === "overview" ? <OverviewSection data={data} navigate={navigate} reload={load} />
          : section === "security" ? <SecuritySection data={data} onChanged={load} />
          : <RetentionSection data={data} />}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, tint, label, value }: { icon: any; tint: string; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tint}`}><Icon size={22} /></div>
      <div><div className="text-sm text-muted-foreground">{label}</div><div className="text-3xl font-bold text-foreground leading-tight">{value}</div></div>
    </div>
  );
}

function Panel({ title, children, onMore }: { title: string; children: any; onMore?: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {onMore && <button onClick={onMore} className="text-muted-foreground hover:text-primary"><ChevronRight size={18} /></button>}
      </div>
      {children}
    </div>
  );
}

function OverviewSection({ data, navigate, reload }: { data: Overview | null; navigate: (p: string) => void; reload: () => void }) {
  if (!data) return null;
  const a = data.attention;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} tint="bg-blue-100 text-blue-700" label="Active users" value={data.stats.active_users} />
        <StatCard icon={Building2} tint="bg-emerald-100 text-emerald-700" label="Services" value={data.stats.services} />
        <StatCard icon={Calendar} tint="bg-amber-100 text-amber-700" label="Access reviews due" value={data.stats.access_reviews_due} />
        <StatCard icon={AlertTriangle} tint="bg-red-100 text-red-700" label="Security alerts" value={data.stats.security_alerts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Access requiring attention">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3"><Calendar size={18} className="text-red-500" /><span><strong>{a.access_reviews_due}</strong> access review{a.access_reviews_due === 1 ? "" : "s"} due</span></li>
            <li className="flex items-center gap-3"><UserX size={18} className="text-primary" /><span><strong>{a.inactive_assigned}</strong> inactive account{a.inactive_assigned === 1 ? "" : "s"} still assigned</span></li>
            <li className="flex items-center gap-3"><AlertTriangle size={18} className="text-amber-500" /><span><strong>{a.failed_login_alerts}</strong> failed sign-in{a.failed_login_alerts === 1 ? "" : "s"} (7d)</span></li>
          </ul>
          <button onClick={() => navigate("/admin-users")} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold">Review access <ChevronRight size={16} /></button>
        </Panel>

        <Panel title="Services & assignments" onMore={() => navigate("/admin/houses")}>
          {data.assignments.length === 0 ? <p className="text-sm text-muted-foreground">No active services yet.</p> :
            <ul className="space-y-3">
              {data.assignments.slice(0, 4).map(s => (
                <li key={s.id} className="flex items-center gap-3">
                  <Building2 size={18} className="text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0"><div className="text-sm font-medium text-foreground truncate">{s.name}</div><div className="text-xs text-muted-foreground capitalize">{s.service_type}</div></div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{s.staff} staff</span>
                </li>
              ))}
            </ul>}
          <button onClick={() => navigate("/admin/houses")} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold">Manage assignments <ChevronRight size={16} /></button>
        </Panel>

        <Panel title="Recent admin activity">
          {data.activity.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity.</p> :
            <ul className="space-y-3">
              {data.activity.slice(0, 5).map(ev => (
                <li key={ev.id} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-muted text-foreground/70 text-xs font-semibold flex items-center justify-center shrink-0">{initials(ev.actor)}</span>
                  <div className="min-w-0"><div className="text-sm text-foreground"><strong>{ev.actor}</strong> {ev.text}</div><div className="text-xs text-muted-foreground">{ago(ev.at)}</div></div>
                </li>
              ))}
            </ul>}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Security controls">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SecTile ok={data.security.mfa_required} title="MFA required" sub={data.security.mfa_required ? "Enabled for all users" : "Not enforced"} />
            <SecTile ok title={`Session timeout ${data.security.session_timeout_minutes} min`} sub="Automatically ends idle sessions" />
            <SecTile ok={data.security.exports_restricted} title="Exports restricted" sub={data.security.exports_restricted ? "Limited to authorised users" : "Open to all roles"} />
          </div>
        </Panel>

        <Panel title="Quick actions">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickAction icon={UserPlus} label="Invite user" onClick={() => navigate("/admin-users")} />
            <QuickAction icon={Building2} label="Add service" onClick={() => navigate("/admin/houses")} />
            <QuickAction icon={ArrowLeftRight} label="Transfer service user" onClick={() => navigate("/admin/service-users")} />
            <QuickAction icon={KeyRound} label="Review permissions" onClick={() => navigate("/admin-users")} />
          </div>
        </Panel>
      </div>

      <div className="flex justify-end"><button onClick={reload} className="text-sm text-primary inline-flex items-center gap-1.5"><RefreshCw size={14} /> Refresh</button></div>
    </div>
  );
}

function SecTile({ ok, title, sub }: { ok: boolean; title: string; sub: string }) {
  return (
    <div className={`rounded-lg border p-3 ${ok ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
      <div className="flex items-center gap-2">{ok ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-amber-600" />}<span className="text-sm font-medium text-foreground">{title}</span></div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}
function QuickAction({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-lg border border-border bg-card hover:bg-muted px-3 py-3 flex items-center gap-2.5 text-sm font-medium text-foreground"><Icon size={17} className="text-primary" /> {label}</button>;
}

function SecuritySection({ data, onChanged }: { data: Overview | null; onChanged: () => void }) {
  const [form, setForm] = useState(data?.security || { mfa_required: true, session_timeout_minutes: 30, exports_restricted: true });
  const [saving, setSaving] = useState(false);
  const [reviews, setReviews] = useState<AccessReview[]>([]);
  const [loadingR, setLoadingR] = useState(true);

  useEffect(() => { if (data?.security) setForm(data.security); }, [data?.security]);
  const loadReviews = async () => {
    setLoadingR(true);
    try { const r = await apiClient.get("/company-admin/access-reviews?status=OPEN"); setReviews(r.data?.data || []); }
    catch { setReviews([]); } finally { setLoadingR(false); }
  };
  useEffect(() => { loadReviews(); }, []);

  const save = async () => {
    setSaving(true);
    try { await apiClient.patch("/company-admin/security-policy", form); toast.success("Security policy updated."); onChanged(); }
    catch (e: any) { toast.error(e?.response?.data?.message || "Failed to update policy."); }
    finally { setSaving(false); }
  };
  const complete = async (id: string) => {
    try { await apiClient.post(`/company-admin/access-reviews/${id}/complete`, {}); toast.success("Access review completed."); loadReviews(); onChanged(); }
    catch (e: any) { toast.error(e?.response?.data?.message || "Failed to complete review."); }
  };

  return (
    <div className="space-y-5">
      <Panel title="Security policy">
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4">
            <span><span className="text-sm font-medium text-foreground">Require multi-factor authentication</span><span className="block text-xs text-muted-foreground">All users must set up MFA to sign in.</span></span>
            <input type="checkbox" checked={form.mfa_required} onChange={e => setForm({ ...form, mfa_required: e.target.checked })} className="w-5 h-5" />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span><span className="text-sm font-medium text-foreground">Session timeout (minutes)</span><span className="block text-xs text-muted-foreground">Idle sessions end automatically. 5–480.</span></span>
            <input type="number" min={5} max={480} value={form.session_timeout_minutes} onChange={e => setForm({ ...form, session_timeout_minutes: Number(e.target.value) })} className="w-24 rounded-lg border-2 border-border bg-background p-2 text-sm" />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span><span className="text-sm font-medium text-foreground">Restrict data exports</span><span className="block text-xs text-muted-foreground">Only authorised roles may export data.</span></span>
            <input type="checkbox" checked={form.exports_restricted} onChange={e => setForm({ ...form, exports_restricted: e.target.checked })} className="w-5 h-5" />
          </label>
          <div className="flex justify-end"><button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{saving ? "Saving…" : "Save policy"}</button></div>
        </div>
      </Panel>

      <Panel title={`Access reviews due (${reviews.length})`}>
        {loadingR ? <div className="py-6 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          : reviews.length === 0 ? <p className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> All access is up to date.</p>
          : <ul className="divide-y divide-border">
              {reviews.map(r => (
                <li key={r.id} className="py-3 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-muted text-foreground/70 text-xs font-semibold flex items-center justify-center shrink-0">{initials(r.user_name)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{r.user_name || r.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.email} · {String(r.role || "").replace(/_/g, " ").toLowerCase()} · last sign-in {r.last_login ? ago(r.last_login) : "never"}</div>
                  </div>
                  <button onClick={() => complete(r.id)} className="text-xs font-semibold text-primary border border-primary/30 rounded px-2.5 py-1 hover:bg-primary/10">Confirm access</button>
                </li>
              ))}
            </ul>}
      </Panel>

      <Panel title="Recent admin activity">
        {(data?.activity || []).length === 0 ? <p className="text-sm text-muted-foreground">No recent activity.</p> :
          <ul className="space-y-3">
            {(data?.activity || []).map(ev => (
              <li key={ev.id} className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-muted text-foreground/70 text-xs font-semibold flex items-center justify-center shrink-0">{initials(ev.actor)}</span>
                <div className="min-w-0"><div className="text-sm text-foreground"><strong>{ev.actor}</strong> {ev.text}</div><div className="text-xs text-muted-foreground">{ago(ev.at)}</div></div>
              </li>
            ))}
          </ul>}
      </Panel>
    </div>
  );
}

function RetentionSection({ data }: { data: Overview | null }) {
  return (
    <div className="space-y-5">
      <Panel title="Data & retention">
        <div className="space-y-3 text-sm text-foreground">
          <div className="flex items-center gap-3"><FileDown size={18} className="text-primary" /><span>Data exports are <strong>{data?.security.exports_restricted ? "restricted to authorised users" : "open to all roles"}</strong>. Change this under Audit &amp; Security.</span></div>
          <div className="flex items-center gap-3"><Database size={18} className="text-emerald-600" /><span>Governance records (signals, risks, escalations, reports) are retained as an immutable audit trail and are never hard-deleted by the app.</span></div>
          <div className="flex items-center gap-3"><ArrowRight size={18} className="text-muted-foreground" /><span>Service-user transfers keep original governance history with the originating service.</span></div>
        </div>
      </Panel>
    </div>
  );
}
