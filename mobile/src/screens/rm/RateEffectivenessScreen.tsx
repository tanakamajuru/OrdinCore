import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { api } from '@/api/client';
import { RootStackParams } from '@/navigation/types';
import { Screen, Row, Label, Text, TextArea, Button, Banner } from '@/components/ui';

// The doctrine test: completion proves activity, not impact. Rating records whether the
// control actually reduced the risk — and two "Not Effective" ratings re-escalate server-side.
const OUTCOMES: { v: string; sub: string; tone: 'low' | 'mod' | 'crit' | 'ghost' }[] = [
  { v: 'Effective', sub: 'The risk reduced', tone: 'low' },
  { v: 'Partially Effective', sub: 'Some improvement', tone: 'mod' },
  { v: 'Not Effective', sub: 'No change / worse', tone: 'crit' },
  { v: 'Too Early To Assess', sub: 'Needs more time', tone: 'ghost' },
];

export function RateEffectivenessScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { action } = useRoute<RouteProp<RootStackParams, 'RateEffectiveness'>>().params;
  const [outcome, setOutcome] = useState('Effective');
  const [evidence, setEvidence] = useState('');
  const [busy, setBusy] = useState(false);

  const needsEvidence = outcome !== 'Too Early To Assess';
  const toneColor = (t: string) => (t === 'low' ? c.sevLow : t === 'mod' ? c.sevMod : t === 'crit' ? c.sevCrit : c.muted);

  const submit = async () => {
    if (needsEvidence && evidence.trim().length < 20) {
      Alert.alert('Add evidence', 'Record what tells you this (at least 20 characters).');
      return;
    }
    if (!action.risk_id) { Alert.alert('Missing risk', "This action isn't linked to a risk here."); return; }
    setBusy(true);
    try {
      await api.post(`/risks/${action.risk_id}/actions/${action.id}/effectiveness`, { outcome, evidence: evidence.trim() || undefined });
      Alert.alert('Recorded', 'The rating moves the risk trajectory.');
      nav.goBack();
    } catch (e: any) {
      Alert.alert("Couldn't rate", e?.message || 'Only a Registered Manager can rate a completed action.');
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Text weight="600">{action.title}</Text>
      <Text muted size={12}>Did it actually reduce the risk?</Text>

      <Label>Outcome</Label>
      {OUTCOMES.map((o) => {
        const on = outcome === o.v;
        const col = toneColor(o.tone);
        return (
          <Pressable key={o.v} onPress={() => setOutcome(o.v)} style={{
            flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: on ? col + '18' : c.card,
            borderWidth: 1, borderColor: on ? col : c.line, borderRadius: 12, padding: 12,
          }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: on ? col : c.line, backgroundColor: on ? col : 'transparent' }} />
            <View style={{ flex: 1 }}>
              <Text size={13} weight="600">{o.v}</Text>
              <Text muted size={11}>{o.sub}</Text>
            </View>
          </Pressable>
        );
      })}

      {needsEvidence && (
        <>
          <Label>Evidence · min 20 chars</Label>
          <TextArea value={evidence} onChangeText={setEvidence} placeholder="What tells you this? (observations, pulse counts, incidents…)" required minHeight={70} />
        </>
      )}

      {outcome === 'Not Effective' && (
        <Banner tone="warn" icon="alert-triangle">Two consecutive "Not Effective" ratings re-escalate this risk.</Banner>
      )}

      <Button title="Record rating" onPress={submit} loading={busy} />
      <Row gap={6} style={{ justifyContent: 'center' }}>
        <Feather name="trending-up" size={12} color={c.muted} />
        <Text muted size={11}>Feeds the one computed trajectory</Text>
      </Row>
    </Screen>
  );
}
