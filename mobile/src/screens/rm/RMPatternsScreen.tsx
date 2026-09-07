import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { Screen, Card, Row, Label, Text, Chip, TextArea, Button, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader } from '@/components/board';

const arr = (v: any): any[] => Array.isArray(v) ? v : v?.clusters || v?.data || [];
export function RMPatternsScreen() {
  const list = useApi<any>('/clusters');
  const [selected, setSelected] = useState<any>(null);
  const detail = useApi<any>(selected?.id ? `/clusters/${selected.id}` : null, [selected?.id]);
  const eligibility = useApi<any>(selected?.id ? `/governance-workflow/patterns/${selected.id}/closure-eligibility` : null, [selected?.id]);
  const [outcome, setOutcome] = useState('Continue Monitoring');
  const [rationale, setRationale] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [busy, setBusy] = useState(false);
  const patterns = arr(list.data).filter((p) => !/dismissed|resolved/i.test(p.cluster_status || ''));
  const submit = async () => {
    if (rationale.trim().length < 20) { Alert.alert('Add a rationale', 'Use at least one clear sentence.'); return; }
    if (outcome === 'Continue Monitoring' && !nextDate) { Alert.alert('Add next review date', 'Use YYYY-MM-DD.'); return; }
    setBusy(true);
    try {
      await api.post(`/governance-workflow/patterns/${selected.id}/review`, { outcome, rationale: rationale.trim(), next_review_date: nextDate || undefined });
      Alert.alert('Pattern reviewed', 'The decision and resulting record are now shared with the web app.');
      setSelected(null); setRationale(''); setNextDate(''); list.refetch();
    } catch (e: any) { Alert.alert("Couldn't review pattern", e?.message || 'Please try again.'); }
    finally { setBusy(false); }
  };
  if (selected) {
    const p = detail.data || selected; const signals = p.signals || [];
    return <Screen refreshing={detail.loading} onRefresh={() => { detail.refetch(); eligibility.refetch(); }}>
      <BoardHeader title="Pattern Review" subtitle={p.house_name || (p.affected_house_names || []).join(', ') || 'Cross-service'} />
      <Card><Text weight="700">{p.cluster_label || p.risk_domain || 'Pattern'}</Text><Text muted size={12}>{p.signal_count || signals.length} signals · {p.trajectory || 'Stable'} · {p.cluster_status}</Text></Card>
      <Label>Source evidence</Label>
      {signals.slice(0, 12).map((s: any) => <Card key={s.id}><Text size={12.5}>{s.description}</Text><Text muted size={11}>{s.house} · {s.entry_date}</Text></Card>)}
      <Label>Governance decision</Label>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>{['Continue Monitoring','Promote to Risk','Escalate','Close'].map((v) => <Chip key={v} label={v} active={outcome === v} onPress={() => setOutcome(v)} />)}</Row>
      <TextArea value={rationale} onChangeText={setRationale} placeholder="Decision rationale…" minHeight={75} required />
      {outcome === 'Continue Monitoring' && <TextArea value={nextDate} onChangeText={setNextDate} placeholder="Next review date YYYY-MM-DD" minHeight={44} required />}
      {outcome === 'Close' && eligibility.data && !eligibility.data.eligible && <Text color="#A61B1B" size={12}>{(eligibility.data.blockers || []).join(' ')}</Text>}
      <Button title="Record pattern review" onPress={submit} loading={busy} disabled={outcome === 'Close' && eligibility.data && !eligibility.data.eligible} />
      <Button title="Back to patterns" tone="ghost" onPress={() => setSelected(null)} />
    </Screen>;
  }
  return <Screen refreshing={list.loading} onRefresh={list.refetch}><BoardHeader title="Patterns" subtitle="Systematic and cross-service patterns" />
    {list.loading && !list.data ? <Loading /> : list.error ? <ErrorNote message={list.error} onRetry={list.refetch} /> : patterns.map((p) => <Card key={p.id}><Button title={p.cluster_label || p.risk_domain || 'Pattern'} tone="ghost" onPress={() => setSelected(p)} /><Text muted size={11}>{p.signal_count || 0} signals · {p.trajectory || 'Stable'} · {p.cluster_status}</Text></Card>)}
  </Screen>;
}
