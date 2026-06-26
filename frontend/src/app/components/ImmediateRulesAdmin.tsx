/**
 * ImmediateRulesAdmin.tsx
 * ----------------------------------------------------------------------------
 * Admin → Governance Configuration → "Immediate Escalation Rules"
 *
 * Lets a Director/Admin tune the FAST-PATH rules that decide when a single pulse
 * escalates immediately (safeguarding 1/1, High, Critical) — per sector + domain,
 * without a code change. Reads/writes immediate_detection_rules (migration 068).
 *
 * Backend (governance-config router):
 *   GET    /governance-config/immediate-rules
 *   POST   /governance-config/immediate-rules
 *   PATCH  /governance-config/immediate-rules/:id
 *   DELETE /governance-config/immediate-rules/:id
 * ----------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { ShieldAlert, Plus, Save, Trash2, Lock, Info, Loader2 } from 'lucide-react';
import { RoleBasedNavigation } from './RoleBasedNavigation';

type Rule = {
  id: string;
  company_id: string | null;        // null = platform default (read-only here)
  sector: 'SUPPORTED_LIVING' | 'DOMICILIARY';
  domain_name: string;              // '*' = any domain
  min_severity: 'Low' | 'Moderate' | 'High' | 'Critical' | null;
  signal_count: number;
  window_hours: number;
  match_any_severity: boolean;
  action: 'ESCALATE' | 'MANDATORY_REVIEW';
  escalate_to_role: 'REGISTERED_MANAGER' | 'DIRECTOR' | 'RESPONSIBLE_INDIVIDUAL';
  sla_trigger_type: string;
  priority: 'Medium' | 'High' | 'Urgent' | 'Critical';
  rationale: string | null;
  is_active: boolean;
};

const SECTORS = ['SUPPORTED_LIVING', 'DOMICILIARY'] as const;
const SEVERITIES = ['Low', 'Moderate', 'High', 'Critical'] as const; // NB: no "Medium"
const ROLES = ['REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'] as const;
const PRIORITIES = ['Medium', 'High', 'Urgent', 'Critical'] as const;

const blankRule = (): Partial<Rule> => ({
  sector: 'SUPPORTED_LIVING',
  domain_name: 'Safeguarding',
  min_severity: null,
  signal_count: 1,
  window_hours: 1,
  match_any_severity: true,
  action: 'MANDATORY_REVIEW',
  escalate_to_role: 'REGISTERED_MANAGER',
  sla_trigger_type: 'HIGH_SAFEGUARDING',
  priority: 'Critical',
  rationale: '',
  is_active: true,
});

const unwrap = (r: any) => r?.data?.data ?? r?.data ?? r ?? [];

export default function ImmediateRulesAdmin() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Rule> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/governance-config/immediate-rules');
      setRules(unwrap(res) as Rule[]);
    } catch {
      toast.error('Could not load immediate escalation rules');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const patchField = (id: string, field: keyof Rule, value: any) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const saveRule = async (rule: Rule) => {
    setSavingId(rule.id);
    try {
      await apiClient.patch(`/governance-config/immediate-rules/${rule.id}`, rule);
      toast.success('Rule updated — takes effect on the next pulse');
    } catch {
      toast.error('Could not save rule');
    } finally {
      setSavingId(null);
    }
  };

  const createRule = async () => {
    if (!draft) return;
    try {
      await apiClient.post('/governance-config/immediate-rules', draft);
      toast.success('Rule created');
      setDraft(null);
      load();
    } catch {
      toast.error('Could not create rule');
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await apiClient.delete(`/governance-config/immediate-rules/${id}`);
      toast.success('Rule removed');
      setRules((rs) => rs.filter((r) => r.id !== id));
    } catch {
      toast.error('Could not remove rule');
    }
  };

  const Field = ({ label, children }: any) => (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
  const sel = 'border border-border rounded-md px-2 py-1 text-sm bg-background';

  const RuleRow = ({ r }: { r: Rule }) => {
    const isDefault = r.company_id === null;
    return (
      <div className={`border rounded-xl p-4 ${isDefault ? 'border-border bg-muted/30' : 'border-border bg-card'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">
              {r.domain_name === '*' ? 'Any domain' : r.domain_name} · {r.sector.replace('_', ' ').toLowerCase()}
            </span>
            {isDefault && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                <Lock className="h-3 w-3" /> PLATFORM DEFAULT
              </span>
            )}
          </div>
          {!isDefault && (
            <Button variant="ghost" size="sm" onClick={() => deleteRule(r.id)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Min severity (≥)">
            <select className={sel} disabled={isDefault} value={r.min_severity ?? ''}
              onChange={(e) => patchField(r.id, 'min_severity', e.target.value || null)}>
              <option value="">Any</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Signals">
            <input type="number" min={1} className={sel} disabled={isDefault} value={r.signal_count}
              onChange={(e) => patchField(r.id, 'signal_count', Number(e.target.value))} />
          </Field>
          <Field label="Window (hours)">
            <input type="number" min={1} className={sel} disabled={isDefault} value={r.window_hours}
              onChange={(e) => patchField(r.id, 'window_hours', Number(e.target.value))} />
          </Field>
          <Field label="Any severity?">
            <select className={sel} disabled={isDefault} value={r.match_any_severity ? 'yes' : 'no'}
              onChange={(e) => patchField(r.id, 'match_any_severity', e.target.value === 'yes')}>
              <option value="no">No</option><option value="yes">Yes (domain alone fires)</option>
            </select>
          </Field>
          <Field label="Action">
            <select className={sel} disabled={isDefault} value={r.action}
              onChange={(e) => patchField(r.id, 'action', e.target.value)}>
              <option value="ESCALATE">Escalate</option>
              <option value="MANDATORY_REVIEW">Mandatory review</option>
            </select>
          </Field>
          <Field label="Escalate to">
            <select className={sel} disabled={isDefault} value={r.escalate_to_role}
              onChange={(e) => patchField(r.id, 'escalate_to_role', e.target.value)}>
              {ROLES.map((role) => <option key={role} value={role}>{role.replace(/_/g, ' ').toLowerCase()}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select className={sel} disabled={isDefault} value={r.priority}
              onChange={(e) => patchField(r.id, 'priority', e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Active">
            <select className={sel} disabled={isDefault} value={r.is_active ? 'yes' : 'no'}
              onChange={(e) => patchField(r.id, 'is_active', e.target.value === 'yes')}>
              <option value="yes">Active</option><option value="no">Disabled</option>
            </select>
          </Field>
        </div>

        {r.rationale && (
          <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {r.rationale}
          </p>
        )}

        {!isDefault && (
          <div className="flex justify-end mt-3">
            <Button size="sm" onClick={() => saveRule(r)} disabled={savingId === r.id}>
              {savingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ml-1.5">Save</span>
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 pt-20 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-primary" /> Immediate Escalation Rules
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              The fast path: when a single pulse should escalate <em>immediately</em>, bypassing pattern
              clustering. Platform defaults are locked; create a rule to override them for your services.
              Changes take effect on the next pulse — no deploy needed.
            </p>
          </div>
          <Button onClick={() => setDraft(blankRule())} variant="outline">
            <Plus className="h-4 w-4" /><span className="ml-1.5">New rule</span>
          </Button>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900 flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Lowering a threshold catches more, earlier — but too low floods the queue and erodes trust.
            Tune against what your service actually logs. Safeguarding stays at 1/1 by doctrine and should
            not be relaxed. Severity scale is Low · Moderate · High · Critical (there is no "Medium").
          </span>
        </div>

        {/* Draft / create panel */}
        {draft && (
          <div className="border-2 border-primary/40 rounded-xl p-4 bg-card">
            <h3 className="font-semibold text-sm mb-3">New company rule</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Sector">
                <select className={sel} value={draft.sector}
                  onChange={(e) => setDraft({ ...draft, sector: e.target.value as any })}>
                  {SECTORS.map((s) => <option key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</option>)}
                </select>
              </Field>
              <Field label="Domain (or *)">
                <input className={sel} value={draft.domain_name}
                  onChange={(e) => setDraft({ ...draft, domain_name: e.target.value })} placeholder="Safeguarding or *" />
              </Field>
              <Field label="Min severity (≥)">
                <select className={sel} value={draft.min_severity ?? ''}
                  onChange={(e) => setDraft({ ...draft, min_severity: (e.target.value || null) as any })}>
                  <option value="">Any</option>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Signals / window(h)">
                <div className="flex gap-1">
                  <input type="number" min={1} className={`${sel} w-16`} value={draft.signal_count}
                    onChange={(e) => setDraft({ ...draft, signal_count: Number(e.target.value) })} />
                  <input type="number" min={1} className={`${sel} w-16`} value={draft.window_hours}
                    onChange={(e) => setDraft({ ...draft, window_hours: Number(e.target.value) })} />
                </div>
              </Field>
              <Field label="Any severity?">
                <select className={sel} value={draft.match_any_severity ? 'yes' : 'no'}
                  onChange={(e) => setDraft({ ...draft, match_any_severity: e.target.value === 'yes' })}>
                  <option value="no">No</option><option value="yes">Yes (domain alone fires)</option>
                </select>
              </Field>
              <Field label="Escalate to">
                <select className={sel} value={draft.escalate_to_role}
                  onChange={(e) => setDraft({ ...draft, escalate_to_role: e.target.value as any })}>
                  {ROLES.map((role) => <option key={role} value={role}>{role.replace(/_/g, ' ').toLowerCase()}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select className={sel} value={draft.priority}
                  onChange={(e) => setDraft({ ...draft, priority: e.target.value as any })}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <div className="col-span-2 md:col-span-1">
                <Field label="Rationale (shown to the RM)">
                  <input className={sel} value={draft.rationale ?? ''}
                    onChange={(e) => setDraft({ ...draft, rationale: e.target.value })} />
                </Field>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button onClick={createRule}><Save className="h-4 w-4" /><span className="ml-1.5">Create rule</span></Button>
            </div>
          </div>
        )}

        {/* Rules list */}
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-10 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading rules…
          </div>
        ) : (
          <div className="space-y-3">
            {rules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">No rules yet.</p>
            )}
            {rules.map((r) => <RuleRow key={r.id} r={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}
