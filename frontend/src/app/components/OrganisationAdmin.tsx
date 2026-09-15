import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Home, Users, Building2, UsersRound, SlidersHorizontal, ShieldCheck, Database, HelpCircle,
  Shield, Lock, Calendar, AlertTriangle, ChevronRight, UserPlus, ArrowLeftRight, KeyRound,
  RefreshCw, CheckCircle2, UserX, FileDown, ArrowRight, X, Plus, Search, Mail, ExternalLink,
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
type Section = "overview" | "people" | "services" | "serviceusers" | "governance" | "security" | "retention" | "help";

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
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
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
  const [section, setSection] = useState<Section>("overview");
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
    { key: "governance", label: "Governance Configuration", icon: SlidersHorizontal },
    { key: "security", label: "Audit & Security", icon: ShieldCheck },
    { key: "retention", label: "Data & Retention", icon: Database },
    { key: "help", label: "Help", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 min-h-screen flex flex-col text-[#D9E8F3]" style={{ background: "linear-gradient(180deg,#0D2944,#081B2E)" }}>
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-primary/90 flex items-center justify-center"><Shield size={18} className="text-white" /></div>
          <div><div className="font-bold tracking-tight text-white leading-none">ORDIN <span className="font-light">CORE</span></div><div className="text-[10px] text-sky-200/70 mt-0.5">Safer care. Stronger organisations.</div></div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(n => (
            <button key={n.key} onClick={() => setSection(n.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${section === n.key ? "bg-primary text-white shadow-[inset_3px_0_0_#71C4EE]" : "text-sky-100/80 hover:bg-white/8 hover:text-white"}`}>
              <n.icon size={18} strokeWidth={1.8} /> {n.label}
            </button>
          ))}
        </nav>
        <div className="px-5 py-4 text-[11px] text-sky-200/50 leading-snug">Good governance<br />brighter tomorrows.</div>
      </aside>

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

        {loading && section === "overview" ? <Spinner />
          : section === "overview" ? <OverviewSection data={data} go={setSection} reload={load} />
          : section === "people" ? <PeopleSection />
          : section === "services" ? <ServicesSection />
          : section === "serviceusers" ? <ServiceUsersSection />
          : section === "governance" ? <GovernanceSection navigate={navigate} />
          : section === "security" ? <SecuritySection data={data} onChanged={load} />
          : section === "retention" ? <RetentionSection data={data} />
          : <HelpSection />}
      </main>
    </div>
  );
}

/* ---------- Overview ---------- */
function StatCard({ icon: Icon, tint, label, value }: { icon: any; tint: string; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tint}`}><Icon size={22} /></div>
      <div><div className="text-sm text-muted-foreground">{label}</div><div className="text-3xl font-bold text-foreground leading-tight">{value}</div></div>
    </div>
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
        <StatCard icon={AlertTriangle} tint="bg-red-100 text-red-700" label="Security alerts" value={data.stats.security_alerts} />
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
        <Panel title="Recent admin activity">
          {data.activity.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity.</p> :
            <ul className="space-y-3">{data.activity.slice(0, 5).map(ev => (
              <li key={ev.id} className="flex items-start gap-3"><span className="w-8 h-8 rounded-full bg-muted text-foreground/70 text-xs font-semibold flex items-center justify-center shrink-0">{initials(ev.actor)}</span>
                <div className="min-w-0"><div className="text-sm text-foreground"><strong>{ev.actor}</strong> {ev.text}</div><div className="text-xs text-muted-foreground">{ago(ev.at)}</div></div></li>))}</ul>}
        </Panel>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Security controls" right={<button onClick={() => go("security")} className="text-muted-foreground hover:text-primary"><ChevronRight size={18} /></button>}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SecTile ok={data.security.mfa_required} title="MFA required" sub={data.security.mfa_required ? "Enabled for all users" : "Not enforced"} />
            <SecTile ok title={`Session timeout ${data.security.session_timeout_minutes} min`} sub="Automatically ends idle sessions" />
            <SecTile ok={data.security.exports_restricted} title="Exports restricted" sub={data.security.exports_restricted ? "Limited to authorised users" : "Open to all roles"} />
          </div>
        </Panel>
        <Panel title="Quick actions">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickAction icon={UserPlus} label="Invite user" onClick={() => go("people")} />
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
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [invite, setInvite] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", role: "SUPPORT_WORKER", password: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => { setLoading(true); try { setList(rows(await apiClient.get("/users?limit=500"))); } catch { toast.error("Failed to load users."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const filtered = list.filter(u => { const s = q.toLowerCase(); return !s || fullName(u).toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s) || roleLabel(u.role).toLowerCase().includes(s); });

  const submitInvite = async () => {
    if (!form.first_name || !form.last_name || !form.email) { toast.error("Name and email are required."); return; }
    if (form.password.length < 8) { toast.error("Set a temporary password of at least 8 characters."); return; }
    setBusy(true);
    try { await apiClient.post("/users", form); toast.success("User invited."); setInvite(false); setForm({ first_name: "", last_name: "", email: "", role: "SUPPORT_WORKER", password: "" }); load(); }
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

  return (
    <Panel title={`People & Access (${filtered.length})`} right={
      <div className="flex items-center gap-2">
        <div className="relative"><Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-sm w-44" /></div>
        <button onClick={() => setInvite(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold"><UserPlus size={15} /> Invite user</button>
      </div>}>
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2 pr-3 font-semibold">Name</th><th className="py-2 pr-3 font-semibold">Email</th><th className="py-2 pr-3 font-semibold">Role</th><th className="py-2 pr-3 font-semibold">Status</th><th className="py-2 pr-3 font-semibold">Last sign-in</th><th className="py-2 font-semibold text-right">Actions</th></tr></thead>
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
                    <td className="py-2.5 pr-3">{active ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{ago(u.last_login)}</td>
                    <td className="py-2.5 text-right"><button onClick={() => toggleStatus(u)} className={`text-xs font-semibold rounded px-2.5 py-1 border ${active ? "text-amber-700 border-amber-300 hover:bg-amber-50" : "text-emerald-700 border-emerald-300 hover:bg-emerald-50"}`}>{active ? "Suspend" : "Activate"}</button></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {invite && (
        <Modal title="Invite user" onClose={() => setInvite(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input className={inputCls} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></Field>
            <Field label="Last name"><input className={inputCls} value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></Field>
          </div>
          <Field label="Email"><input className={inputCls} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role"><select className={inputCls} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></Field>
          <Field label="Temporary password"><input className={inputCls} type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="They can change it after first sign-in" /></Field>
          <div className="flex justify-end gap-2 pt-1"><button onClick={() => setInvite(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button><button onClick={submitInvite} disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? "Inviting…" : "Invite"}</button></div>
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

  const load = async () => { setLoading(true); try { setList(rows(await apiClient.get("/houses?limit=500"))); } catch { toast.error("Failed to load services."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Service name is required."); return; }
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
              <div className="text-xs text-muted-foreground capitalize">{h.sector || "Care service"}</div>
              {(h.city || h.postcode) && <div className="text-xs text-muted-foreground mt-1">{[h.address, h.city, h.postcode].filter(Boolean).join(", ")}</div>}
            </div>
          ))}
        </div>
      )}
      {add && (
        <Modal title="Add service" onClose={() => setAdd(false)}>
          <Field label="Service name"><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Type / sector"><input className={inputCls} value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} placeholder="e.g. Residential care" /></Field>
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

  const load = async () => {
    setLoading(true);
    try { const [su, h] = await Promise.all([apiClient.get("/service-users"), apiClient.get("/houses?limit=500")]); setList(rows(su)); setHouses(rows(h)); }
    catch { toast.error("Failed to load service users."); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!dest) { toast.error("Choose a destination service."); return; }
    if (reason.trim().length < 5) { toast.error("Add a short reason for the transfer."); return; }
    setBusy(true);
    try { await apiClient.post(`/service-users/${transfer.id}/transfer`, { destination_house_id: dest, reason: reason.trim() }); toast.success("Service user transferred."); setTransfer(null); setDest(""); setReason(""); load(); }
    catch (e: any) { toast.error(errMsg(e, "Failed to transfer.")); } finally { setBusy(false); }
  };

  return (
    <Panel title={`Service Users (${list.length})`}>
      {loading ? <Spinner /> : list.length === 0 ? <p className="text-sm text-muted-foreground">No service users yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="py-2 pr-3 font-semibold">Name</th><th className="py-2 pr-3 font-semibold">Current service</th><th className="py-2 font-semibold text-right">Actions</th></tr></thead>
            <tbody>
              {list.map(su => (
                <tr key={su.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-3 font-medium text-foreground">{fullName(su)}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{su.house_name || houses.find(h => h.id === su.house_id)?.name || "—"}</td>
                  <td className="py-2.5 text-right"><button onClick={() => { setTransfer(su); setDest(""); setReason(""); }} className="text-xs font-semibold text-primary border border-primary/30 rounded px-2.5 py-1 hover:bg-primary/10 inline-flex items-center gap-1"><ArrowLeftRight size={13} /> Transfer</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {transfer && (
        <Modal title={`Transfer ${fullName(transfer)}`} onClose={() => setTransfer(null)}>
          <p className="text-xs text-muted-foreground">Transfers change the current placement only; governance history stays with the originating service.</p>
          <Field label="Destination service"><select className={inputCls} value={dest} onChange={e => setDest(e.target.value)}><option value="">Choose…</option>{houses.filter(h => h.id !== transfer.house_id).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
          <Field label="Reason"><textarea className={inputCls} rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this service user moving?" /></Field>
          <div className="flex justify-end gap-2 pt-1"><button onClick={() => setTransfer(null)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button><button onClick={submit} disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? "Transferring…" : "Transfer"}</button></div>
        </Modal>
      )}
    </Panel>
  );
}

/* ---------- Governance Configuration ---------- */
function GovernanceSection({ navigate }: { navigate: (p: string) => void }) {
  const [domains, setDomains] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    setLoading(true);
    try { const [d, s, t] = await Promise.all([apiClient.get("/governance-config/domains").catch(() => null), apiClient.get("/governance-config/signals").catch(() => null), apiClient.get("/governance-config/thresholds").catch(() => null)]); setDomains(d ? rows(d) : []); setSignals(s ? rows(s) : []); setThresholds(t ? rows(t) : []); }
    finally { setLoading(false); }
  })(); }, []);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={SlidersHorizontal} tint="bg-blue-100 text-blue-700" label="Governance domains" value={domains.length} />
        <StatCard icon={AlertTriangle} tint="bg-amber-100 text-amber-700" label="Configured signals" value={signals.length} />
        <StatCard icon={ShieldCheck} tint="bg-emerald-100 text-emerald-700" label="Thresholds" value={thresholds.length} />
      </div>
      <Panel title="Governance domains" right={<button onClick={() => navigate("/governance-config")} className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">Open full editor <ExternalLink size={14} /></button>}>
        {loading ? <Spinner /> : domains.length === 0 ? <p className="text-sm text-muted-foreground">No domains configured.</p> :
          <div className="flex flex-wrap gap-2">{domains.map((d: any) => <Badge key={d.id} tone="blue">{d.name || d.label || d.domain || d.key}</Badge>)}</div>}
        <p className="text-xs text-muted-foreground mt-4">Domains, signal library and escalation thresholds are edited in the dedicated Governance Configuration editor, which keeps the frozen governance model consistent.</p>
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
  useEffect(() => { if (data?.security) setForm(data.security); }, [data?.security]);
  const loadReviews = async () => { setLoadingR(true); try { setReviews(rows(await apiClient.get("/company-admin/access-reviews?status=OPEN"))); } catch { setReviews([]); } finally { setLoadingR(false); } };
  useEffect(() => { loadReviews(); }, []);

  const save = async () => { setSaving(true); try { await apiClient.patch("/company-admin/security-policy", form); toast.success("Security policy updated."); onChanged(); } catch (e: any) { toast.error(errMsg(e, "Failed to update policy.")); } finally { setSaving(false); } };
  const complete = async (id: string) => { try { await apiClient.post(`/company-admin/access-reviews/${id}/complete`, {}); toast.success("Access review completed."); loadReviews(); onChanged(); } catch (e: any) { toast.error(errMsg(e, "Failed to complete review.")); } };

  return (
    <div className="space-y-5">
      <Panel title="Security policy">
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4"><span><span className="text-sm font-medium text-foreground">Require multi-factor authentication</span><span className="block text-xs text-muted-foreground">All users must set up MFA to sign in.</span></span><input type="checkbox" checked={form.mfa_required} onChange={e => setForm({ ...form, mfa_required: e.target.checked })} className="w-5 h-5" /></label>
          <label className="flex items-center justify-between gap-4"><span><span className="text-sm font-medium text-foreground">Session timeout (minutes)</span><span className="block text-xs text-muted-foreground">Idle sessions end automatically. 5–480.</span></span><input type="number" min={5} max={480} value={form.session_timeout_minutes} onChange={e => setForm({ ...form, session_timeout_minutes: Number(e.target.value) })} className="w-24 rounded-lg border-2 border-border bg-background p-2 text-sm" /></label>
          <label className="flex items-center justify-between gap-4"><span><span className="text-sm font-medium text-foreground">Restrict data exports</span><span className="block text-xs text-muted-foreground">Only authorised roles may export data.</span></span><input type="checkbox" checked={form.exports_restricted} onChange={e => setForm({ ...form, exports_restricted: e.target.checked })} className="w-5 h-5" /></label>
          <div className="flex justify-end"><button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{saving ? "Saving…" : "Save policy"}</button></div>
        </div>
      </Panel>
      <Panel title={`Access reviews due (${reviews.length})`}>
        {loadingR ? <Spinner /> : reviews.length === 0 ? <p className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> All access is up to date.</p> :
          <ul className="divide-y divide-border">{reviews.map(r => (
            <li key={r.id} className="py-3 flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-muted text-foreground/70 text-xs font-semibold flex items-center justify-center shrink-0">{initials(r.user_name)}</span>
              <div className="flex-1 min-w-0"><div className="text-sm font-medium text-foreground truncate">{r.user_name || r.email}</div><div className="text-xs text-muted-foreground truncate">{r.email} · {roleLabel(r.role)} · last sign-in {ago(r.last_login)}</div></div>
              <button onClick={() => complete(r.id)} className="text-xs font-semibold text-primary border border-primary/30 rounded px-2.5 py-1 hover:bg-primary/10">Confirm access</button></li>))}</ul>}
      </Panel>
      <Panel title="Recent admin activity">
        {(data?.activity || []).length === 0 ? <p className="text-sm text-muted-foreground">No recent activity.</p> :
          <ul className="space-y-3">{(data?.activity || []).map(ev => (
            <li key={ev.id} className="flex items-start gap-3"><span className="w-8 h-8 rounded-full bg-muted text-foreground/70 text-xs font-semibold flex items-center justify-center shrink-0">{initials(ev.actor)}</span>
              <div className="min-w-0"><div className="text-sm text-foreground"><strong>{ev.actor}</strong> {ev.text}</div><div className="text-xs text-muted-foreground">{ago(ev.at)}</div></div></li>))}</ul>}
      </Panel>
    </div>
  );
}

/* ---------- Data & Retention ---------- */
function RetentionSection({ data }: { data: Overview | null }) {
  return (
    <Panel title="Data & retention">
      <div className="space-y-3 text-sm text-foreground">
        <div className="flex items-center gap-3"><FileDown size={18} className="text-primary" /><span>Data exports are <strong>{data?.security.exports_restricted ? "restricted to authorised users" : "open to all roles"}</strong>. Change this under Audit &amp; Security.</span></div>
        <div className="flex items-center gap-3"><Database size={18} className="text-emerald-600" /><span>Governance records (signals, risks, escalations, reports) are retained as an immutable audit trail and are never hard-deleted by the app.</span></div>
        <div className="flex items-center gap-3"><ArrowRight size={18} className="text-muted-foreground" /><span>Service-user transfers keep original governance history with the originating service.</span></div>
      </div>
    </Panel>
  );
}

/* ---------- Help ---------- */
function HelpSection() {
  const items = [
    { icon: UserPlus, t: "People & Access", d: "Invite staff, set their role, suspend or reactivate accounts, and confirm periodic access reviews." },
    { icon: Building2, t: "Services", d: "Add and view the services (houses) in your organisation." },
    { icon: UsersRound, t: "Service Users", d: "View service users and transfer them between services; governance history stays intact." },
    { icon: ShieldCheck, t: "Audit & Security", d: "Set your security policy (MFA, session timeout, export restrictions) and clear access reviews." },
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
