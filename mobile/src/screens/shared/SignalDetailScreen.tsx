import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { useAuth, normalizeRole } from '@/auth/AuthContext';
import { RootStackParams } from '@/navigation/types';
import { Screen, Card, Row, Label, Text, Pill, SeverityPill, Loading, ErrorNote, TextArea, Button, Chip } from '@/components/ui';

const firstDomain = (d?: string[] | string) => Array.isArray(d) ? d[0] : String(d || '').replace(/[{}]/g, '').split(',')[0];

const STATUS_TONE: Record<string, 'mod' | 'ghost' | 'accent' | 'low'> = {
  New: 'mod', Reviewed: 'ghost', Linked: 'accent', Closed: 'low',
};

export function SignalDetailScreen() {
  const { c } = useTheme();
  const route = useRoute<RouteProp<RootStackParams, 'SignalDetail'>>();
  const { id } = route.params;
  const { role } = useAuth();
  const signal = useApi<any>(`/pulses/${id}`);
  const ctx = useApi<any>(`/pulses/${id}/context`);
  const activity = useApi<any>(`/pulses/${id}/linked-activity`);
  const s = signal.data;

  const canAttn = ['TEAM_LEADER', 'REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'].includes(normalizeRole(role || ''));
  const [showAttn, setShowAttn] = useState(false);
  const [attnReason, setAttnReason] = useState('');
  const [attnBusy, setAttnBusy] = useState(false);
  const isRM = normalizeRole(role || '') === 'REGISTERED_MANAGER';
  const users = useApi<any>(isRM ? '/users' : null);
  const [decision, setDecision] = useState<'Monitor'|'Create Action'|'Escalate'|'Close Signal'>('Monitor');
  const [rationale, setRationale] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [intendedOutcome, setIntendedOutcome] = useState('');
  const [rmSeverity, setRmSeverity] = useState<'Low'|'Moderate'|'High'|'Critical'|''>('');
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionKey, setDecisionKey] = useState(() => `mobile-${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const people: any[] = Array.isArray(users.data) ? users.data : users.data?.users || users.data?.data || [];
  // Create Action, Escalate and Monitor all need an accountable owner (and a date): a Monitor
  // with no owner/review date is "monitored" with no one watching. Close needs neither.
  const needsOwner = decision === 'Create Action' || decision === 'Escalate' || decision === 'Monitor';
  const showsDue = decision === 'Create Action' || decision === 'Escalate' || decision === 'Monitor';
  const dueRequired = decision === 'Create Action' || decision === 'Monitor';
  const intendedOutcomeRequired = decision === 'Create Action' || decision === 'Monitor';
  const eligiblePeople = people.filter((u) => {
    if (u.status === 'suspended') return false;
    const r = normalizeRole(u.role || '');
    if (decision === 'Escalate') return ['REGISTERED_MANAGER','DIRECTOR','RESPONSIBLE_INDIVIDUAL'].includes(r);
    if (decision === 'Monitor') return ['TEAM_LEADER','REGISTERED_MANAGER'].includes(r);
    return ['SUPPORT_WORKER','TEAM_LEADER','REGISTERED_MANAGER','DIRECTOR'].includes(r);
  });
  const setDueInDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); setDueAt(d.toISOString().slice(0, 10)); };
  const fmtDue = (v: string) => (v ? new Date(`${v}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
  const DUE_PRESETS: { label: string; days: number }[] = [
    { label: 'Today', days: 0 }, { label: 'In 3 days', days: 3 }, { label: 'In 1 week', days: 7 }, { label: 'In 2 weeks', days: 14 },
  ];
  const recordDecision = async () => {
    if (rationale.trim().length < 10) { Alert.alert('Add a rationale', 'Record why this decision is appropriate (at least 10 characters).'); return; }
    if (!rmSeverity) { Alert.alert('Set governance severity', 'The Registered Manager must explicitly rate this signal before recording the decision.'); return; }
    if (needsOwner && !ownerId) { Alert.alert('Choose an owner', 'This decision must name one accountable owner.'); return; }
    if (dueRequired && !dueAt.trim()) { Alert.alert(decision === 'Monitor' ? 'Add a review date' : 'Add a due date', 'Pick a date below.'); return; }
    if (intendedOutcomeRequired && intendedOutcome.trim().length < 10) { Alert.alert('Add an intended outcome', decision === 'Monitor' ? 'Record what the monitoring review should establish.' : 'Record what should change if the action works.'); return; }
    setDecisionBusy(true);
    try {
      await api.post('/governance-decisions', {
        pulse_entry_id: id, house_id: s?.house_id || s?.service_id,
        what_is_happening: rationale.trim(), decision, severity: rmSeverity,
        owner_id: ownerId || undefined, due_at: dueAt ? `${dueAt}T17:00:00.000Z` : undefined,
        action_description: decision === 'Create Action' ? rationale.trim() : undefined,
        intended_outcome: intendedOutcomeRequired ? intendedOutcome.trim() : undefined,
        idempotency_key: decisionKey,
      });
      Alert.alert('Decision recorded', 'The signal and any linked work now use the same governance record as the web app.');
      setRationale(''); setIntendedOutcome(''); setRmSeverity(''); setDecisionKey(`mobile-${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`); signal.refetch(); activity.refetch();
    } catch (e: any) { Alert.alert("Couldn't record decision", e?.message || 'Please try again.'); }
    finally { setDecisionBusy(false); }
  };
  const markAttention = async () => {
    if (attnReason.trim().length < 10) { Alert.alert('Add a reason', 'Give a short reason (at least a sentence).'); return; }
    setAttnBusy(true);
    try { await api.post(`/pulses/${id}/leadership-attention`, { reason: attnReason.trim() }); setShowAttn(false); setAttnReason(''); signal.refetch(); }
    catch (e: any) { Alert.alert("Couldn't flag", e?.message || 'Try again.'); }
    finally { setAttnBusy(false); }
  };

  if (signal.loading && !s) return <Screen><Loading /></Screen>;
  if (signal.error) return <Screen><ErrorNote message={signal.error} onRetry={signal.refetch} /></Screen>;

  const clusters: any[] = ctx.data?.clusters || [];
  const prior: any[] = ctx.data?.prior_signals || [];
  const linked: any[] = activity.data?.data ?? activity.data ?? [];

  return (
    <Screen refreshing={signal.loading} onRefresh={() => { signal.refetch(); ctx.refetch(); }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pill tone={STATUS_TONE[s?.review_status] || 'mod'}>{s?.review_status || 'New'} · needs triage</Pill>
        <Text faint size={11}>{s?.entry_date ? new Date(s.entry_date).toLocaleDateString('en-GB') : ''}</Text>
      </Row>

      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        <SeverityPill severity={s?.severity} />
        {!!firstDomain(s?.risk_domain) && <Pill tone="accent">{firstDomain(s?.risk_domain)}</Pill>}
        {!!s?.related_person && <Pill tone="ghost">{s.related_person}</Pill>}
      </Row>

      <Card>
        <Label>Observation</Label>
        <Text size={13}>{s?.description || '—'}</Text>
        {!!s?.immediate_action && (
          <View style={{ marginTop: 8 }}>
            <Text muted size={11.5}><Text weight="600" size={11.5}>Immediate action: </Text>{s.immediate_action}</Text>
          </View>
        )}
      </Card>

      {isRM && String(s?.review_status || 'New').toLowerCase() !== 'closed' && (
        <Card>
          <Label>Registered Manager decision</Label>
          <Label>Governance severity</Label>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>{(['Low','Moderate','High','Critical'] as const).map((v) => <Chip key={v} label={v} active={rmSeverity === v} onPress={() => setRmSeverity(v)} />)}</Row>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {(['Monitor','Create Action','Escalate','Close Signal'] as const).map((d) => (
              <Chip key={d} label={d === 'Close Signal' ? 'Close' : d} active={decision === d} onPress={() => { setDecision(d); setOwnerId(''); setDueAt(''); setIntendedOutcome(''); }} />
            ))}
          </Row>
          {!showsDue && <Text muted size={11.5}>Close records the decision only. Monitor, Create Action and Escalate allocate an owner and a date.</Text>}
          <Label>Decision rationale</Label>
          <TextArea value={rationale} onChangeText={setRationale} placeholder="What is happening and why this is the right governance response…" minHeight={72} required />
          {intendedOutcomeRequired && <><Label>{decision === 'Monitor' ? 'What should the review establish?' : 'Intended outcome'}</Label><TextArea value={intendedOutcome} onChangeText={setIntendedOutcome} placeholder={decision === 'Monitor' ? 'What evidence should be available at the next review?' : 'What should change if this action is effective?'} minHeight={60} required /></>}
          {needsOwner && <>
            <Label>Accountable owner</Label>
            {eligiblePeople.length === 0
              ? <Text muted size={12}>No colleagues are available to allocate to yet.</Text>
              : <Row gap={6} style={{ flexWrap: 'wrap' }}>
                  {eligiblePeople.map((u) => (
                    <Chip key={u.id} label={`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email} active={ownerId === u.id} onPress={() => setOwnerId(u.id)} />
                  ))}
                </Row>}
          </>}
          {showsDue && <>
            <Label>{decision === 'Monitor' ? 'Review date' : decision === 'Escalate' ? 'Response due' : 'Due date'}{decision === 'Escalate' ? ' (optional)' : ''}</Label>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {DUE_PRESETS.filter((p) => decision !== 'Monitor' || p.days > 0).map((p) => { const d = new Date(); d.setDate(d.getDate() + p.days); const iso = d.toISOString().slice(0, 10); return (
                <Chip key={p.label} label={p.label} active={dueAt === iso} onPress={() => setDueInDays(p.days)} />
              ); })}
              {!!dueAt && <Chip label="Clear" active={false} onPress={() => setDueAt('')} />}
            </Row>
            {!!dueAt && <Text muted size={11.5}>Due {fmtDue(dueAt)}</Text>}
          </>}
          <Button title="Record governance decision" icon="check" onPress={recordDecision} loading={decisionBusy} />
        </Card>
      )}

      {/* Leadership attention marker (a visibility flag, not a severity change). */}
      {s?.leadership_attention ? (
        <Row style={{ backgroundColor: c.sevHigh + '18', borderRadius: 12, padding: 11, justifyContent: 'center' }} gap={8}>
          <Feather name="alert-triangle" size={15} color={c.sevHigh} /><Text size={12.5} weight="600" color={c.sevHigh}>Flagged for leadership attention</Text>
        </Row>
      ) : canAttn ? (
        showAttn ? (
          <Card>
            <Label>Why does this need leadership attention?</Label>
            <TextArea value={attnReason} onChangeText={setAttnReason} placeholder="A short reason…" minHeight={56} required />
            <Row gap={8}>
              <Button title="Flag" icon="alert-triangle" onPress={markAttention} loading={attnBusy} style={{ flex: 1 }} />
              <Button title="Cancel" tone="ghost" onPress={() => setShowAttn(false)} style={{ flex: 1 }} />
            </Row>
          </Card>
        ) : (
          <Button title="Flag for leadership attention" icon="alert-triangle" tone="ghost" onPress={() => setShowAttn(true)} />
        )
      ) : null}

      <Label>History &amp; pattern</Label>
      {clusters.length > 0 ? clusters.map((cl) => (
        <View key={cl.id} style={{ backgroundColor: c.accentTint, borderColor: c.accent + '55', borderWidth: 1, borderRadius: 14, padding: 12 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={7}><Feather name="activity" size={14} color={c.accent} /><Text weight="600" size={12.5}>{cl.cluster_label || `${cl.risk_domain} pattern`}</Text></Row>
          </Row>
          <Text muted size={11.5} style={{ marginTop: 5 }}>{cl.signal_count} signal(s) · {cl.cluster_status}{cl.trajectory ? ` · ${cl.trajectory}` : ''}</Text>
        </View>
      )) : <Text muted size={12.5}>Not yet part of a pattern.</Text>}

      {/* Linked Governance Activity — decisions, tasks, patterns, risks, escalations. */}
      {linked.length > 0 && (
        <Card>
          <Label>Linked governance activity</Label>
          {linked.map((a: any, i: number) => (
            <View key={i} style={{ borderLeftWidth: 2, borderLeftColor: c.accent + '66', paddingLeft: 10, paddingVertical: 5 }}>
              <Row style={{ justifyContent: 'space-between' }} gap={8}>
                <Text size={12} weight="600" style={{ flex: 1 }}>{a.record} · {a.status}</Text>
                <Text faint size={10.5}>{a.at ? new Date(a.at).toLocaleDateString('en-GB') : ''}</Text>
              </Row>
              <Text size={12} muted style={{ marginTop: 1 }}>{a.relationship}{a.label ? ` — ${a.label}` : ''}</Text>
            </View>
          ))}
        </Card>
      )}

      <Card>
        <Label>Prior occurrences · {ctx.data?.prior_count ?? prior.length}</Label>
        {prior.length === 0 ? (
          <Text muted size={12.5}>{ctx.loading ? 'Loading…' : 'No prior occurrences for this person or theme at this site.'}</Text>
        ) : prior.slice(0, 6).map((p) => (
          <View key={p.id} style={{ borderLeftWidth: 2, borderLeftColor: c.line, paddingLeft: 10, paddingVertical: 4 }}>
            <Row gap={7}>
              <Text faint size={10.5}>{new Date(p.entry_date).toLocaleDateString('en-GB')}</Text>
              <SeverityPill severity={p.severity} />
            </Row>
            <Text size={12} style={{ marginTop: 2 }}>{p.description}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
