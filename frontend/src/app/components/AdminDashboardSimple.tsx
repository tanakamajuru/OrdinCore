import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Users, Building, Activity, Flag, ClipboardList, ShieldCheck, RefreshCw, Settings,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { apiClient } from '@/services/api';
import AdminSidebar from './shared/AdminSidebar';

const unwrap = (res: any): any => res?.data?.data ?? res?.data ?? [];
const asArray = (v: any): any[] => (Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : []);

const ROLE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];
const ROLE_LABELS: Record<string, string> = {
  TEAM_LEADER: 'Team Leader', REGISTERED_MANAGER: 'Registered Manager', DIRECTOR: 'Director',
  RESPONSIBLE_INDIVIDUAL: 'Responsible Individual', ADMIN: 'Admin', SUPER_ADMIN: 'Super Admin',
};

// Spec module 4: the time-bound escalation rule set (configuration view).
const ESCALATION_RULES = [
  { name: 'Medication – Repeated', trigger: '3+ signals in 14 days', to: 'RM', time: '72 hours' },
  { name: 'Safeguarding – Serious', trigger: 'Serious concern', to: 'Director', time: '48 hours' },
  { name: 'Multi-Site Trend', trigger: 'Same theme across 2+ services', to: 'Director', time: '72 hours' },
  { name: 'Action Ineffective', trigger: 'Ineffective ×2', to: 'Director', time: '72 hours' },
  { name: 'Serious Incident', trigger: 'SI or CQC reportable', to: 'RI', time: '24 hours' },
];

function StatCard({ icon: Icon, label, value, sub, tone }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-1 text-foreground">{value}</p></div>
        <div className={`p-2 rounded-lg ${tone}`}><Icon className="w-5 h-5" /></div>
      </div>
      {sub && <p className="mt-2 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Donut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={total ? data : [{ name: 'None', value: 1, color: '#e5e7eb' }]} dataKey="value" innerRadius={42} outerRadius={60} paddingAngle={2}>
              {(total ? data : [{ color: '#e5e7eb' }]).map((d: any, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl font-semibold">{total}</span></div>
      </div>
      <div className="space-y-1.5 text-xs flex-1">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-muted-foreground flex-1">{d.name}</span><span className="font-medium">{d.value}</span>
          </div>
        ))}
        {data.length === 0 && <p className="text-muted-foreground">No data</p>}
      </div>
    </div>
  );
}

const AdminDashboardSimple: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<any>({});
  const [houseStats, setHouseStats] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [escStats, setEscStats] = useState<any>({});
  const [actions, setActions] = useState<any[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const [us, hs, ul, sig, esc, est, act] = await Promise.all([
        apiClient.getAdminUserStats().catch(() => ({})),
        apiClient.getAdminHouseStats().catch(() => ({})),
        apiClient.getUsers(1, 500).catch(() => ({})),
        apiClient.get('/pulses?limit=200').catch(() => ({})),
        apiClient.getEscalations(1, 200).catch(() => ({})),
        apiClient.getEscalationStats().catch(() => ({})),
        apiClient.getRisksActions().catch(() => ({})),
      ]);
      setUserStats(unwrap(us) || {});
      setHouseStats(unwrap(hs) || {});
      const ulData = unwrap(ul);
      setUsers(asArray(ulData?.data ?? ulData));
      setSignals(asArray(unwrap(sig)));
      setEscalations(asArray(unwrap(esc)));
      setEscStats(unwrap(est) || {});
      setActions(asArray(unwrap(act)));
    } catch (e) {
      console.error('Failed to load admin dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" /><span>Loading dashboard…</span>
    </div>
  );

  const roleCounts: Record<string, number> = {};
  users.forEach(u => { const r = (u.role || 'OTHER').toUpperCase(); roleCounts[r] = (roleCounts[r] || 0) + 1; });
  const roleData = Object.entries(roleCounts).map(([r, v], i) => ({ name: ROLE_LABELS[r] || r, value: v, color: ROLE_COLORS[i % ROLE_COLORS.length] }));

  const openEsc = escalations.filter(e => (e.lifecycle_status || '') !== 'Closed').length;
  const overdueActions = actions.filter(a => a.status === 'Overdue' || (a.due_date && new Date(a.due_date).getTime() < Date.now() && !['Complete', 'Completed', 'Cancelled'].includes(a.status))).length;
  const closedEsc = Number(escStats.closed || 0);

  const lifecycleDonut = [
    { name: 'Open', value: Number(escStats.new_open || 0), color: '#ef4444' },
    { name: 'Under Review', value: Number(escStats.under_review || 0), color: '#f59e0b' },
    { name: 'Actions Implemented', value: Number(escStats.actions_implemented || 0), color: '#3b82f6' },
    { name: 'Monitoring Effectiveness', value: Number(escStats.monitoring_effectiveness || 0), color: '#8b5cf6' },
    { name: 'Closed', value: closedEsc, color: '#10b981' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="ml-64 p-6 max-w-[1400px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">System overview and administration</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"><RefreshCw className="w-4 h-4" /> Refresh</button>
            <button onClick={() => navigate('/admin-settings')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90"><Settings className="w-4 h-4" /> System Settings</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard icon={Users} tone="bg-violet-100 text-violet-600" label="Total Users" value={userStats.total ?? users.length} sub={`${userStats.active ?? 0} active`} />
          <StatCard icon={Building} tone="bg-blue-100 text-blue-600" label="Active Services" value={houseStats.active ?? houseStats.total ?? 0} sub="services" />
          <StatCard icon={Activity} tone="bg-emerald-100 text-emerald-600" label="Signals This Month" value={signals.length} sub="recorded" />
          <StatCard icon={Flag} tone="bg-orange-100 text-orange-600" label="Open Escalations" value={openEsc} sub="active" />
          <StatCard icon={ClipboardList} tone="bg-red-100 text-red-600" label="Actions Overdue" value={overdueActions} sub="past due" />
          <StatCard icon={ShieldCheck} tone="bg-emerald-100 text-emerald-600" label="System Health" value="Healthy" sub="all systems operational" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Users by Role</h3>
            <Donut data={roleData} />
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Escalations by Status</h3>
            <Donut data={lifecycleDonut} />
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Data Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Signals', value: signals.length },
                { label: 'Total Actions', value: actions.length },
                { label: 'Closed Escalations', value: closedEsc },
                { label: 'Open Escalations', value: openEsc },
              ].map(d => (
                <div key={d.label} className="border border-border rounded-lg p-3">
                  <p className="text-xl font-semibold">{d.value}</p>
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Escalation Rules Overview</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2">Rule Name</th><th className="px-2">Trigger</th><th className="px-2">Escalate To</th><th className="px-2">Timeframe</th><th className="px-2">Status</th>
                </tr></thead>
                <tbody>
                  {ESCALATION_RULES.map(r => (
                    <tr key={r.name} className="border-b border-border/50">
                      <td className="py-2.5 pr-2 font-medium">{r.name}</td>
                      <td className="px-2 text-muted-foreground">{r.trigger}</td>
                      <td className="px-2">{r.to}</td>
                      <td className="px-2">{r.time}</td>
                      <td className="px-2"><span className="text-xs rounded px-2 py-0.5 bg-emerald-100 text-emerald-700">Active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => navigate('/admin-users')} className="w-full text-left px-4 py-2.5 rounded-lg border border-border hover:bg-muted text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Manage Users</button>
              <button onClick={() => navigate('/admin-houses')} className="w-full text-left px-4 py-2.5 rounded-lg border border-border hover:bg-muted text-sm flex items-center gap-2"><Building className="w-4 h-4 text-primary" /> Manage Services</button>
              <button onClick={() => navigate('/reports')} className="w-full text-left px-4 py-2.5 rounded-lg border border-border hover:bg-muted text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> Reports</button>
              <button onClick={() => navigate('/admin-settings')} className="w-full text-left px-4 py-2.5 rounded-lg border border-border hover:bg-muted text-sm flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> System Settings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardSimple;
