import React, { useState, useEffect } from 'react';
import { Alert, View, Modal, ScrollView, Pressable } from 'react-native';
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

  // Resolve the services the TL may record against, WITH their names, so the site can be
  // picked explicitly (and the person list loads for the chosen site). The server still
  // enforces assignment; this just lets the TL choose when assigned to more than one.
  const assigned = user?.assigned_house_ids || [];
  const housesApi = useApi<any>('/houses?limit=100');
  const allHouses: any[] = housesApi.data?.data ?? housesApi.data ?? [];
  const services: { id: string; name: string }[] = (Array.isArray(allHouses) ? allHouses : [])
    .filter((h: any) => assigned.length === 0 || assigned.includes('all') || assigned.includes(h.id))
    .map((h: any) => ({ id: h.id, name: h.name }));

  const [selectedHouseId, setSelectedHouseId] = useState<string>('');
  // Default to the first available service once loaded.
  useEffect(() => {
    if (!selectedHouseId && services.length > 0) setSelectedHouseId(services[0].id);
  }, [services.length]);
  const houseId = selectedHouseId || undefined;
  const houseName = services.find((s) => s.id === houseId)?.name;

  // Live governance taxonomy (themes + per-signal escalation flags) for THIS service's sector.
  const themesApi = useApi<any>(houseId ? `/governance/domains?house_id=${houseId}` : '/governance/domains', [houseId]);
  const themes: Theme[] = themesApi.data?.domains ?? themesApi.data?.data?.domains ?? [];

  const [type, setType] = useState('');
  const [signalLabel, setSignalLabel] = useState('');
  // Deliberate answer — neither preselected. The TL must actively choose Yes or No.
  const [immediateAnswer, setImmediateAnswer] = useState<'' | 'no' | 'yes'>('');
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [themeQuery, setThemeQuery] = useState('');
  const [person, setPerson] = useState('');
  const [personId, setPersonId] = useState('');
  const [subjectType, setSubjectType] = useState<'PERSON' | 'SERVICE' | 'WORKFORCE' | 'PROCESS'>('PERSON');
  const [observation, setObservation] = useState('');
  const [immediate, setImmediate] = useState('');
  const [busy, setBusy] = useState(false);
  const [submissionId] = useState(() => `signal-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const q = themeQuery.trim().toLowerCase();
  const filteredThemes = q
    ? themes.filter((t) => `${t.name} ${t.pillar || ''} ${(t.signals || []).join(' ')}`.toLowerCase().includes(q))
    : themes;
  const selectedTheme = themes.find((t) => t.name === type);
  const signalMetas: SignalMeta[] = selectedTheme?.signalsMeta
    ?? (selectedTheme?.signals || []).map((l) => ({ label: l, escalation: 'NONE' as const }));
  const selectedMeta = signalMetas.find((s) => s.label === signalLabel);

  // Controlled person selection — store the service-user's identifier, not a typed name.
  // Keyed on the chosen site so the people list follows the selected service.
  const suApi = useApi<any>(houseId ? `/houses/${houseId}/service-users` : null, [houseId]);
  const serviceUsers: any[] = suApi.data?.data ?? suApi.data ?? [];
  // When the site changes, clear any person chosen for the previous site.
  useEffect(() => { setPerson(''); setPersonId(''); }, [houseId]);

  const submit = async () => {
    if (!observation.trim()) { Alert.alert('Add what you saw', 'A short account of the observation is required.'); return; }
    if (!type) { Alert.alert('Choose a theme', 'Select the main theme this signal belongs to.'); return; }
    if (!immediateAnswer) { Alert.alert('Immediate action?', 'Choose Yes or No for whether this needs immediate action — it is not assumed.'); return; }
    const body: any = {
      service_id: houseId,
      service_user_id: personId || undefined,
      related_person: person.trim() || undefined,
      subject_type: subjectType,
      category: type,               // → risk_domain (drives clustering + rules)
      governance_domain: type,
      signal_label: signalLabel || undefined,
      signal_type: /safeguard/i.test(type) ? 'Safeguarding' : 'Concern',
      requires_immediate_action: immediateAnswer === 'yes',
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
      {/* Site (service) — pick when assigned to more than one; shown for confirmation otherwise. */}
      <Label>Service</Label>
      {services.length > 1 ? (
        <Row gap={7} style={{ flexWrap: 'wrap' }}>
          {services.map((s) => (
            <Chip key={s.id} label={s.name} active={houseId === s.id} onPress={() => setSelectedHouseId(s.id)} />
          ))}
        </Row>
      ) : (
        <Row style={{ justifyContent: 'flex-start' }}>
          <Pill tone="ghost">{houseName || (housesApi.loading ? 'Loading service…' : 'Service auto-resolved')}</Pill>
        </Row>
      )}

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

      <Label>Main theme</Label>
      <Button title={type ? `${type} · Change` : 'Choose main theme'} tone="ghost" icon="search"
        onPress={() => { setThemeQuery(''); setThemePickerOpen(true); }} />
      <Text size={11} muted>Choose what the signal is mainly about.</Text>

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
        <Chip label="No" active={immediateAnswer === 'no'} onPress={() => setImmediateAnswer('no')} />
        <Chip label="Yes" active={immediateAnswer === 'yes'} onPress={() => setImmediateAnswer('yes')} />
      </Row>
      {immediateAnswer === 'yes' && (
        <Row gap={7} style={{ backgroundColor: c.sevCrit + '18', borderColor: c.sevCrit, borderWidth: 1, borderRadius: 10, padding: 10 }}>
          <Feather name="alert-triangle" size={15} color={c.sevCrit} />
          <Text size={12} weight="600" color={c.sevCrit} style={{ flex: 1 }}>Follow your urgent procedure now. Recording a signal does not replace urgent contact or emergency escalation.</Text>
        </Row>
      )}

      <Label>What you saw</Label>
      <TextArea value={observation} onChangeText={setObservation} placeholder="Your account, in your own words — recorded as evidence…" required minHeight={90} />

      <Label>Immediate action taken (optional)</Label>
      <Field value={immediate} onChangeText={setImmediate} placeholder="What you did there and then" />

      <Button title="Save signal" onPress={submit} loading={busy} style={{ marginTop: 4 }} />
      <Row gap={6} style={{ justifyContent: 'center' }}>
        <Feather name="cloud" size={13} color={c.muted} />
        <Text muted size={11}>Saves to this device · syncs automatically</Text>
      </Row>

      {/* Searchable main-theme picker — one row per theme instead of a wall of chips. */}
      <Modal visible={themePickerOpen} transparent animationType="slide" onRequestClose={() => setThemePickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '82%', padding: 16 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text size={17} weight="700">Choose main theme</Text>
              <Button title="Close" tone="ghost" onPress={() => setThemePickerOpen(false)} />
            </Row>
            <Text size={12} muted>Choose what the signal is mainly about.</Text>
            <Field value={themeQuery} onChangeText={setThemeQuery} placeholder="Search e.g. repair, money, progress" />
            <ScrollView style={{ marginTop: 8 }} keyboardShouldPersistTaps="handled">
              {filteredThemes.length === 0
                ? <Text muted style={{ padding: 12 }}>No matching theme. Try another word or clear the search.</Text>
                : filteredThemes.map((t) => (
                  <Pressable key={t.name} onPress={() => { setType(t.name); setSignalLabel(''); setThemePickerOpen(false); }}
                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
                    <Text size={14} weight="600">{t.name}</Text>
                    {t.pillar ? <Text size={11.5} muted>{t.pillar}</Text> : null}
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
