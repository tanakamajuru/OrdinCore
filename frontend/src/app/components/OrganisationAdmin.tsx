import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Home, Users, Building2, UsersRound, SlidersHorizontal, ShieldCheck, Database, HelpCircle,
  Shield, Lock, Calendar, AlertTriangle, ChevronRight, UserPlus, ArrowLeftRight, KeyRound,
  RefreshCw, CheckCircle2, UserX, FileDown, ArrowRight, X, Plus, Search, Mail, ExternalLink,
  CreditCard, Menu, LogOut,
} from "lucide-react";
import apiClient from "@/services/apiClient";

/* ---------- types ---------- */
type Overview = {
  company: string;
  stats: { active_users: number; services: number; access_reviews_due: number; security_alerts: number };
  attention: { access_reviews_due: number; inactive_assigned: number; failed_login_alerts: number; accounts_without_mfa: number };
  assignments: { id: string; name: string; service_type: string; staff: number }[];
  activity: { id: string; actor: string; text: string; at: string }[];
  security: { mfa_required: boolean; session_timeout_minutes: number; exports_restricted: boolean };
};
type AccessReview = { id: string; due_at: string; user_id: string; user_name: string; email: string; role: string; account_status: string; last_login: string | null };
type Section = "overview" | "people" | "services" | "serviceusers" | "governance" | "security" | "retention" | "billing" | "help";

const ROLES = ["DIRECTOR", "RESPONSIBLE_INDIVIDUAL", "REGISTERED_MANAGER", "TEAM_LEADER", "SUPPORT_WORKER", "ADMIN"];
const roleLabel = (r: string) => String(r || "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const fullName = (u: any) => (u.name || `${u.first_name || ""} ${u.last_name || ""}`).trim() || u.email || "—";
const initials = (name: string) => (name || "?").split(" ").filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("") || "?";
const ago = (iso?: string | null) => {
  if (!iso) return "never";
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24); return `${d} day${d > 1 ? "s" : ""} ago`;
};
const rows = (res: any) => { const d = res?.data?.data ?? res?.data ?? []; return Array.isArray(d) ? d : (d.items || d.users || d.houses || []); };
const errMsg = (e: any, fb: string) => e?.response?.data?.message || fb;

/* ---------- shared UI ---------- */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: any }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
const inputCls = "w-full rounded-lg border-2 border-border bg-background p-2 text-sm";
function Field({ label, children }: { label: string; children: any }) {
  return <label className="block"><span className="text-xs font-medium text-muted-foreground">{label}</span><div className="mt-1">{children}</div></label>;
}
function Panel({ title, children, right }: { title: string; children: any; right?: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-foreground">{title}</h2>{right}</div>
      {children}
    </div>
  );
}
function Badge({ tone, children }: { tone: "green" | "amber" | "red" | "slate" | "blue"; children: any }) {
  const map = { green: "bg-emerald-50 text-emerald-700 border-emerald-200", amber: "bg-amber-50 text-amber-700 border-amber-200", red: "bg-red-50 text-red-700 border-red-200", slate: "bg-muted text-muted-foreground border-border", blue: "bg-blue-50 text-blue-700 border-blue-200" }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${map}`}>{children}</span>;
}
function Spinner() { return <div className="py-16 flex justify-center"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" /></div>; }

/* ---------- shell ---------- */
export default function OrganisationAdmin() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { if (window.confirm("Log out of OrdinCore?")) { logout(); navigate("/login"); } };
  const [section, setSection] = useState<Section>("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const res = await apiClient.get("/company-admin/overview"); setData(res.data?.data || null); }
    catch { toast.error("Failed to load the admin overview."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const NAV: { key: Section; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: Home },
    { key: "people", label: "People & Access", icon: Users },
    { key: "services", label: "Services", icon: Building2 },
    { key: "serviceusers", label: "Service Users", icon: UsersRound },
    { key: "governance", label: "Review Schedule", icon: SlidersHorizontal },
    { key: "security", label: "Audit & Security", icon: ShieldCheck },
    { key: "retention", label: "Data & Retention", icon: Database },
    { key: "billing", label: "Billing & Subscription", icon: CreditCard },
    { key: "help", label: "Help", icon: HelpCircle },
  ];

  const currentLabel = NAV.find(n => n.key === section)?.label || "Overview";
  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile drawer backdrop */}
      {navOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setNavOpen(false)} />}
      <aside className={`w-64 shrink-0 min-h-screen flex flex-col text-[#D9E8F3] fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-200 lg:translate-x-0 ${navOpen ? "translate-x-0" : "-translate-x-full"}`} style={{ background: "linear-gradient(180deg,#0D2944,#081B2E)" }}>
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-primary/90 flex items-center justify-center"><Shield size={18} className="text-white" /></div>
          <div className="flex-1"><div className="font-bold tracking-tight text-white leading-none">ORDIN <span className="font-light">CORE</span></div><div className="text-[10px] text-sky-200/70 mt-0.5">Safer care. Stronger organisations.</div></div>
          <button onClick={() => setNavOpen(false)} className="lg:hidden text-sky-100/80 p-1" aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(n => (
            <button key={n.key} onClick={() => { setSection(n.key); setNavOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${section === n.key ? "bg-primary text-white shadow-[inset_3px_0_0_#71C4EE]" : "text-sky-100/80 hover:bg-white/8 hover:text-white"}`}>
              <n.icon size={18} strokeWidth={1.8} /> {n.label}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-2">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sky-100/80 hover:bg-white/8 hover:text-white transition-colors">
            <LogOut size={18} strokeWidth={1.8} /> Log out
          </button>
        </div>
        <div className="px-5 py-4 text-[11px] text-sky-200/50 leading-snug border-t border-white/10">Good governance<br />brighter tomorrows.</div>
      </aside>

      <main className="flex-1 min-w-0 w-full p-4 sm:p-6 lg:p-8 max-w-[1200px]">
        {/* Mobile top bar with menu toggle */}
        <div className="lg:hidden flex items-center gap-3 mb-4 -mt-1">
          <button onClick={() => setNavOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-muted text-foreground" aria-label="Open menu"><Menu size={22} /></button>
          <span className="text-sm font-semibold text-foreground">{currentLabel}</span>
        </div>
        <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Organisation Administration</h1>
            <p className="text-muted-foreground mt-1"><span className="font-semibold text-foreground/80">{data?.company || "…"}</span> · Provider workspace</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-sm font-semibold"><Shield size={15} /> Company Admin</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted text-muted-foreground px-3 py-1.5 text-sm font-medium border border-border" title="Access is scoped to your organisation by the platform. This describes the access model, not a test result."><Lock size={14} /> Organisation-scoped</span>
          </div>
        </header>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex items-center gap-3 mb-6">
          <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
          <span className="text-sm text-emerald-900">You can only view and manage <strong>{data?.company || "your organisation"}</strong></span>
        </div>

        {loading && section === "overview" ? <Spinner />
          : section === "overview" ? <OverviewSection data={data} go={setSection} reload={load} />
          : section === "people" ? <PeopleSection />
          : section === "services" ? <ServicesSection />
          : section === "serviceusers" ? <ServiceUsersSection />
          : section === "governance" ? <GovernanceSection navigate={navigate} />
          : section === "security" ? <SecuritySection data={data} onChanged={load} />
          : section === "retention" ? <RetentionSection data={data} />
          : section === "billing" ? <BillingSection />

          : <HelpSection />}
      </main>
    </div>
  );
}

/* ---------- Overview ---------- */
function StatCard({ icon: Icon, tint, label, value, onClick }: { icon: any; tint: string; label: string; value: number; onClick?: () => void }) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={`rounded-xl border border-border bg-card p-5 flex items-center gap-4 text-left w-full ${onClick ? "hover:border-primary/40 hover:shadow-sm transition-colors cursor-pointer" : ""}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tint}`}><Icon size={22} /></div>
      <div className="flex-1"><div className="text-sm text-muted-foreground">{label}</div><div className="text-3xl font-bold text-foreground leading-tight">{value}</div></div>
      {onClick && <ChevronRight size={18} className="text-muted-foreground shrink-0" />}
    </Comp>
  );
}
function OverviewSection({ data, go, reload }: { data: Overview | null; go: (s: Section) => void; reload: () => void }) {
  if (!data) return null;
  const a = data.attention;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} tint="bg-blue-100 text-blue-700" label="Active users" value={data.stats.active_users} />
        <StatCard icon={Building2} tint="bg-emerald-100 text-emerald-700" label="Services" value={data.stats.services} />
        <StatCard icon={Calendar} tint="bg-amber-100 text-amber-700" label="Access reviews due" value={data.stats.access_reviews_due} />
        <StatCard icon={AlertTriangle} tint="bg-red-100 text-red-700" label="Security alerts" value={data.stats.security_alerts} onClick={() => go("security")} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Access requiring attention">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3"><Calendar size={18} className="text-red-500" /><span><strong>{a.access_reviews_due}</strong> access review{a.access_reviews_due === 1 ? "" : "s"} due</span></li>
            <li className="flex items-center gap-3"><UserX size={18} className="text-primary" /><span><strong>{a.inactive_assigned}</strong> inactive account{a.inactive_assigned === 1 ? "" : "s"} still assigned</span></li>
            <li className="flex items-center gap-3"><AlertTriangle size={18} className="text-amber-500" /><span><strong>{a.failed_login_alerts}</strong> failed sign-in{a.failed_login_alerts === 1 ? "" : "s"} (7d)</span></li>
          </ul>
          <button onClick={() => go("security")} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold">Review access <ChevronRight size={16} /></button>
        </Panel>
        <Panel title="Services & assignments" right={<button onClick={() => go("services")} className="text-muted-foreground hover:text-primary"><ChevronRight size={18} /></button>}>
          {data.assignments.length === 0 ? <p className="text-sm text-muted-foreground">No active services yet.</p> :
            <ul className="space-y-3">{data.assignments.slice(0, 4).map(s => (
              <li key={s.id} className="flex items-center gap-3"><Building2 size={18} className="text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0"><div className="text-sm font-medium text-foreground truncate">{s.name}</div><div className="text-xs text-muted-foreground capitalize">{s.service_type}</div></div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">{s.staff} staff</span></li>))}</ul>}
          <button onClick={() => go("services")} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold">Manage assignments <ChevronRight size={16} /></button>
        </Panel>
        <Panel title="Recent admin activity" right={<button onClick={() => go("security")} className="text-muted-foreground hover:text-primary"><ChevronRight size={18} /></button>}>
          {data.activity.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity.</p> :
            <ul className="space-y-1">{data.activity.slice(0, 5).map(ev => (
              <li key={ev.id}>
                <button onClick={() => go("security")} className="w-full flex items-start gap-3 text-left -mx-1 px-1 py-1.5 rounded-lg hover:bg-muted/60 transition-colors">
                  <span className="w-8 h-8 rounded-full bg-muted text-foreground/70 text-xs font-semibold flex items-center justify-center shrink-0">{initials(ev.actor)}</span>
                  <div className="min-w-0 flex-1"><div className="text-sm text-foreground"><strong>{ev.actor}</strong> {ev.text}</div><div className="text-xs text-muted-foreground">{ago(ev.at)}</div></div>
                  <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-2" />
                </button>
              </li>))}</ul>}
          <button onClick={() => go("security")} className="mt-3 text-xs font-semibold text-primary hover:underline">View full audit log →</button>
        </Panel>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Security controls" right={<button onClick={() => go("security")} className="text-muted-foreground hover:text-primary"><ChevronRight size={18} /></button>}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SecTile ok={data.security.mfa_required && data.attention.accounts_without_mfa === 0} title="MFA coverage" sub={data.attention.accounts_without_mfa === 0 ? "All active accounts enrolled" : `${data.attention.accounts_without_mfa} account(s) not enrolled`} />
            <SecTile ok={false} title={`Timeout policy ${data.security.session_timeout_minutes} min`} sub="Policy target; platform token controls apply" />
            <SecTile ok={data.security.exports_restricted} title="Exports restricted" sub={data.security.exports_restricted ? "Limited to authorised users" : "Open to all roles"} />
          </div>
        </Panel>
        <Panel title="Quick actions">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickAction icon={UserPlus} label="Create account" onClick={() => go("people")} />
            <QuickAction icon={Building2} label="Add service" onClick={() => go("services")} />
            <QuickAction icon={ArrowLeftRight} label="Transfer service user" onClick={() => go("serviceusers")} />
            <QuickAction icon={KeyRound} label="Review permissions" onClick={() => go("people")} />
          </div>
        </Panel>
      </div>
      <div className="flex justify-end"><button onClick={reload} className="text-sm text-primary inline-flex items-center gap-1.5"><RefreshCw size={14} /> Refresh</button></div>
    </div>
  );
}
function SecTile({ ok, title, sub }: { ok: boolean; title: string; sub: string }) {
  return <div className={`rounded-lg border p-3 ${ok ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
    <div className="flex items-center gap-2">{ok ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-amber-600" />}<span className="text-sm font-medium text-foreground">{title}</span></div>
    <div className="text-xs text-muted-foreground mt-1">{sub}</div></div>;
}
function QuickAction({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-lg border border-border bg-card hover:bg-muted px-3 py-3 flex items-center gap-2.5 text-sm font-medium text-foreground"><Icon size={17} className="text-primary" /> {label}</button>;
}

/* ---------- People & Access ---------- */
function PeopleSection() {
  const [list, setList] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [invite, setInvite] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", role: "SUPPORT_WORKER", password: "" });
  const [inviteHouses, setInviteHouses] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [editServicesFor, setEditServicesFor] = useState<any | null>(null);
  const [editHouses, setEditHouses] = useState<string[]>([]);
  const [savingServices, setSavingServices] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const [u, h] = await Promise.all([apiClient.get("/users?limit=500"), apiClient.get("/houses?limit=500")]); setList(rows(u)); setHouses(rows(h)); }
    catch { toast.error("Failed to load users."); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = list.filter(u => { const s = q.toLowerCase(); return !s || fullName(u).toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s) || roleLabel(u.role).toLowerCase().includes(s); });
  const toggleIn = (arr: string[], id: string) => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

  const submitInvite = async () => {
    if (!form.first_name || !form.last_name || !form.email) { toast.error("Name and email are required."); return; }
    if (form.password.length < 8) { toast.error("Set a temporary password of at least 8 characters."); return; }
    setBusy(true);
    try { await apiClient.post("/users", { ...form, house_ids: inviteHouses }); toast.success("Account created. Share the temporary password securely with the user — no email invitation is sent."); setInvite(false); setForm({ first_name: "", last_name: "", email: "", role: "SUPPORT_WORKER", password: "" }); setInviteHouses([]); load(); }
    catch (e: any) { toast.error(errMsg(e, "Failed to invite user.")); } finally { setBusy(false); }
  };
  const toggleStatus = async (u: any) => {
    const active = String(u.status || (u.is_active ? "active" : "inactive")).toLowerCase() === "active";
    try { await apiClient.patch(`/users/${u.id}/${active ? "suspend" : "activate"}`, {}); toast.success(active ? "User suspended." : "User activated."); load(); }
    catch (e: any) { toast.error(errMsg(e, "Failed to update user.")); }
  };
  const changeRole = async (u: any, role: string) => {
    try { await apiClient.patch(`/users/${u.id}`, { role }); toast.success("Role updated."); load(); }
    catch (e: any) { toast.error(errMsg(e, "Failed to update role.")); }
  };
  const [loadingCurrentHouses, setLoadingCurrentHouses] = useState(false);
  const [loadHousesFailed, setLoadHousesFailed] = useState(false);
  const openEditServices = async (u: any) => {
    setEditServicesFor(u); setEditHouses([]); setLoadingCurrentHouses(true); setLoadHousesFailed(false);
    // Field report 19 Oct 2026: the modal always opened with every box unchecked, even when the
    // user already had a service assigned — saving then looked like it did nothing, because
    // reopening showed the same empty state regardless of whether the save actually worked.
    // Prefill from the user's ACTUAL current assignment instead of assuming none.
    try {
      const r: any = await apiClient.get(`/users/${u.id}/houses`);
      const current = rows(r).map((h: any) => h.id).filter(Boolean);
      setEditHouses(current);
    } catch {
      // Safe handover fix (Admin setup, 19 Oct 2026): a failed load must BLOCK saving, not fall
      // back to an empty list — proceeding here would silently wipe every real allocation this
      // person has, mistaken for "the admin chose to remove everything."
      setLoadHousesFailed(true);
    }
    finally { setLoadingCurrentHouses(false); }
  };
  const saveServices = async () => {
    if (!editServicesFor || loadHousesFailed) return;
    setSavingServices(true);
    try {
      await apiClient.patch(`/users/${editServicesFor.id}`, { house_ids: editHouses });
      toast.success(editHouses.length ? "Services updated." : "All service allocations removed.");
      setEditServicesFor(null); load();
    }
    catch (e: any) { toast.error(errMsg(e, "Failed to update services.")); } finally { setSavingServices(false); }
  };

  return (
    <Panel title={`People & Access (${filtered.length})`} right={
      <div className="flex items-center gap-2">
        <div className="relative"><Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-sm w-44" /></div>
        <button onClick={() => setInvite(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold"><UserPlus size={15} /> Create account</button>
      </div>}>
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2 pr-3 font-semibold">Name</th><th className="py-2 pr-3 font-semibold">Email</th><th className="py-2 pr-3 font-semibold">Role</th><th className="py-2 pr-3 font-semibold">Service(s)</th><th className="py-2 pr-3 font-semibold">Status</th><th className="py-2 pr-3 font-semibold">Last sign-in</th><th className="py-2 font-semibold text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.map(u => {
                const active = String(u.status || (u.is_active ? "active" : "inactive")).toLowerCase() === "active";
                return (
                  <tr key={u.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3"><div className="flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-muted text-foreground/70 text-[11px] font-semibold flex items-center justify-center">{initials(fullName(u))}</span><span className="font-medium text-foreground">{fullName(u)}</span>{u.mfa_enabled ? <Lock size={12} className="text-emerald-600" /> : null}</div></td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{u.email}</td>
                    <td className="py-2.5 pr-3">
                      <select value={String(u.role || "").toUpperCase()} onChange={e => changeRole(u, e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-xs">
                        {ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                      </select>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{u.assigned_house_name || "—"}</td>
                    <td className="py-2.5 pr-3">{active ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{ago(u.last_login)}</td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => openEditServices(u)} className="text-xs font-medium text-muted-foreground border border-border rounded px-2.5 py-1 hover:bg-muted mr-2">Edit services</button>
                      <button onClick={() => toggleStatus(u)} className={`text-xs font-semibold rounded px-2.5 py-1 border ${active ? "text-amber-700 border-amber-300 hover:bg-amber-50" : "text-emerald-700 border-emerald-300 hover:bg-emerald-50"}`}>{active ? "Suspend" : "Activate"}</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {invite && (
        <Modal title="Create account" onClose={() => setInvite(false)}>
          <p className="text-xs text-muted-foreground -mt-1 mb-1">This creates the account immediately with a temporary password. No email invitation is sent — share the password securely with the user, who signs in and can change it.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input className={inputCls} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></Field>
            <Field label="Last name"><input className={inputCls} value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></Field>
          </div>
          <Field label="Email"><input className={inputCls} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role"><select className={inputCls} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></Field>
          <Field label="Temporary password"><input className={inputCls} type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="They can change it after first sign-in" /></Field>
          <Field label="Service(s)">
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
              {houses.length === 0 && <p className="text-xs text-muted-foreground px-1">No services set up yet.</p>}
              {houses.filter(h => h.is_active !== false).map(h => (
                <label key={h.id} className="flex items-center gap-2 text-sm px-1 py-0.5">
                  <input type="checkbox" checked={inviteHouses.includes(h.id)} onChange={() => setInviteHouses(toggleIn(inviteHouses, h.id))} />
                  {h.name}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Which service(s)/site(s) this person works at. Leave unchecked for a role with no single-service scope.</p>
          </Field>
          <div className="flex justify-end gap-2 pt-1"><button onClick={() => setInvite(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button><button onClick={submitInvite} disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? "Creating…" : "Create account"}</button></div>
        </Modal>
      )}

      {editServicesFor && (
        <Modal title={`Services — ${fullName(editServicesFor)}`} onClose={() => setEditServicesFor(null)}>
          <p className="text-xs text-muted-foreground -mt-1 mb-1">Currently: {editServicesFor.assigned_house_name || "no service assigned"}. Selecting and saving below replaces their current allocation.</p>
          {loadingCurrentHouses ? <p className="text-sm text-muted-foreground py-3">Loading current allocation…</p> : loadHousesFailed ? (
            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Could not load this person's current service allocation. Saving is disabled to avoid accidentally removing services they still have — try again.
              <div className="pt-2"><button onClick={() => openEditServices(editServicesFor)} className="text-xs font-semibold underline">Retry</button></div>
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
              {houses.filter(h => h.is_active !== false).map(h => (
                <label key={h.id} className="flex items-center gap-2 text-sm px-1 py-0.5">
                  <input type="checkbox" checked={editHouses.includes(h.id)} onChange={() => setEditHouses(toggleIn(editHouses, h.id))} />
                  {h.name}
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-3"><button onClick={() => setEditServicesFor(null)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button><button onClick={saveServices} disabled={savingServices || loadingCurrentHouses || loadHousesFailed} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{savingServices ? "Saving…" : "Save services"}</button></div>
        </Modal>
      )}
    </Panel>
  );
}

/* ---------- Services ---------- */
function ServicesSection() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [add, setAdd] = useState(false);
  const [form, setForm] = useState({ name: "", sector: "", city: "", address: "", postcode: "" });
  const [busy, setBusy] = useState(false);
  const [reviewers, setReviewers] = useState<any[]>([]);

  const load = async () => { setLoading(true); try { setList(rows(await apiClient.get("/houses?limit=500"))); } catch { toast.error("Failed to load services."); } finally { setLoading(false); } };
  // Only a Registered Manager can author and finalise a weekly review (POST /weekly-reviews/:id/finalise
  // is RM-only), so the assigned reviewer must be an RM. Listing Directors/Admins here would imply a
  // finalising permission they do not have, and blur authoring vs independent validation.
  useEffect(() => { load(); (async () => { try { const us = rows(await apiClient.get("/users?limit=500")); setReviewers(us.filter((u: any) => String(u.role || "").toUpperCase().replace(/-/g, "_") === "REGISTERED_MANAGER")); } catch { /* optional */ } })(); }, []);
  const setReviewer = async (houseId: string, userId: string) => {
    try { await apiClient.patch(`/houses/${houseId}`, { assigned_reviewer_id: userId || null }); toast.success("Assigned reviewer updated."); setList((l) => l.map((h) => h.id === houseId ? { ...h, assigned_reviewer_id: userId || null } : h)); }
    catch (e: any) { toast.error(errMsg(e, "Failed to set reviewer.")); }
  };
  // Ownership fix (Admin setup, 19 Oct 2026): daily RM and deputy must be visible and editable
  // separately from the weekly reviewer -- previously the admin UI only exposed assigned_reviewer_id,
  // even though houses already has manager_id (daily RM) and deputy_rm_id columns.
  const setOwner = async (houseId: string, field: "manager_id" | "deputy_rm_id", userId: string) => {
    try { await apiClient.patch(`/houses/${houseId}`, { [field]: userId || null }); toast.success("Updated."); setList((l) => l.map((h) => h.id === houseId ? { ...h, [field]: userId || null } : h)); }
    catch (e: any) { toast.error(errMsg(e, "Failed to update.")); }
  };

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Service name is required."); return; }
    if (!form.sector) { toast.error("Choose the care model (Supported Living or Domiciliary)."); return; }
    setBusy(true);
    try { await apiClient.post("/houses", form); toast.success("Service added."); setAdd(false); setForm({ name: "", sector: "", city: "", address: "", postcode: "" }); load(); }
    catch (e: any) { toast.error(errMsg(e, "Failed to add service.")); } finally { setBusy(false); }
  };

  return (
    <Panel title={`Services (${list.length})`} right={<button onClick={() => setAdd(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold"><Plus size={15} /> Add service</button>}>
      {loading ? <Spinner /> : list.length === 0 ? <p className="text-sm text-muted-foreground">No services yet.</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map(h => (
            <div key={h.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-1"><Building2 size={18} className="text-emerald-600" /><span className="font-medium text-foreground truncate">{h.name}</span></div>
              <div className="text-xs text-muted-foreground">{h.sector === "DOMICILIARY" ? "Domiciliary / Home Care" : h.sector === "SUPPORTED_LIVING" ? "Supported Living" : (h.sector || "Care service")}</div>
              {(h.city || h.postcode) && <div className="text-xs text-muted-foreground mt-1">{[h.address, h.city, h.postcode].filter(Boolean).join(", ")}</div>}
              <div className="mt-2">
                <label className="text-[11px] text-muted-foreground block mb-1">Daily Registered Manager</label>
                <select value={h.manager_id || ""} onChange={(e) => setOwner(h.id, "manager_id", e.target.value)} className="w-full p-2 border-2 border-border rounded-lg bg-background text-xs">
                  <option value="">Unassigned</option>
                  {reviewers.map((u) => <option key={u.id} value={u.id}>{`${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email}</option>)}
                </select>
              </div>
              <div className="mt-2">
                <label className="text-[11px] text-muted-foreground block mb-1">Deputy RM (cover)</label>
                <select value={h.deputy_rm_id || ""} onChange={(e) => setOwner(h.id, "deputy_rm_id", e.target.value)} className="w-full p-2 border-2 border-border rounded-lg bg-background text-xs">
                  <option value="">Unassigned</option>
                  {reviewers.map((u) => <option key={u.id} value={u.id}>{`${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email}</option>)}
                </select>
              </div>
              <div className="mt-2">
                <label className="text-[11px] text-muted-foreground block mb-1">Weekly review reviewer</label>
                <select value={h.assigned_reviewer_id || ""} onChange={(e) => setReviewer(h.id, e.target.value)} className="w-full p-2 border-2 border-border rounded-lg bg-background text-xs">
                  <option value="">Unassigned (RM who reviews)</option>
                  {reviewers.map((u) => <option key={u.id} value={u.id}>{`${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email}{u.role ? ` (${String(u.role).replace(/_/g, " ").toLowerCase()})` : ""}</option>)}
                </select>
                {reviewers.length === 0 && <p className="text-[10px] text-muted-foreground mt-1">No Registered Managers available — only an RM can author and finalise a weekly review.</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {add && (
        <Modal title="Add service" onClose={() => setAdd(false)}>
          <Field label="Service name"><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Care model / sector"><select className={inputCls} value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}><option value="">Choose a care model…</option><option value="SUPPORTED_LIVING">Supported Living</option><option value="DOMICILIARY">Domiciliary / Home Care</option></select><p className="text-[11px] text-muted-foreground mt-1">Determines the signal themes and governance taxonomy for this service.</p></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="City"><input className={inputCls} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></Field><Field label="Postcode"><input className={inputCls} value={form.postcode} onChange={e => setForm({ ...form, postcode: e.target.value })} /></Field></div>
          <Field label="Address"><input className={inputCls} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-1"><button onClick={() => setAdd(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button><button onClick={submit} disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? "Adding…" : "Add service"}</button></div>
        </Modal>
      )}
    </Panel>
  );
}

/* ---------- Service Users ---------- */
function ServiceUsersSection() {
  const [list, setList] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transfer, setTransfer] = useState<any | null>(null);
  const [dest, setDest] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [preview, setPreview] = useState<any | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [historyFor, setHistoryFor] = useState<any | null>(null);
  const [placements, setPlacements] = useState<any[]>([]);
  const [loadingP, setLoadingP] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ house_id: "", first_name: "", last_name: "" });
  const [addBusy, setAddBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const [su, h] = await Promise.all([apiClient.get("/service-users"), apiClient.get("/houses?limit=500")]); setList(rows(su)); setHouses(rows(h)); }
    catch { toast.error("Failed to load service users."); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openTransfer = async (su: any) => {
    setTransfer(su); setDest(""); setReason(""); setStep("form"); setPreview(null); setPreviewing(true);
    try { const r: any = await apiClient.get(`/service-users/${su.id}/transfer-preview`); setPreview(r?.data?.data ?? r?.data ?? null); }
    catch { setPreview(null); } finally { setPreviewing(false); }
  };

  const openHistory = async (su: any) => {
    setHistoryFor(su); setPlacements([]); setLoadingP(true);
    try { setPlacements(rows(await apiClient.get(`/service-users/${su.id}/placements`))); }
    catch (e: any) { toast.error(errMsg(e, "Failed to load placement history.")); } finally { setLoadingP(false); }
  };

  const proceed = () => {
    if (!dest) { toast.error("Choose a destination service."); return; }
    if (reason.trim().length < 5) { toast.error("Add a short reason for the transfer."); return; }
    setStep("confirm");
  };

  const submit = async () => {
    setBusy(true);
    try { await apiClient.post(`/service-users/${transfer.id}/transfer`, { destination_house_id: dest, reason: reason.trim() }); toast.success("Transfer complete. The current placement has moved; governance history stays with the originating service."); setTransfer(null); setDest(""); setReason(""); setStep("form"); load(); }
    catch (e: any) { toast.error(errMsg(e, "Failed to transfer.")); } finally { setBusy(false); }
  };

  const submitAdd = async () => {
    if (!addForm.house_id) { toast.error("Choose which service they're allocated to."); return; }
    if (!addForm.first_name.trim() || !addForm.last_name.trim()) { toast.error("Enter a first and last name."); return; }
    setAddBusy(true);
    try {
      await apiClient.post(`/houses/${addForm.house_id}/service-users`, { first_name: addForm.first_name.trim(), last_name: addForm.last_name.trim() });
      toast.success("Client added and allocated.");
      setAddOpen(false); setAddForm({ house_id: "", first_name: "", last_name: "" }); load();
    } catch (e: any) { toast.error(errMsg(e, "Failed to add the client.")); } finally { setAddBusy(false); }
  };
  const sectorLabel = (h: any) => h.sector === "DOMICILIARY" ? "Domiciliary / Home Care" : h.sector === "SUPPORTED_LIVING" ? "Supported Living" : (h.sector || "Care service");
  const houseName = (id: string) => houses.find(h => h.id === id)?.name || "—";
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const out = preview?.outstanding || {};
  const outTotal = (Number(out.open_actions) || 0) + (Number(out.open_risks) || 0) + (Number(out.open_escalations) || 0) + (Number(out.open_interventions) || 0);

  return (
    <Panel title={`Service Users (${list.length})`} right={<button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold"><UserPlus size={15} /> Add client</button>}>
      {loading ? <Spinner /> : list.length === 0 ? <p className="text-sm text-muted-foreground">No service users yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="py-2 pr-3 font-semibold">Name</th><th className="py-2 pr-3 font-semibold">Current service</th><th className="py-2 font-semibold text-right">Actions</th></tr></thead>
            <tbody>
              {list.map(su => (
                <tr key={su.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-3 font-medium text-foreground">{fullName(su)}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{su.house_name || houses.find(h => h.id === su.house_id)?.name || "—"}</td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => openHistory(su)} className="text-xs font-medium text-muted-foreground border border-border rounded px-2.5 py-1 hover:bg-muted inline-flex items-center gap-1 mr-2"><Calendar size={13} /> History</button>
                    <button onClick={() => openTransfer(su)} className="text-xs font-semibold text-primary border border-primary/30 rounded px-2.5 py-1 hover:bg-primary/10 inline-flex items-center gap-1"><ArrowLeftRight size={13} /> Transfer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {transfer && (
        <Modal title={`Transfer ${fullName(transfer)}`} onClose={() => { setTransfer(null); setStep("form"); }}>
          {step === "form" ? (
            <>
              <p className="text-xs text-muted-foreground">Transfers change the current placement only; governance history stays with the originating service. Same-organisation moves only.</p>
              <Field label="Current service"><input className={inputCls} value={transfer.house_name || houseName(transfer.house_id)} disabled /></Field>
              <Field label="Destination service"><select className={inputCls} value={dest} onChange={e => setDest(e.target.value)}><option value="">Choose…</option>{houses.filter(h => h.id !== transfer.house_id && (h.is_active !== false)).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
              <Field label="Reason"><textarea className={inputCls} rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this service user moving?" /></Field>
              <div className="flex justify-end gap-2 pt-1"><button onClick={() => setTransfer(null)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button><button onClick={proceed} disabled={!dest || reason.trim().length < 5} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">Review transfer</button></div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground bg-muted/50 rounded-lg p-3">
                <span className="truncate">{transfer.house_name || houseName(transfer.house_id)}</span>
                <ArrowRight size={16} className="text-primary shrink-0" />
                <span className="truncate">{houseName(dest)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2"><span className="font-medium text-foreground">Transfer now</span> — recorded at the moment you confirm. Reason: “{reason.trim()}”.</p>
              <div className="mt-3 rounded-lg border border-border p-3 text-sm">
                {previewing ? <span className="text-muted-foreground text-xs">Checking outstanding work…</span> : outTotal > 0 ? (
                  <>
                    <p className="text-foreground font-medium mb-1 flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-600" /> Outstanding work stays owned by {transfer.house_name || houseName(transfer.house_id)}</p>
                    <ul className="text-muted-foreground text-xs space-y-0.5">
                      {out.open_actions > 0 && <li>{out.open_actions} open action{out.open_actions === 1 ? "" : "s"}</li>}
                      {out.open_risks > 0 && <li>{out.open_risks} open risk{out.open_risks === 1 ? "" : "s"}</li>}
                      {out.open_escalations > 0 && <li>{out.open_escalations} open escalation{out.open_escalations === 1 ? "" : "s"}</li>}
                      {out.open_interventions > 0 && <li>{out.open_interventions} active improvement plan{out.open_interventions === 1 ? "" : "s"}</li>}
                    </ul>
                    <p className="text-[11px] text-muted-foreground mt-1.5">These are not reassigned by the transfer — the originating service remains accountable. Arrange any handover separately.</p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-xs flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" /> No open actions, risks or escalations are linked to this person.</p>
                )}
                {preview?.outstanding?.total_signals != null && <p className="text-[11px] text-muted-foreground mt-2">Governance history ({preview.outstanding.total_signals} signal{preview.outstanding.total_signals === 1 ? "" : "s"}) stays with the originating service.</p>}
              </div>
              <div className="flex justify-end gap-2 pt-3"><button onClick={() => setStep("form")} disabled={busy} className="px-4 py-2 rounded-lg border border-border text-sm">Back</button><button onClick={submit} disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? "Transferring…" : "Confirm transfer"}</button></div>
            </>
          )}
        </Modal>
      )}

      {historyFor && (
        <Modal title={`Placement history — ${fullName(historyFor)}`} onClose={() => setHistoryFor(null)}>
          {loadingP ? <Spinner /> : placements.length === 0 ? <p className="text-sm text-muted-foreground">No placement history recorded.</p> : (
            <ul className="divide-y divide-border">
              {placements.map((p: any) => (
                <li key={p.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{p.house_name}</span>
                    <span className="text-xs text-muted-foreground">{fmtDate(p.started_at)} → {p.ended_at ? fmtDate(p.ended_at) : "current"}</span>
                  </div>
                  {p.transfer_reason && <p className="text-xs text-muted-foreground mt-0.5">Reason: {p.transfer_reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {addOpen && (
        <Modal title="Add client" onClose={() => setAddOpen(false)}>
          <p className="text-xs text-muted-foreground -mt-1 mb-1">Allocate them to the service they receive care from — a Domiciliary/Home Care service, or a Supported Living house.</p>
          <Field label="Service">
            <select className={inputCls} value={addForm.house_id} onChange={e => setAddForm({ ...addForm, house_id: e.target.value })}>
              <option value="">Choose a service…</option>
              {houses.filter(h => h.is_active !== false).map(h => <option key={h.id} value={h.id}>{h.name} — {sectorLabel(h)}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input className={inputCls} value={addForm.first_name} onChange={e => setAddForm({ ...addForm, first_name: e.target.value })} /></Field>
            <Field label="Last name"><input className={inputCls} value={addForm.last_name} onChange={e => setAddForm({ ...addForm, last_name: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-1"><button onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button><button onClick={submitAdd} disabled={addBusy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{addBusy ? "Adding…" : "Add client"}</button></div>
        </Modal>
      )}
    </Panel>
  );
}

/* ---------- Governance Configuration ---------- */
const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function GovernanceSection({ navigate }: { navigate: (p: string) => void }) {
  const [domains, setDomains] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueSaving, setCatalogueSaving] = useState<string | null>(null);
  const [showAllCatalogue, setShowAllCatalogue] = useState(false);
  const { user } = useAuth();
  const canApprove = String(user?.role || "").toUpperCase() === "SUPER_ADMIN";

  const loadCatalogue = async () => {
    setCatalogueLoading(true);
    try { const r: any = await apiClient.get("/governance-config/presentation-catalogue"); setCatalogue(rows(r)); }
    catch { setCatalogue([]); }
    finally { setCatalogueLoading(false); }
  };

  const reviewEntry = async (id: string, review_status: "APPROVED" | "REJECTED") => {
    setCatalogueSaving(id);
    try {
      await apiClient.patch(`/governance-config/presentation-catalogue/${id}/review`, { review_status });
      toast.success(review_status === "APPROVED" ? "Wording approved and now live." : "Wording rejected — canonical labels remain in use.");
      loadCatalogue();
    } catch (e: any) { toast.error(errMsg(e, "Failed to update review status.")); }
    finally { setCatalogueSaving(null); }
  };
  const [sched, setSched] = useState<any>(null);
  const [schedForm, setSchedForm] = useState<{ review_dow: number; review_time: string; reason: string }>({ review_dow: 1, review_time: "09:00", reason: "" });
  const [schedSaving, setSchedSaving] = useState(false);
  const loadSchedule = async () => {
    try {
      const sc: any = await apiClient.get("/company-admin/governance-schedule");
      const d = sc?.data?.data ?? sc?.data ?? null;
      if (d) { setSched(d); setSchedForm({ review_dow: Number(d.review_dow ?? 1), review_time: String(d.review_time || "09:00").slice(0, 5), reason: "" }); }
    } catch { /* non-blocking */ }
  };
  useEffect(() => { (async () => {
    setLoading(true);
    try { const [d, s, t] = await Promise.all([apiClient.get("/governance-config/domains").catch(() => null), apiClient.get("/governance-config/signals").catch(() => null), apiClient.get("/governance-config/thresholds").catch(() => null)]); setDomains(d ? rows(d) : []); setSignals(s ? rows(s) : []); setThresholds(t ? rows(t) : []); }
    finally { setLoading(false); }
    loadSchedule();
    loadCatalogue();
  })(); }, []);

  const saveSchedule = async () => {
    if (schedForm.reason.trim().length < 10) { toast.error("Record a brief reason for the schedule change (at least 10 characters)."); return; }
    setSchedSaving(true);
    try {
      const r: any = await apiClient.patch("/company-admin/governance-schedule", { review_dow: schedForm.review_dow, review_time: schedForm.review_time, reason: schedForm.reason.trim() });
      const ef = r?.data?.effective_from ?? r?.data?.data?.effective_from;
      toast.success(ef ? `Change saved — it takes effect from ${new Date(ef).toLocaleDateString("en-GB")}. Existing periods are unchanged.` : "Weekly review schedule change saved.");
      setSchedForm({ ...schedForm, reason: "" }); loadSchedule();
    }
    catch (e: any) { toast.error(errMsg(e, "Failed to update the weekly review schedule.")); }
    finally { setSchedSaving(false); }
  };

  return (
    <div className="space-y-5">
      <Panel title="Weekly governance review schedule">
        <p className="text-xs text-muted-foreground mb-3">All services are reviewed on this day. Reviews can take place at different times. A change applies to future periods only — existing periods, due dates and signed reviews are unchanged{sched?.timezone ? ` (${sched.timezone})` : ""}.</p>
        {sched?.review_dow != null && <p className="text-xs text-foreground mb-2"><span className="font-medium">In force now:</span> {DOW_NAMES[sched.review_dow]} · due by {String(sched.review_time || "").slice(0, 5)}</p>}
        {Array.isArray(sched?.pending) && sched.pending.length > 0 && (
          <div className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <span className="font-semibold">Scheduled change:</span> {sched.pending.map((p: any, i: number) => <span key={i}>{DOW_NAMES[p.review_dow]} · {String(p.review_time || "").slice(0, 5)} from {new Date(p.effective_from).toLocaleDateString("en-GB")}{p.reason ? ` (${p.reason})` : ""}{i < sched.pending.length - 1 ? "; " : ""}</span>)}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Weekly review day</label>
            <select value={schedForm.review_dow} onChange={(e) => setSchedForm({ ...schedForm, review_dow: Number(e.target.value) })} className="w-full p-2.5 border-2 border-border rounded-lg bg-background text-sm">
              {DOW_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Review due time</label>
            <input type="time" value={schedForm.review_time} onChange={(e) => setSchedForm({ ...schedForm, review_time: e.target.value })} className="w-full p-2.5 border-2 border-border rounded-lg bg-background text-sm" />
          </div>
        </div>
        <label className="text-[11px] text-muted-foreground block mt-3 mb-1">Reason for the change <span className="text-red-500">*</span></label>
        <input value={schedForm.reason} onChange={(e) => setSchedForm({ ...schedForm, reason: e.target.value })} placeholder="Why the schedule is changing" className="w-full p-2.5 border-2 border-border rounded-lg bg-background text-sm" />
        <div className="flex justify-end mt-3"><button onClick={saveSchedule} disabled={schedSaving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{schedSaving ? "Saving…" : "Save for future periods"}</button></div>
        {Array.isArray(sched?.history) && sched.history.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Schedule change history</div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {sched.history.slice(0, 6).map((h: any, i: number) => {
                const v = h.new_values || {};
                const after = v.after || {};
                return <li key={i}>{h.created_at ? new Date(h.created_at).toLocaleString("en-GB") : ""}{h.actor ? ` · ${h.actor}` : ""} — {typeof after.review_dow === "number" ? `${DOW_NAMES[after.review_dow]} ${String(after.review_time || "").slice(0, 5)}` : "updated"}{v.reason ? ` · ${v.reason}` : ""}</li>;
              })}
            </ul>
          </div>
        )}
      </Panel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={SlidersHorizontal} tint="bg-blue-100 text-blue-700" label="Governance domains" value={domains.length} />
        <StatCard icon={AlertTriangle} tint="bg-amber-100 text-amber-700" label="Configured signals" value={signals.length} />
        <StatCard icon={ShieldCheck} tint="bg-emerald-100 text-emerald-700" label="Thresholds" value={thresholds.length} />
      </div>
      <Panel title="Themes used by your organisation">
        {loading ? <Spinner /> : domains.length === 0 ? <p className="text-sm text-muted-foreground">No themes configured.</p> :
          <div className="flex flex-wrap gap-2">{domains.map((d: any) => <Badge key={d.id} tone="blue">{d.name || d.label || d.domain || d.key}</Badge>)}</div>}
        <p className="text-xs text-muted-foreground mt-4">Read-only reference. The governance themes, signal library and escalation thresholds are part of the shared platform model and are maintained centrally — they are not edited from provider administration.</p>
      </Panel>
      <Panel
        title="Plain-language wording review (Stage B)"
        right={<label className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><input type="checkbox" checked={showAllCatalogue} onChange={(e) => setShowAllCatalogue(e.target.checked)} />Show approved/rejected too</label>}
      >
        <p className="text-xs text-muted-foreground mb-3">
          Simplified display wording is prepared here but never affects what staff submit — the underlying canonical theme/signal is always what's recorded. A row only changes what people see once it is approved below.
          {!canApprove && " Approving or rejecting is restricted to a Super Admin."}
        </p>
        {catalogueLoading ? <Spinner /> : (() => {
          const visible = showAllCatalogue ? catalogue : catalogue.filter((c: any) => c.review_status === "DRAFT" || c.review_status === "IN_REVIEW");
          if (visible.length === 0) return <p className="text-sm text-muted-foreground">{showAllCatalogue ? "No wording entries exist yet." : "Nothing is awaiting review."}</p>;
          return (
            <div className="space-y-2">
              {visible.map((c: any) => (
                <div key={c.id} className="border border-border rounded-lg p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge tone="slate">{c.sector}</Badge>
                      <Badge tone={c.review_status === "APPROVED" ? "green" : c.review_status === "REJECTED" ? "red" : "amber"}>{c.review_status}</Badge>
                    </div>
                    <p className="text-sm text-foreground">
                      <span className="text-muted-foreground">{c.canonical_signal_label ? `${c.canonical_theme} / ${c.canonical_signal_label}` : c.canonical_theme}</span>
                      {(c.display_theme || c.display_signal) && (
                        <> → <span className="font-medium">{c.display_signal || c.display_theme}</span></>
                      )}
                    </p>
                    {c.help_text && <p className="text-xs text-muted-foreground mt-1">{c.help_text}</p>}
                  </div>
                  {canApprove && (c.review_status === "DRAFT" || c.review_status === "IN_REVIEW") && (
                    <div className="flex gap-2 shrink-0">
                      <button disabled={catalogueSaving === c.id} onClick={() => reviewEntry(c.id, "APPROVED")} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50">Approve</button>
                      <button disabled={catalogueSaving === c.id} onClick={() => reviewEntry(c.id, "REJECTED")} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold disabled:opacity-50">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </Panel>
    </div>
  );
}

/* ---------- Audit & Security ---------- */
function SecuritySection({ data, onChanged }: { data: Overview | null; onChanged: () => void }) {
  const [form, setForm] = useState(data?.security || { mfa_required: true, session_timeout_minutes: 30, exports_restricted: true });
  const [saving, setSaving] = useState(false);
  const [reviews, setReviews] = useState<AccessReview[]>([]);
  const [loadingR, setLoadingR] = useState(true);
  const [reviewsErr, setReviewsErr] = useState(false);
  useEffect(() => { if (data?.security) setForm(data.security); }, [data?.security]);
  // A load FAILURE must not read as "no reviews due" — that would hide an outstanding obligation.
  // Track the error distinctly and offer a retry instead of silently showing an empty list.
  const loadReviews = async () => { setLoadingR(true); setReviewsErr(false); try { setReviews(rows(await apiClient.get("/company-admin/access-reviews?status=OPEN"))); } catch { setReviewsErr(true); setReviews([]); } finally { setLoadingR(false); } };
  useEffect(() => { loadReviews(); }, []);

  const save = async () => { setSaving(true); try { await apiClient.patch("/company-admin/security-policy", form); toast.success("Security policy updated."); onChanged(); } catch (e: any) { toast.error(errMsg(e, "Failed to update policy.")); } finally { setSaving(false); } };
  const complete = async (id: string) => { try { await apiClient.post(`/company-admin/access-reviews/${id}/complete`, {}); toast.success("Access review completed."); loadReviews(); onChanged(); } catch (e: any) { toast.error(errMsg(e, "Failed to complete review.")); } };

  return (
    <div className="space-y-5">
      <Panel title="Security policy">
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4"><span><span className="text-sm font-medium text-foreground">MFA policy target</span><span className="block text-xs text-muted-foreground">Records the organisation's requirement. Coverage is shown separately; this control does not claim that authentication enforcement is live.</span></span><input type="checkbox" checked={form.mfa_required} onChange={e => setForm({ ...form, mfa_required: e.target.checked })} className="w-5 h-5" /></label>
          <label className="flex items-center justify-between gap-4"><span><span className="text-sm font-medium text-foreground">Idle-timeout policy target (minutes)</span><span className="block text-xs text-muted-foreground">Records the organisation's target. Actual token expiry remains controlled by the platform authentication service.</span></span><input type="number" min={5} max={480} value={form.session_timeout_minutes} onChange={e => setForm({ ...form, session_timeout_minutes: Number(e.target.value) })} className="w-24 rounded-lg border-2 border-border bg-background p-2 text-sm" /></label>
          <label className="flex items-center justify-between gap-4"><span><span className="text-sm font-medium text-foreground">Data exports restricted</span><span className="block text-xs text-muted-foreground">Enforced by server roles. A Company Admin cannot switch this protection off.</span></span><input type="checkbox" checked disabled className="w-5 h-5" /></label>
          <div className="flex justify-end"><button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{saving ? "Saving…" : "Save policy"}</button></div>
        </div>
      </Panel>
      <Panel title={`Access reviews due${reviewsErr ? "" : ` (${reviews.length})`}`}>
        {loadingR ? <Spinner /> : reviewsErr ? (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><AlertTriangle size={16} /> Access reviews are unavailable right now — this does not mean none are due.</span>
            <button onClick={loadReviews} className="text-xs font-semibold text-amber-800 border border-amber-300 rounded px-2.5 py-1 hover:bg-amber-100 shrink-0">Retry</button>
          </div>
        ) : reviews.length === 0 ? <p className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> All access is up to date.</p> :
          <ul className="divide-y divide-border">{reviews.map(r => (
            <li key={r.id} className="py-3 flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-muted text-foreground/70 text-xs font-semibold flex items-center justify-center shrink-0">{initials(r.user_name)}</span>
              <div className="flex-1 min-w-0"><div className="text-sm font-medium text-foreground truncate">{r.user_name || r.email}</div><div className="text-xs text-muted-foreground truncate">{r.email} · {roleLabel(r.role)} · last sign-in {ago(r.last_login)}</div></div>
              <button onClick={() => complete(r.id)} className="text-xs font-semibold text-primary border border-primary/30 rounded px-2.5 py-1 hover:bg-primary/10">Confirm access</button></li>))}</ul>}
      </Panel>
      <AuditLogPanel />
    </div>
  );
}

/* ---------- Full audit log (detailed, paginated, clickable) ---------- */
type AuditLogEntry = {
  id: string; action: string; resource: string; resource_id: string | null;
  old_values: any; new_values: any; metadata: any; ip_address: string | null; user_agent: string | null;
  created_at: string; actor_name: string | null; actor_email: string | null; text: string;
};
function AuditLogPanel() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "security">("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const limit = 25;

  const load = async (p = page, f = filter) => {
    setLoading(true); setErr(false);
    try {
      const qs = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (f === "security") qs.set("action", "security");
      const res: any = await apiClient.get(`/company-admin/audit-log?${qs.toString()}`);
      const d = res?.data?.data ?? res?.data ?? {};
      setItems(d.items || []); setTotal(d.total || 0);
    } catch { setErr(true); setItems([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(1, filter); setPage(1); setOpenId(null); }, [filter]);

  const pages = Math.max(1, Math.ceil(total / limit));
  const goPage = (p: number) => { const np = Math.min(Math.max(p, 1), pages); setPage(np); load(np, filter); setOpenId(null); };
  const fullDate = (iso?: string | null) => iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <Panel title={`Audit log${total ? ` (${total})` : ""}`} right={
      <div className="flex items-center gap-1 text-xs">
        <button onClick={() => setFilter("all")} className={`px-2.5 py-1 rounded-lg font-medium ${filter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>All activity</button>
        <button onClick={() => setFilter("security")} className={`px-2.5 py-1 rounded-lg font-medium ${filter === "security" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Security alerts</button>
      </div>
    }>
      {loading ? <Spinner /> : err ? (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2"><AlertTriangle size={16} /> Could not load the audit log.</span>
          <button onClick={() => load()} className="text-xs font-semibold text-amber-800 border border-amber-300 rounded px-2.5 py-1 hover:bg-amber-100 shrink-0">Retry</button>
        </div>
      ) : items.length === 0 ? <p className="text-sm text-muted-foreground">No activity recorded{filter === "security" ? " for failed sign-ins" : ""}.</p> : (
        <>
          <ul className="divide-y divide-border">
            {items.map(ev => {
              const open = openId === ev.id;
              const isSecurity = ev.action === "auth.login_failed";
              return (
                <li key={ev.id}>
                  <button onClick={() => setOpenId(open ? null : ev.id)} className="w-full flex items-start gap-3 text-left py-3 hover:bg-muted/40 -mx-1 px-1 rounded-lg transition-colors">
                    <span className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 ${isSecurity ? "bg-red-100 text-red-700" : "bg-muted text-foreground/70"}`}>
                      {isSecurity ? <AlertTriangle size={15} /> : initials(ev.actor_name || "?")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground"><strong>{ev.actor_name || ev.actor_email || "Unknown"}</strong> {ev.text}</div>
                      <div className="text-xs text-muted-foreground">{fullDate(ev.created_at)}{ev.ip_address ? ` · ${ev.ip_address}` : ""}</div>
                    </div>
                    <ChevronRight size={16} className={`text-muted-foreground shrink-0 mt-1.5 transition-transform ${open ? "rotate-90" : ""}`} />
                  </button>
                  {open && (
                    <div className="ml-11 mb-3 -mt-1 rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1.5">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div><span className="text-muted-foreground">Action: </span><code className="text-foreground">{ev.action}</code></div>
                        <div><span className="text-muted-foreground">Resource: </span><span className="text-foreground">{ev.resource}{ev.resource_id ? ` · ${ev.resource_id}` : ""}</span></div>
                        <div><span className="text-muted-foreground">Actor email: </span><span className="text-foreground">{ev.actor_email || "—"}</span></div>
                        <div><span className="text-muted-foreground">IP address: </span><span className="text-foreground">{ev.ip_address || "—"}</span></div>
                        <div className="col-span-2 truncate"><span className="text-muted-foreground">User agent: </span><span className="text-foreground">{ev.user_agent || "—"}</span></div>
                      </div>
                      {ev.old_values && Object.keys(ev.old_values).length > 0 && (
                        <div><div className="text-muted-foreground mt-2 mb-1">Before</div><pre className="bg-background border border-border rounded p-2 overflow-x-auto">{JSON.stringify(ev.old_values, null, 2)}</pre></div>
                      )}
                      {ev.new_values && Object.keys(ev.new_values).length > 0 && (
                        <div><div className="text-muted-foreground mt-2 mb-1">After</div><pre className="bg-background border border-border rounded p-2 overflow-x-auto">{JSON.stringify(ev.new_values, null, 2)}</pre></div>
                      )}
                      {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                        <div><div className="text-muted-foreground mt-2 mb-1">Metadata</div><pre className="bg-background border border-border rounded p-2 overflow-x-auto">{JSON.stringify(ev.metadata, null, 2)}</pre></div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
              <span>Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button onClick={() => goPage(page - 1)} disabled={page <= 1} className="px-2.5 py-1 rounded-lg border border-border font-medium disabled:opacity-40">Previous</button>
                <button onClick={() => goPage(page + 1)} disabled={page >= pages} className="px-2.5 py-1 rounded-lg border border-border font-medium disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

/* ---------- Data & Retention ---------- */
function RetentionSection(_props: { data: Overview | null }) {
  return (
    <Panel title="Data & retention">
      <div className="space-y-3 text-sm text-foreground">
        <div className="flex items-center gap-3"><FileDown size={18} className="text-primary" /><span>Data exports are <strong>restricted to authorised roles by the server</strong>. Company Admin cannot disable this control.</span></div>
        <div className="flex items-center gap-3"><Database size={18} className="text-emerald-600" /><span>Governance records (signals, risks, escalations, reports) are retained as an immutable audit trail and are never hard-deleted by the app.</span></div>
        <div className="flex items-center gap-3"><ArrowRight size={18} className="text-muted-foreground" /><span>Service-user transfers keep original governance history with the originating service.</span></div>
      </div>
    </Panel>
  );
}

/* ---------- Billing & Subscription ---------- */
function BillingSection() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await apiClient.get("/billing/status"); setStatus(r.data?.data || null); }
    catch (e: any) { toast.error(e?.response?.data?.message || "Failed to load billing status."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const go = async (path: "checkout" | "portal") => {
    setBusy(path);
    try {
      const r = await apiClient.post(`/billing/${path}`, {});
      const url = r.data?.data?.url;
      if (url) window.location.href = url;
      else toast.error("No billing session URL returned.");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Billing action failed."); }
    finally { setBusy(null); }
  };

  if (loading) return <Spinner />;
  if (!status) return <Panel title="Billing & subscription"><p className="text-sm text-muted-foreground">Billing status is unavailable.</p></Panel>;

  const money = (pence: number, ccy = "GBP") => new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy }).format((pence || 0) / 100);
  const s = String(status.subscription_status || "").toLowerCase();
  const tone = !status.subscription_status ? "slate" : ["active", "trialing", "pilot"].includes(s) ? "green" : ["past_due", "incomplete"].includes(s) ? "amber" : "red";
  const statusLabel = status.subscription_status ? status.subscription_status.replace(/_/g, " ") : "Not subscribed";

  return (
    <div className="space-y-6">
      {!status.configured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <span className="text-sm text-amber-900">Online payments are not switched on yet. You can review your plan here; subscribing becomes available once billing is enabled.</span>
        </div>
      )}
      <Panel title="Your subscription" right={<Badge tone={tone as any}>{statusLabel}</Badge>}>
        {!status.care_model ? (
          <p className="text-sm text-muted-foreground">Your billing basis has not been set. Please contact <a className="text-primary underline" href="mailto:support@ordincore.co.uk">support@ordincore.co.uk</a> to configure it.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Billed on</div>
              <div className="text-lg font-semibold text-foreground mt-1">{status.billable_units} {status.unit_label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{status.care_model === "DOMICILIARY" ? "Domiciliary care" : "Residential / supported living"}{status.is_pilot ? " · Pilot" : ""}</div>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Monthly price</div>
              <div className="text-lg font-semibold text-foreground mt-1">{status.current_tier ? `${money(status.current_tier.monthly_amount_pence, status.current_tier.currency)}/mo` : "—"}</div>
              {status.current_tier && <div className="text-xs text-muted-foreground mt-0.5">Tier {status.current_tier.min_units}{status.current_tier.max_units ? `–${status.current_tier.max_units}` : "+"} {status.unit_label}</div>}
            </div>
          </div>
        )}
        {status.current_period_end && (
          <p className="text-xs text-muted-foreground mt-4">{status.cancel_at_period_end ? "Access ends" : "Renews"} on {new Date(status.current_period_end).toLocaleDateString("en-GB")}.</p>
        )}
        <div className="flex flex-wrap gap-3 mt-5">
          {["active", "trialing", "past_due", "pilot"].includes(s) ? (
            <button onClick={() => go("portal")} disabled={busy !== null} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2"><CreditCard size={16} /> {busy === "portal" ? "Opening…" : "Manage billing"}</button>
          ) : (
            <button onClick={() => go("checkout")} disabled={busy !== null || !status.configured || !status.current_tier?.price_ready} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2"><CreditCard size={16} /> {busy === "checkout" ? "Opening…" : "Subscribe"}</button>
          )}
          <button onClick={load} disabled={busy !== null} className="px-4 py-2 rounded-lg border border-border text-sm font-medium inline-flex items-center gap-2"><RefreshCw size={15} /> Refresh</button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Payments are collected automatically each month. You can cancel any time from “Manage billing” — access continues until the end of the period you have paid for, after which staff access is suspended until you renew.</p>
      </Panel>
    </div>
  );
}

/* ---------- Help ---------- */
function HelpSection() {
  const items = [
    { icon: UserPlus, t: "People & Access", d: "Create staff accounts, set their role, suspend or reactivate accounts, and confirm periodic access reviews." },
    { icon: Building2, t: "Services", d: "Add and view the services (houses) in your organisation." },
    { icon: UsersRound, t: "Service Users", d: "View service users and transfer them between services; governance history stays intact." },
    { icon: ShieldCheck, t: "Audit & Security", d: "Record MFA and timeout policy targets, review actual MFA coverage, inspect audit activity and complete access reviews. Export restrictions remain server-enforced." },
    { icon: Mail, t: "Support", d: "Contact support@ordincore.co.uk for help with your organisation's administration." },
  ];
  return (
    <Panel title="Help">
      <ul className="space-y-4">{items.map((i, k) => (
        <li key={k} className="flex items-start gap-3"><span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><i.icon size={18} /></span>
          <div><div className="font-medium text-foreground">{i.t}</div><div className="text-sm text-muted-foreground">{i.d}</div></div></li>))}</ul>
    </Panel>
  );
}
