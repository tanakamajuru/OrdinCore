import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { api } from '@/api/client';
import { RootStackParams } from '@/navigation/types';
import { Screen, Row, Label, Text, TextArea, Button } from '@/components/ui';

// Exact verdict strings the API accepts (backend risks.service.closeRisk).
const VERDICTS = [
  { v: 'Resolved — controls effective', note: 'Requires a control rated effective' },
  { v: 'Resolved — no longer applicable' },
  { v: 'Tolerated — risk accepted' },
];

export function CloseRiskScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { risk } = useRoute<RouteProp<RootStackParams, 'CloseRisk'>>().params;
  const [verdict, setVerdict] = useState(VERDICTS[0].v);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const close = async () => {
    if (reason.trim().length < 20) { Alert.alert('Add a rationale', 'A closure rationale of at least 20 characters is required.'); return; }
    setBusy(true);
    try {
      await api.post(`/risks/${risk.id}/close`, { verdict, reason: reason.trim() });
      Alert.alert('Risk closed', 'Locked, with a 60-day recurrence watch. Reopening needs a reason.');
      nav.goBack();
    } catch (e: any) {
      Alert.alert("Couldn't close", e?.message || 'The verdict is checked against the evidence on the server.');
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Text weight="600">{risk.title || 'Risk'}</Text>

      <Label>Resolution verdict</Label>
      {VERDICTS.map((o) => {
        const on = verdict === o.v;
        return (
          <Pressable key={o.v} onPress={() => setVerdict(o.v)} style={{
            flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: on ? c.accentTint : c.card,
            borderWidth: 1, borderColor: on ? c.accent : c.line, borderRadius: 12, padding: 11,
          }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent', marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text size={12.5} weight="600">{o.v}</Text>
              {!!o.note && <Text muted size={11} style={{ marginTop: 2 }}>{o.note}</Text>}
            </View>
          </Pressable>
        );
      })}

      <Label>Rationale · min 20 chars</Label>
      <TextArea value={reason} onChangeText={setReason} placeholder="Why the risk is safe to close…" required minHeight={64} />

      <Button title="Close risk" onPress={close} loading={busy} />
      <Row gap={6} style={{ justifyContent: 'center' }}>
        <Feather name="lock" size={12} color={c.muted} />
        <Text muted size={11} style={{ textAlign: 'center' }}>Locked on close · 60-day recurrence watch · "controls effective" needs a rated control</Text>
      </Row>
    </Screen>
  );
}
