import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/api/client';
import { queue } from '@/offline/queue';
import { Screen, Label, Row, Chip, Field, TextArea, SeverityPicker, Button, Pill, Text } from '@/components/ui';

const TYPES = ['Safeguarding', 'Medication', 'Behaviour', 'Health', 'Environment'];

export function RaiseSignalScreen() {
  const { c } = useTheme();
  const { user } = useAuth();
  const nav = useNavigation<any>();

  const [type, setType] = useState('Safeguarding');
  const [severity, setSeverity] = useState('High');
  const [person, setPerson] = useState('');
  const [observation, setObservation] = useState('');
  const [immediate, setImmediate] = useState('');
  const [busy, setBusy] = useState(false);

  const houses = user?.assigned_house_ids || [];
  const houseId = houses.length === 1 ? houses[0] : undefined; // else the API resolves it from the TL's assignment

  const submit = async () => {
    if (!observation.trim()) { Alert.alert('Add what you saw', 'A short account of the observation is required.'); return; }
    const body: any = {
      service_id: houseId,
      related_person: person.trim() || undefined,
      category: type,               // → risk_domain (drives clustering + rules)
      governance_domain: type,
      signal_type: type === 'Safeguarding' ? 'Safeguarding' : 'Concern',
      severity,
      description: observation.trim(),
      immediate_action: immediate.trim() || undefined,
    };
    setBusy(true);
    try {
      await api.post('/pulses', body);
      Alert.alert('Signal recorded', 'Your account has been logged as evidence.');
      nav.goBack();
    } catch (e: any) {
      if (e instanceof ApiError) {
        // The server rejected it (e.g. not assigned to a service) — surface, don't queue a bad request.
        Alert.alert("Couldn't record", e.message);
      } else {
        // Offline / unreachable — persist on the device and sync later.
        await queue.enqueue({ kind: 'signal', path: '/pulses', body, label: `${type} · ${person || 'signal'}` });
        Alert.alert('Saved on this device', "You're offline — it will send automatically when you're back.");
        nav.goBack();
      }
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'flex-end' }}>
        <Pill tone="ghost">{houseId ? 'Your service' : 'Service auto-resolved'}</Pill>
      </Row>

      <Label>Person (optional)</Label>
      <Field value={person} onChangeText={setPerson} placeholder="Who it concerns" />

      <Label>Signal type</Label>
      <Row gap={7} style={{ flexWrap: 'wrap' }}>
        {TYPES.map((t) => <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />)}
      </Row>

      <Label>Severity</Label>
      <SeverityPicker value={severity} onChange={setSeverity} />

      <Label>What you saw</Label>
      <TextArea value={observation} onChangeText={setObservation} placeholder="Your account, in your own words — recorded as evidence…" required minHeight={90} />

      <Label>Immediate action taken (optional)</Label>
      <Field value={immediate} onChangeText={setImmediate} placeholder="What you did there and then" />

      <Button title="Save signal" onPress={submit} loading={busy} style={{ marginTop: 4 }} />
      <Row gap={6} style={{ justifyContent: 'center' }}>
        <Feather name="cloud" size={13} color={c.muted} />
        <Text muted size={11}>Saves to this device · syncs automatically</Text>
      </Row>
    </Screen>
  );
}
