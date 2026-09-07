import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/api/client';
import { useApi } from '@/api/useApi';
import { queue } from '@/offline/queue';
import { Screen, Label, Row, Chip, Field, TextArea, Button, Pill, Text } from '@/components/ui';

type SignalMeta = { label: string; escalation: 'IMMEDIATE' | 'CONDITIONAL' | 'NONE' };
type Theme = { name: string; pillar?: string | null; signals: string[]; signalsMeta?: SignalMeta[] };

export function RaiseSignalScreen() {
  const { c } = useTheme();
  const { user } = useAuth();
  const nav = useNavigation<any>();

  const houses = user?.assigned_house_ids || [];
  const houseId = houses.length === 1 ? houses[0] : undefined; // else the API resolves it from the TL's assignment

  // Live governance taxonomy (themes + per-signal escalation flags) for THIS service's sector.
  const themesApi = useApi<any>(houseId ? `/governance/domains?house_id=${houseId}` : '/governance/domains');
  const themes: Theme[] = themesApi.data?.domains ?? themesApi.data?.data?.domains ?? [];

  const [type, setType] = useState('');
  const [signalLabel, setSignalLabel] = useState('');
  const [requiresImmediateAction, setRequiresImmediateAction] = useState(false);
  const [person, setPerson] = useState('');
  const [personId, setPersonId] = useState('');
  const [subjectType, setSubjectType] = useState<'PERSON' | 'SERVICE' | 'WORKFORCE' | 'PROCESS'>('PERSON');
  const [observation, setObservation] = useState('');
  const [immediate, setImmediate] = useState('');
  const [busy, setBusy] = useState(false);
  const [submissionId] = useState(() => `signal-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const selectedTheme = themes.find((t) => t.name === type);
  const signalMetas: SignalMeta[] = selectedTheme?.signalsMeta
    ?? (selectedTheme?.signals || []).map((l) => ({ label: l, escalation: 'NONE' as const }));
  const selectedMeta = signalMetas.find((s) => s.label === signalLabel);

  // Controlled person selection — store the service-user's identifier, not a typed name.
  const suApi = useApi<any>(houseId ? `/houses/${houseId}/service-users` : null);
  const serviceUsers: any[] = suApi.data?.data ?? suApi.data ?? [];

  const submit = async () => {
    if (!observation.trim()) { Alert.alert('Add what you saw', 'A short account of the observation is required.'); return; }
    if (!type) { Alert.alert('Choose a theme', 'Select the governance theme this signal belongs to.'); return; }
    const body: any = {
      service_id: houseId,
      service_user_id: personId || undefined,
      related_person: person.trim() || undefined,
      subject_type: subjectType,
      category: type,               // → risk_domain (drives clustering + rules)
      governance_domain: type,
      signal_label: signalLabel || undefined,
      signal_type: /safeguard/i.test(type) ? 'Safeguarding' : 'Concern',
      requires_immediate_action: requiresImmediateAction,
      client_submission_id: submissionId,
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

      <Label>What does this concern?</Label>
      <Row gap={7} style={{ flexWrap: 'wrap' }}>
        {(['PERSON', 'SERVICE', 'WORKFORCE', 'PROCESS'] as const).map((s) => (
          <Chip key={s} label={s[0] + s.slice(1).toLowerCase()} active={subjectType === s}
            onPress={() => { setSubjectType(s); if (s !== 'PERSON') { setPerson(''); setPersonId(''); } }} />
        ))}
      </Row>

      {subjectType === 'PERSON' && <><Label>Person (optional)</Label>
      {serviceUsers.length > 0 ? (
        <Row gap={7} style={{ flexWrap: 'wrap' }}>
          <Chip label="Not a person" active={!personId}
            onPress={() => { setPerson(''); setPersonId(''); }} />
          {serviceUsers.map((u: any) => (
            <Chip key={String(u.id)} label={u.display_name} active={personId === String(u.id)}
              onPress={() => { setPersonId(String(u.id)); setPerson(u.display_name); }} />
          ))}
        </Row>
      ) : (
        <Field value={person} onChangeText={setPerson} placeholder="Who it concerns" />
      )}</>}

      <Label>Governance theme</Label>
      <Row gap={7} style={{ flexWrap: 'wrap' }}>
        {themes.map((t) => (
          <Chip key={t.name} label={t.name} active={type === t.name}
            onPress={() => { setType(t.name); setSignalLabel(''); }} />
        ))}
      </Row>

      {selectedTheme && signalMetas.length > 0 && (
        <>
          <Label>Signal</Label>
          <Row gap={7} style={{ flexWrap: 'wrap' }}>
            {signalMetas.map((s) => (
              <Chip key={s.label} label={s.label} active={signalLabel === s.label} onPress={() => setSignalLabel(s.label)} />
            ))}
          </Row>
          {selectedMeta?.escalation === 'IMMEDIATE' && (
            <Row gap={7} style={{ backgroundColor: c.sevCrit + '18', borderColor: c.sevCrit, borderWidth: 1, borderRadius: 10, padding: 10 }}>
              <Feather name="alert-triangle" size={15} color={c.sevCrit} />
              <Text size={12} weight="600" color={c.sevCrit} style={{ flex: 1 }}>Escalated to the Registered Manager immediately on saving.</Text>
            </Row>
          )}
          {selectedMeta?.escalation === 'CONDITIONAL' && (
            <Row gap={7} style={{ backgroundColor: c.sevHigh + '18', borderColor: c.sevHigh, borderWidth: 1, borderRadius: 10, padding: 10 }}>
              <Feather name="alert-triangle" size={15} color={c.sevHigh} />
              <Text size={12} weight="600" color={c.sevHigh} style={{ flex: 1 }}>The Registered Manager will determine severity and escalation.</Text>
            </Row>
          )}
        </>
      )}

      <Label>Does this require immediate action?</Label>
      <Row gap={8}>
        <Chip label="No" active={!requiresImmediateAction} onPress={() => setRequiresImmediateAction(false)} />
        <Chip label="Yes" active={requiresImmediateAction} onPress={() => setRequiresImmediateAction(true)} />
      </Row>

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
