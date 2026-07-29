import React, { useState } from 'react';
import { Alert, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/api/client';
import { useApi } from '@/api/useApi';
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
  const [override, setOverride] = useState(false);

  // "Complete old work before new" — a Team Leader with an action overdue by more than 7 days is
  // gated here and pointed at My Actions first. Urgent safeguarding is never blocked (doctrine),
  // so an explicit override remains for genuinely urgent reports.
  const outstanding = useApi<any>('/governance/my-outstanding');
  const oldestOverdue = Number(outstanding.data?.oldest_overdue_days ?? outstanding.data?.data?.oldest_overdue_days ?? 0) || 0;
  const gated = oldestOverdue > 7 && !override;

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

  // Blocking gate — complete overdue actions before recording new routine signals.
  if (gated) {
    const n = Number(outstanding.data?.overdue ?? outstanding.data?.data?.overdue ?? 0) || 0;
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 8, gap: 16 }}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.sevHigh + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="alert-triangle" size={30} color={c.sevHigh} />
            </View>
            <Text size={19} weight="700" style={{ textAlign: 'center' }}>Clear your overdue actions first</Text>
            <Text size={13.5} muted style={{ textAlign: 'center', lineHeight: 20 }}>
              You have {n} overdue action{n === 1 ? '' : 's'} — the oldest is {oldestOverdue} days old.
              Please complete or update them before recording new routine signals.
            </Text>
          </View>
          <Button title="Go to My Actions" icon="check-square"
            onPress={() => nav.navigate('Tabs', { screen: 'Actions' })} />
          <Pressable onPress={() => setOverride(true)} style={{ padding: 12, alignItems: 'center' }}>
            <Text size={12.5} weight="600" color={c.sevCrit}>This is urgent (safeguarding) — record now anyway</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

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
