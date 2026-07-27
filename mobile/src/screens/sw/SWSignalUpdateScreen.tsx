import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/api/client';
import { SWSignalsStackParams } from '@/navigation/types';
import { Screen, Text, Row, Card, Label, TextArea, Button } from '@/components/ui';

export function SWSignalUpdateScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { id, current } = useRoute<RouteProp<SWSignalsStackParams, 'SWSignalUpdate'>>().params;
  const [note, setNote] = useState(current || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!note.trim()) { Alert.alert('Add an update', 'The observation cannot be empty.'); return; }
    setBusy(true);
    try {
      // Appended as a new attributed version; becomes the signal's current observation.
      await api.patch(`/pulses/${id}/note`, { note: note.trim() });
      Alert.alert('Signal updated', 'Your update was added to the signal record.');
      nav.goBack();
    } catch (e: any) {
      Alert.alert("Couldn't update", e instanceof ApiError ? e.message : (e?.message || 'Try again when back online.'));
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Text size={22} weight="700" style={{ marginBottom: 2 }}>Update Signal</Text>
      <Text size={13} muted>Your update is added to the signal's record and attributed to you.</Text>

      {!!current && (
        <Card>
          <Label>Current observation</Label>
          <Text size={13} style={{ lineHeight: 20 }}>{current}</Text>
        </Card>
      )}

      <Label>Updated observation</Label>
      <TextArea value={note} onChangeText={setNote} placeholder="Add new information, what's changed, or a follow-up…" required minHeight={120} />

      <Button title="Save update" icon="check" onPress={save} loading={busy} style={{ marginTop: 4 }} />
      <Row gap={6} style={{ justifyContent: 'center' }}>
        <Feather name="clock" size={12} color={c.muted} />
        <Text muted size={11}>Earlier versions are preserved in the signal's history.</Text>
      </Row>
    </Screen>
  );
}
