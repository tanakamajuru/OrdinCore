import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { api } from '@/api/client';
import { RootStackParams } from '@/navigation/types';
import { Screen, Row, Label, Text, Pill, SeverityPill, Traj, Banner, TextArea, Button } from '@/components/ui';

export function PromoteScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { cluster } = useRoute<RouteProp<RootStackParams, 'Promote'>>().params;
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const ready = cluster.signalCount >= cluster.threshold || cluster.hasCritical;

  const promote = async () => {
    if (reason.trim().length < 10) { Alert.alert('Add a reason', 'Every decision carries a reason — say why this is a formal risk (min 10 characters).'); return; }
    setBusy(true);
    try {
      // Clean mobile-first endpoint: the server holds the cluster's data and enforces the
      // promotion floor + provenance. See backend rm5.routes → POST /rm/patterns/:id/promote.
      await api.post(`/rm/patterns/${cluster.id}/promote`, { reason: reason.trim() });
      Alert.alert('Risk created', 'The pattern is now a governed risk, with your reason on the record.');
      nav.goBack();
    } catch (e: any) {
      Alert.alert("Couldn't promote", e?.message || 'The promotion floor is enforced on the server.');
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        <Pill tone="accent">{cluster.domain}</Pill>
        {cluster.person && cluster.person !== '—' && <SeverityPill severity="High" />}
        <Traj dir={cluster.trajectory?.dir} />
      </Row>

      <Banner tone={ready ? 'ok' : 'warn'} icon={ready ? 'check' : 'eye'}
        title={ready ? `Threshold met · ${cluster.signalCount} of ${cluster.threshold} signals` : `Watch · ${cluster.signalCount} of ${cluster.threshold}`}>
        {ready ? 'The system proposes this. Creating the risk is your decision.' : 'Below the promotion floor — the server may refuse until it becomes a pattern.'}
      </Banner>

      <Label>Evidence</Label>
      <Text muted size={12.5}>{cluster.signalCount} linked signal(s) will be carried across as the risk's first evidence.</Text>

      <Label>Why is this a formal risk? · required</Label>
      <TextArea value={reason} onChangeText={setReason} placeholder="Recorded on the register as the provenance of this risk…" required minHeight={72} />

      <Button title="Create risk" onPress={promote} loading={busy} />
      <Row gap={6} style={{ justifyContent: 'center' }}>
        <Feather name="lock" size={12} color={c.muted} />
        <Text muted size={11}>Risks are never created automatically</Text>
      </Row>
    </Screen>
  );
}
