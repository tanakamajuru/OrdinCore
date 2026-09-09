import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { useAuth, normalizeRole } from '@/auth/AuthContext';
import { RootStackParams } from '@/navigation/types';
import { Screen, Card, Row, Label, Text, Pill, TextArea, Button, Loading, ErrorNote, Banner, Chip } from '@/components/ui';

const done = (s?: string) => /complete|completed|cancelled/i.test(s || '');
const reviewed = (a: any) => !!(a.effectiveness_outcome || a.effectiveness);
const fmt = (v?: string) => v ? new Date(v).toLocaleString('en-GB') : '—';
// Never show a raw id as a heading. Prefer a real title; otherwise a concise line from the basis;
// otherwise a plain label. (No UUIDs anywhere in the UI.)
const escalationTitle = (e: any) => {
  const named = e.risk_title || e.incident_title || e.title || e.cluster_label;
  if (named) return String(named);
  const first = String(e.reason || '').split(/\r?\n/).map((x: string) => x.trim()).find(Boolean) || '';
  if (first) return first.length > 60 ? `${first.slice(0, 57)}…` : first;
  return 'Escalation';
};

export function EscalationDetailScreen() {
  const { id } = useRoute<RouteProp<RootStackParams, 'EscalationDetail'>>().params;
  const { role } = useAuth();
  const activeRole = normalizeRole(role || '');
  const canManage = activeRole === 'REGISTERED_MANAGER' || activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN';
  const isDirector = activeRole === 'DIRECTOR';
  const isFrontline = activeRole === 'TEAM_LEADER' || activeRole === 'SUPPORT_WORKER';
  const q = useApi<any>(`/escalations/${id}`);
  const aq = useApi<any[]>(`/escalations/${id}/actions`);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [postOutcome, setPostOutcome] = useState('Keep Open');
  const e = q.data;
  const actions = Array.isArray(aq.data) ? aq.data : (Array.isArray(e?.actions) ? e.actions : []);
  const lifecycle = e?.lifecycle_status || e?.status || 'Open';
  const closed = /closed|resolved/i.test(lifecycle);
  const incomplete = actions.filter((a: any) => !done(a.status)).length;
  const awaitingEffectiveness = actions.filter((a: any) => done(a.status) && !reviewed(a)).length;
  const due = e?.due_by ? new Date(e.due_by) : null;
  const remainingHours = due ? Math.ceil((due.getTime() - Date.now()) / 3600000) : null;

  const post = async (path: string, body: any, success: string) => {
    setBusy(true);
    try { await api.post(path, body); Alert.alert(success); setNote(''); await Promise.all([q.refetch(), aq.refetch()]); }
    catch (err: any) { Alert.alert("Couldn't update escalation", err?.message || 'Please try again.'); }
    finally { setBusy(false); }
  };

  if (q.loading && !e) return <Screen><Loading /></Screen>;
  if (q.error || !e) return <Screen><ErrorNote message={q.error || 'Escalation unavailable'} onRetry={q.refetch} /></Screen>;
  return <Screen>
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View style={{ flex: 1 }}><Text size={19} weight="700">{escalationTitle(e)}</Text><Text size={11} muted>{e.service_name || e.house_name || 'Organisation-wide'}</Text></View>
      <Pill tone={e.overdue ? 'crit' : closed ? 'low' : 'high'}>{e.overdue ? 'Overdue' : lifecycle}</Pill>
    </Row>
    <Card><Label>Escalation basis</Label><Text size={13}>{e.reason || 'No basis recorded.'}</Text></Card>
    {e.observation && <Card><Label>Originating signal</Label><Text size={13}>{e.observation}</Text><Text size={11} muted>{e.signal_risk_domain || 'Signal'} · logged {fmt(e.signal_logged_at)} by {e.signal_logged_by_name || 'staff'}</Text></Card>}
    <Card>
      <Text size={12}>Owner: {e.escalated_to_name || 'Unassigned'}</Text><Text size={12}>Raised: {fmt(e.created_at || e.escalated_at)}</Text><Text size={12}>Due: {fmt(e.due_by)}</Text>
      {remainingHours != null && <Text size={12} color={remainingHours < 0 ? '#c92a2a' : undefined}>{remainingHours < 0 ? `${Math.abs(remainingHours)} hours overdue` : `${remainingHours} hours remaining`}</Text>}
      <Text size={12}>Acknowledged: {fmt(e.acknowledged_at)}</Text>
    </Card>
    <Label>Linked actions · {actions.length}</Label>
    {actions.length === 0 ? <Banner tone="warn" icon="alert-circle" title="No linked action evidence">Closure remains blocked until a control/action is linked and completed.</Banner>
      : actions.map((a: any) => <Card key={a.id}><Text size={13} weight="600">{a.title || a.description || a.action_type}</Text><Text size={11} muted>{a.status || 'Recorded'}{reviewed(a) ? ` · effectiveness: ${a.effectiveness_outcome || a.effectiveness}` : done(a.status) ? ' · effectiveness pending' : ''}</Text></Card>)}
    {!e.acknowledged_at && !closed && (isFrontline || canManage) && <Button title={isFrontline ? 'Acknowledge management instruction' : 'Acknowledge escalation'} tone="ghost" onPress={() => post(`/escalations/${id}/acknowledge`, {}, 'Acknowledgement recorded')} loading={busy} />}
    {isFrontline && <Banner tone="ok" icon="eye" title="Your operational role">Complete actions assigned to you and add evidence there. Escalation ownership, reassignment and closure remain management decisions.</Banner>}
    {isDirector && <Banner tone="warn" icon="shield" title="Director assurance view">Review and challenge through weekly or strategic governance. Operational ownership remains with the Registered Manager.</Banner>}
    {activeRole === 'RESPONSIBLE_INDIVIDUAL' && <Banner tone="warn" icon="shield" title="Independent assurance view">This record is read-only in the RI role. Record conclusions through Provider Sign-off.</Banner>}
    {canManage && !closed && <Card>
      <Label>Registered Manager decision</Label><TextArea value={note} onChangeText={setNote} placeholder="Evidence and rationale…" minHeight={80} required />
      <Button title="Actions implemented" onPress={() => post(`/escalations/${id}/transition`, { lifecycle_status: 'Actions Implemented', rationale: note.trim() }, 'Lifecycle updated')} disabled={note.trim().length < 10 || incomplete > 0 || busy} />
      <Button title="Monitor effectiveness" tone="ghost" onPress={() => post(`/escalations/${id}/transition`, { lifecycle_status: 'Monitoring Effectiveness', rationale: note.trim() }, 'Effectiveness monitoring started')} disabled={note.trim().length < 10 || incomplete > 0 || busy} />
      <Button title="Start closure review" tone="block" onPress={() => post(`/escalations/${id}/closure-review`, { pattern_reduced: true, actions_completed: incomplete === 0, effectiveness_reviewed: awaitingEffectiveness === 0, further_escalation_required: false, closure_reason: note.trim(), evidence: note.trim() }, 'Escalation closed; post-closure risk review is required')} disabled={note.trim().length < 10 || actions.length === 0 || incomplete > 0 || awaitingEffectiveness > 0 || busy} />
      <Button title="Escalate further" tone="ghost" onPress={() => post(`/escalations/${id}/escalate-further`, { reason: note.trim() }, 'Escalated further')} disabled={note.trim().length < 10 || busy} />
      {(incomplete > 0 || awaitingEffectiveness > 0) && <Text size={11} muted>Closure blocked: {incomplete} incomplete action(s), {awaitingEffectiveness} effectiveness review(s) pending.</Text>}
    </Card>}
    {canManage && closed && e.post_closure_risk_review_required && <Card>
      <Label>Mandatory post-closure risk review</Label><Text size={12} muted>Closing the urgent response does not close the underlying risk.</Text>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>{['Keep Open', 'Add Controls', 'Re-escalate', 'Request Risk Closure'].map((o) => <Chip key={o} label={o} active={postOutcome === o} onPress={() => setPostOutcome(o)} />)}</Row>
      <TextArea value={note} onChangeText={setNote} placeholder="Rationale and next governance step…" minHeight={75} required />
      <Button title="Record risk review" onPress={() => post(`/escalations/${id}/post-closure-risk-review`, { outcome: postOutcome, rationale: note.trim() }, 'Post-closure risk review recorded')} disabled={note.trim().length < 10 || busy} />
    </Card>}
    <Label>Activity history</Label>
    {(e.actions || []).map((a: any) => <Card key={a.id}><Text size={12} weight="600">{a.action_type}</Text><Text size={12}>{a.description}</Text><Text size={10} muted>{a.taken_by_name || 'System'} · {fmt(a.created_at)}</Text></Card>)}
  </Screen>;
}

export default EscalationDetailScreen;
