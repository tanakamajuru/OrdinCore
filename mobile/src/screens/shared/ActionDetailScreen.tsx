import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api/client';
import { RootStackParams } from '@/navigation/types';
import { Screen, Card, Row, Label, Text, Pill, TextArea, Button } from '@/components/ui';

const dd = (x?: string) => (x ? new Date(x).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export function ActionDetailScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { role } = useAuth();
  const { action } = useRoute<RouteProp<RootStackParams, 'ActionDetail'>>().params;
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState('No change');
  const [busy, setBusy] = useState(false);

  const done = /complete|done/i.test(action.status || '');
  const overdue = /overdue/i.test(action.status || '');
  const canRate = role === 'REGISTERED_MANAGER';

  const complete = async () => {
    if (note.trim().length < 10) { Alert.alert('Add completion evidence', 'Explain what was done in at least 10 characters.'); return; }
    setBusy(true);
    try {
      await api.patch(`/actions/${action.id}/complete`, {
        completion_note: note.trim(), completion_rationale: note.trim(), completion_outcome: outcome,
      });
      Alert.alert('Marked complete', 'Completion proves activity — an RM can now rate whether it worked.');
      nav.goBack();
    } catch (e: any) { Alert.alert("Couldn't complete", e?.message || 'Try again when back online.'); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text weight="600" size={16} style={{ flex: 1 }}>{action.title}</Text>
        <Pill tone={done ? 'low' : overdue ? 'crit' : 'mod'}>{action.status || 'Open'}</Pill>
      </Row>

      {!!action.description && <Text muted size={13}>{action.description}</Text>}

      <Card style={{ paddingVertical: 4 }}>
        {[
          ['git-merge', 'Risk', action.risk_title || '—'],
          ['user', 'Assigned to', action.assigned_to_name || 'You'],
          ['calendar', 'Due', dd(action.due_date)],
        ].map(([icon, label, val]) => (
          <Row key={label as string} style={{ justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
            <Row gap={9}><Feather name={icon as any} size={15} color={c.muted} /><Text muted size={13}>{label}</Text></Row>
            <Text size={13} weight="600" style={{ maxWidth: '58%', textAlign: 'right' }}>{val as string}</Text>
          </Row>
        ))}
      </Card>

      {!done ? (
        <>
          <Label>Completion outcome</Label>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {['No change', 'Partial improvement', 'Risk reduced', 'Risk escalated'].map((v) => (
              <Button key={v} title={v} tone={outcome === v ? 'primary' : 'ghost'} onPress={() => setOutcome(v)} />
            ))}
          </Row>
          <Label>Completion evidence and rationale</Label>
          <TextArea value={note} onChangeText={setNote} placeholder="What was done to complete this action…" minHeight={64} />
          <Button title="Mark complete" icon="check" onPress={complete} loading={busy} />
          <Row gap={6} style={{ justifyContent: 'center' }}>
            <Feather name="info" size={12} color={c.muted} />
            <Text muted size={11} style={{ textAlign: 'center' }}>Completing records activity; effectiveness is rated separately.</Text>
          </Row>
        </>
      ) : canRate ? (
        <Button title="Rate effectiveness — did it work?" icon="trending-up" onPress={() => nav.navigate('RateEffectiveness', { action: { id: action.id, risk_id: action.risk_id, title: action.title } })} />
      ) : (
        <View style={{ backgroundColor: c.sevLow + '18', borderRadius: 10, padding: 12 }}>
          <Row gap={8}><Feather name="check-circle" size={16} color={c.sevLow} /><Text size={13} weight="600">Completed</Text></Row>
          <Text muted size={11.5} style={{ marginTop: 4 }}>A Registered Manager rates whether it reduced the risk.</Text>
        </View>
      )}
    </Screen>
  );
}
