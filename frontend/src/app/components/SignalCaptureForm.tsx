import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  Layers,
  Loader2,
  Save,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

// Spec module 1: a signal is a simple concern, not an incident.
// No risk scoring, no likelihood/impact, no investigation language.
type SignalCategory =
  | 'Wellbeing'
  | 'Medication'
  | 'Behaviour'
  | 'Safeguarding'
  | 'Staffing'
  | 'Environment'
  | 'Documentation'
  | 'Service Delivery';

type SeverityType = 'Low' | 'Moderate' | 'High' | 'Critical';

const CATEGORIES: SignalCategory[] = [
  'Wellbeing', 'Medication', 'Behaviour', 'Safeguarding',
  'Staffing', 'Environment', 'Documentation', 'Service Delivery',
];

const SEVERITIES: { value: SeverityType; tone: string }[] = [
  { value: 'Low', tone: 'data-[active=true]:bg-emerald-600' },
  { value: 'Moderate', tone: 'data-[active=true]:bg-amber-500' },
  { value: 'High', tone: 'data-[active=true]:bg-orange-600' },
  { value: 'Critical', tone: 'data-[active=true]:bg-red-600' },
];

interface ServiceUnit { id: string; name: string; }

export function SignalCaptureForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [services, setServices] = useState<ServiceUnit[]>([]);
  const [serviceUsers, setServiceUsers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Configurable governance themes (grouped under six pillars) + their signal library.
  type SignalMeta = { label: string; escalation: 'IMMEDIATE' | 'CONDITIONAL' | 'NONE' };
  type Domain = { name: string; description?: string; pillar?: string | null; signals: string[]; signalsMeta?: SignalMeta[] };
  const [domains, setDomains] = useState<Domain[]>([]);

  const now = new Date();
  const [form, setForm] = useState({
    service_id: '',
    governance_domain: '',
    signal_label: '',
    severity: '' as SeverityType | '',
    description: '',
    entry_date: now.toISOString().split('T')[0],
    entry_time: now.toTimeString().slice(0, 5),
    related_person: '',
    service_user_id: '',
    immediate_action: '',
  });

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  useEffect(() => { loadServices(); }, []);

  // Sector is per-service: reload the domain library for the chosen service, and
  // reset the domain/signal selection when the service changes.
  useEffect(() => { loadDomains(form.service_id); }, [form.service_id]);

  const loadDomains = async (serviceId?: string) => {
    try {
      const qs = serviceId ? `?house_id=${serviceId}` : '';
      const res = await apiClient.get(`/governance/domains${qs}`);
      const list = (res as any).data?.domains || [];
      setDomains(Array.isArray(list) ? list : []);
      // If the previously chosen domain is not in the new (sector) library, clear it.
      setForm(prev => (prev.governance_domain && !list.some((d: any) => d.name === prev.governance_domain))
        ? { ...prev, governance_domain: '', signal_label: '' } : prev);
    } catch {
      setDomains([]);
    }
  };

  const selectedDomain = domains.find(d => d.name === form.governance_domain);
  const selectedSignalMeta = selectedDomain?.signalsMeta?.find(s => s.label === form.signal_label);

  // Group themes under their governance pillar for the dropdown (falls back to a
  // single "Governance" group if a sector hasn't been tagged with pillars).
  const pillarOrder = [
    'People & Safety', 'Quality of Life & Outcomes', 'Workforce & Capability',
    'Governance & Compliance', 'Culture & Leadership', 'Strategic Assurance',
  ];
  const groupedByPillar = domains.reduce<Record<string, Domain[]>>((acc, d) => {
    const key = d.pillar || 'Governance';
    (acc[key] = acc[key] || []).push(d);
    return acc;
  }, {});
  const pillarGroups = [
    ...pillarOrder.filter(p => groupedByPillar[p]),
    ...Object.keys(groupedByPillar).filter(p => !pillarOrder.includes(p)),
  ];

  useEffect(() => {
    // Person is per-service — clear any previous selection when the service changes.
    setForm(prev => ({ ...prev, service_user_id: '', related_person: '' }));
    if (!form.service_id) { setServiceUsers([]); return; }
    apiClient.get(`/houses/${form.service_id}/service-users`)
      .then(res => {
        const u = (res as any).data?.data || (res as any).data || [];
        setServiceUsers(Array.isArray(u) ? u : []);
      })
      .catch(() => setServiceUsers([]));
  }, [form.service_id]);

  const loadServices = async () => {
    try {
      const res = await apiClient.get('/houses?limit=100');
      const data = (res as any).data?.data || (res as any).data || [];
      let list: ServiceUnit[] = Array.isArray(data) ? data : [];
      const role = (user?.role || '').toUpperCase().replace('-', '_');
      if (['TEAM_LEADER', 'TL', 'REGISTERED_MANAGER', 'RM'].includes(role)) {
        const assigned = (user as any)?.assigned_house_ids || ((user as any)?.assigned_house_id ? [(user as any).assigned_house_id] : []);
        if (assigned.length > 0 && !assigned.includes('all')) {
          list = list.filter(h => assigned.includes(h.id));
        }
      }
      setServices(list);
      if (list.length > 0) {
        set('service_id', list[0].id);
      } else {
        // A Team Leader with no assigned service cannot record a signal (house_id
        // is required). Make this explicit rather than leaving the form silently
        // un-submittable — this is the "some TLs can record, some can't" case.
        const role = (user?.role || '').toUpperCase().replace('-', '_');
        if (['TEAM_LEADER', 'TL', 'REGISTERED_MANAGER', 'RM'].includes(role)) {
          toast.error('You are not assigned to a service yet. Ask an administrator to assign you to a service before recording signals.');
        }
      }
    } catch {
      toast.error('Failed to load services');
    }
  };

  // Immediate action is now compulsory: a signal must record what was done at the time (or an
  // explicit "no action taken, escalated to…"), so the governance record shows a response, never
  // a silent observation.
  const isValid = !!form.service_id && !!form.governance_domain && !!form.severity
    && form.description.trim().length >= 10 && form.immediate_action.trim().length >= 3;

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error('Please choose a service, governance domain, severity, a short description, and record the immediate action taken.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/pulses', {
        service_id: form.service_id,
        governance_domain: form.governance_domain,
        signal_label: form.signal_label || undefined,
        // Keep legacy category populated for back-compat dashboards.
        category: form.governance_domain,
        severity: form.severity,
        description: form.description.trim(),
        entry_date: form.entry_date,
        entry_time: form.entry_time,
        // Controlled attribution: send the service-user identifier; the readable name is
        // kept for back-compat displays and resolved server-side from the id.
        service_user_id: form.service_user_id || undefined,
        related_person: form.related_person || undefined,
        immediate_action: form.immediate_action || undefined,
      });
      toast.success('Signal recorded');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record signal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="max-w-2xl mx-auto pt-28 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Activity size={22} /></div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Record a Signal</h1>
            <p className="text-sm text-muted-foreground">Something that may need attention. Keep it short and factual.</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6 mt-6">
          {/* Service */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2"><Layers size={16} /> Service</label>
            <select
              value={form.service_id}
              onChange={e => set('service_id', e.target.value)}
              className="w-full bg-input-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="" disabled>Select a service…</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Governance Theme (grouped by the six governance pillars) */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2"><Layers size={16} /> Governance Theme</label>
            <select
              value={form.governance_domain}
              onChange={e => { set('governance_domain', e.target.value); set('signal_label', ''); }}
              className="w-full bg-input-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="" disabled>Select a theme…</option>
              {pillarGroups.map(pillar => (
                <optgroup key={pillar} label={pillar}>
                  {groupedByPillar[pillar].map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedDomain?.description && (
              <p className="text-xs text-muted-foreground mt-1">{selectedDomain.description}</p>
            )}
          </div>

          {/* Specific signal within the chosen theme */}
          {selectedDomain && selectedDomain.signals.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2"><FileText size={16} /> Signal</label>
              <select
                value={form.signal_label}
                onChange={e => set('signal_label', e.target.value)}
                className="w-full bg-input-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a signal…</option>
                {(selectedDomain.signalsMeta && selectedDomain.signalsMeta.length > 0
                  ? selectedDomain.signalsMeta.map(s => s.label)
                  : selectedDomain.signals).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Per-signal escalation notice so the recorder knows what happens on save. */}
              {selectedSignalMeta?.escalation === 'IMMEDIATE' && (
                <div className="mt-2 flex items-start gap-2 text-xs rounded-lg p-2.5 bg-red-500/10 text-red-700 border border-red-500/30">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>This signal is escalated to the Registered Manager <b>immediately</b> on saving — it does not wait for a pattern to form.</span>
                </div>
              )}
              {selectedSignalMeta?.escalation === 'CONDITIONAL' && (
                <div className="mt-2 flex items-start gap-2 text-xs rounded-lg p-2.5 bg-amber-500/10 text-amber-700 border border-amber-500/30">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>If you mark this <b>High</b> or <b>Critical</b>, it is escalated to the Registered Manager immediately.</span>
                </div>
              )}
            </div>
          )}

          {/* Severity */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2"><AlertTriangle size={16} /> Severity</label>
            <div className="grid grid-cols-4 gap-2">
              {SEVERITIES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  data-active={form.severity === s.value}
                  onClick={() => set('severity', s.value)}
                  className={`px-3 py-2.5 rounded-lg border text-sm transition-all data-[active=true]:text-white data-[active=true]:border-transparent ${s.tone} ${form.severity === s.value ? '' : 'bg-card border-border hover:border-primary/50'}`}
                >
                  {s.value}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2"><FileText size={16} /> What happened?</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              spellCheck
              maxLength={200}
              placeholder="A short governance observation (2–3 lines), factual only…"
              className="w-full h-28 bg-input-background border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">{form.description.length}/200 · minimum 10 — a signal is a short governance observation, not a care note</p>
          </div>

          {/* Date / Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2"><Calendar size={16} /> Date</label>
              <input type="date" value={form.entry_date} onChange={e => set('entry_date', e.target.value)}
                className="w-full bg-input-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2"><Clock size={16} /> Time</label>
              <input type="time" value={form.entry_time} onChange={e => set('entry_time', e.target.value)}
                className="w-full bg-input-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {/* Client — controlled service-user selection (stores the person's identifier, not a
              typed name) so signals are reliably attributable and searchable over time. */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2"><User size={16} /> Person <span className="text-muted-foreground font-normal">(optional)</span></label>
            <select
              value={form.service_user_id}
              onChange={e => {
                const id = e.target.value;
                const su = serviceUsers.find((u: any) => String(u.id) === id);
                setForm(prev => ({ ...prev, service_user_id: id, related_person: su?.display_name || '' }));
              }}
              disabled={!form.service_id}
              className="w-full bg-input-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            >
              <option value="">{form.service_id ? '— Not about a specific person —' : 'Select a service first'}</option>
              {serviceUsers.map((u: any, i: number) => <option key={`${u.id || i}`} value={u.id}>{u.display_name}</option>)}
            </select>
          </div>

          {/* Immediate action (compulsory) */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2"><FileText size={16} /> Immediate action taken <span className="text-destructive font-normal">*</span></label>
            <textarea
              value={form.immediate_action}
              onChange={e => set('immediate_action', e.target.value)}
              spellCheck
              placeholder="What was done at the time? If nothing, say so and who it was escalated to."
              className="w-full h-20 bg-input-background border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
              {isSubmitting ? 'Recording…' : 'Record Signal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
