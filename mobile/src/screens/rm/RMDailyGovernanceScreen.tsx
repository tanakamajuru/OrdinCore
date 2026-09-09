import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { Screen, AppHeader, Card, Row, Label, Text, TextArea, Button, Chip, Banner, Loading, ErrorNote } from '@/components/ui';

export function RMDailyGovernanceScreen() {
  const nav = useNavigation<any>();
  const houses = useApi<any[]>('/houses');
  const [houseId, setHouseId] = useState('');
  const [brief, setBrief] = useState('');
  const [position, setPosition] = useState('');
  const [material, setMaterial] = useState(true);
  const [exceptionsAck, setExceptionsAck] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!houseId && houses.data?.[0]?.id) setHouseId(houses.data[0].id); }, [houses.data, houseId]);
  const sig = useApi<any[]>(houseId ? `/pulses?house_id=${houseId}&limit=200` : null, [houseId]);
  const esc = useApi<any[]>(houseId ? `/escalations?house_id=${houseId}&limit=200` : null, [houseId]);
  const signals = (sig.data || []).filter((s: any) => String(s.review_status || 'New') === 'New');
  const escalations = (esc.data || []).filter((e: any) => !/closed|resolved/i.test(e.lifecycle_status || e.status || ''));
  const selected = (houses.data || []).find((h: any) => h.id === houseId);
  const canPublish = !!houseId && signals.length === 0 && position.trim().length >= 10 && (!material || brief.trim().length >= 10) && (escalations.length === 0 || exceptionsAck);
  const publish = async () => {
    setBusy(true);
    try {
      const log: any = await api.post('/governance/daily-log/open', { house_id: houseId });
      await api.post(`/governance/daily-log/${log.id}/complete`, { note: position.trim(), leadership_narrative: position.trim(), team_brief: material ? brief.trim() : '', material_change: material, exceptions_acknowledged: exceptionsAck, decisions: [] });
      Alert.alert('Published', `Daily governance for ${selected?.name || 'the service'} is recorded and available to the team.`);
      setBrief(''); setPosition(''); setExceptionsAck(false); sig.refetch(); esc.refetch();
    } catch (e: any) { Alert.alert("Couldn't publish", e?.message || 'Please correct the blockers and try again.'); }
    finally { setBusy(false); }
  };
  if (houses.loading && !houses.data) return <Screen><Loading /></Screen>;
  if (houses.error) return <Screen><ErrorNote message={houses.error} onRetry={houses.refetch} /></Screen>;
  return <Screen>
    <AppHeader title="Daily Governance" subtitle="Review, decide and publish one canonical service brief" />
    <Label>Service</Label><Row gap={6} style={{ flexWrap: 'wrap' }}>{(houses.data || []).map((h: any) => <Chip key={h.id} label={h.name} active={houseId === h.id} onPress={() => { setHouseId(h.id); setExceptionsAck(false); }} />)}</Row>
    <Card><Text size={13} weight="600">Readiness</Text><Text size={12}>Signals awaiting RM decision: {signals.length}</Text><Text size={12}>Open escalations carried forward: {escalations.length}</Text></Card>
    {signals.length > 0 && <><Banner tone="block" icon="lock" title="Publication blocked">Every outstanding signal needs an RM decision first.</Banner><Button title={`Review ${signals.length} signal(s)`} onPress={() => nav.navigate('RMSignalQueue', { house_id: houseId, house: selected?.name, tab: 'needs' })} /></>}
    {escalations.length > 0 && <><Banner tone="warn" icon="alert-triangle" title={`${escalations.length} open escalation(s)`}>Review these separately, then explicitly confirm that they are carried forward in today's governance.</Banner><Chip label={exceptionsAck ? 'Exceptions reviewed and carried forward' : 'Confirm exceptions reviewed'} active={exceptionsAck} onPress={() => setExceptionsAck(!exceptionsAck)} /></>}
    <Label>Registered Manager position</Label><TextArea value={position} onChangeText={setPosition} placeholder="What is known today and what management concluded…" minHeight={85} required />
    <Row gap={7}><Chip label="Material change" active={material} onPress={() => setMaterial(true)} /><Chip label="No material change" active={!material} onPress={() => setMaterial(false)} /></Row>
    {material ? <><Label>Team brief</Label><TextArea value={brief} onChangeText={setBrief} placeholder="What the Team Leader needs to know and do today…" minHeight={90} required /></> : <Banner tone="ok" icon="check-circle" title="Positive declaration">The published record will state that no material change was identified and existing actions continue.</Banner>}
    <Button title="Publish daily governance" icon="send" onPress={publish} loading={busy} disabled={!canPublish || busy} />
  </Screen>;
}

export default RMDailyGovernanceScreen;
