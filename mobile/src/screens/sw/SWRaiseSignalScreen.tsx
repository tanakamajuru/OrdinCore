import React, { useState } from 'react';
import { View, Pressable, Alert, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from 'expo-audio';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/api/client';
import { useApi } from '@/api/useApi';
import { queue } from '@/offline/queue';
import { pickPhoto, uploadMedia, fileToBase64, Evidence } from '@/api/media';
import { radius, severityColor } from '@/theme/tokens';
import { Screen, Row, Field, TextArea, Button, Text } from '@/components/ui';

type SignalMeta = { label: string; escalation: 'IMMEDIATE' | 'CONDITIONAL' | 'NONE' };
type Theme = { name: string; signals: string[]; signalsMeta?: SignalMeta[] };
const SEVERITIES = ['Low', 'Med', 'High', 'Critical'];
const sevToApi = (s: string) => (s === 'Med' ? 'Moderate' : s);

function Caption({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <Text size={13} weight="600" color={c.ink} style={{ marginBottom: 6 }}>{children}</Text>;
}

function Dropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)}
        style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text size={14}>{value}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />
      </Pressable>
      {open && (
        <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, marginTop: 6, overflow: 'hidden' }}>
          {options.map((o, i) => (
            <Pressable key={o} onPress={() => { onChange(o); setOpen(false); }}
              style={{ paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.lineSoft, backgroundColor: o === value ? c.accentTint : 'transparent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text size={14} color={o === value ? c.accent : c.ink}>{o}</Text>
              {o === value && <Feather name="check" size={16} color={c.accent} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function SeverityRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { c } = useTheme();
  return (
    <Row gap={8}>
      {SEVERITIES.map((s) => {
        const on = value === s;
        const col = severityColor(c, sevToApi(s));
        return (
          <Pressable key={s} onPress={() => onChange(s)} style={{
            flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md,
            borderWidth: on ? 0 : 1, borderColor: c.line, backgroundColor: on ? col : c.card,
          }}>
            <Text size={12.5} weight="600" color={on ? '#fff' : c.muted}>{s}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

/* Photo / Voice attach button — shows a spinner while uploading, and a live dot while recording. */
function AttachButton({ icon, label, active, busy, onPress }: { icon: any; label: string; active?: boolean; busy?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={busy ? undefined : onPress} style={{
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12,
      borderWidth: 1, borderColor: active ? c.sevCrit : c.line, borderRadius: radius.md, backgroundColor: active ? c.sevCrit + '18' : c.card,
    }}>
      {busy ? <ActivityIndicator size="small" color={c.accent} /> : <Feather name={icon} size={16} color={active ? c.sevCrit : c.muted} />}
      <Text size={13.5} weight="600" color={active ? c.sevCrit : c.muted}>{label}</Text>
    </Pressable>
  );
}

export function SWRaiseSignalScreen() {
  const { c } = useTheme();
  const { user } = useAuth();
  const nav = useNavigation<any>();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const themesApi = useApi<any>('/governance/domains');
  const themes: Theme[] = themesApi.data?.domains ?? themesApi.data?.data?.domains ?? [];

  const [domain, setDomain] = useState('');
  const [signalLabel, setSignalLabel] = useState('');
  const [severity, setSeverity] = useState('Critical');

  const selectedTheme = themes.find((t) => t.name === domain);
  const signalMetas: SignalMeta[] = selectedTheme?.signalsMeta
    ?? (selectedTheme?.signals || []).map((l) => ({ label: l, escalation: 'NONE' as const }));
  const selectedMeta = signalMetas.find((s) => s.label === signalLabel);
  const [resident, setResident] = useState('');
  const [residentId, setResidentId] = useState('');
  const [what, setWhat] = useState('');
  const [busy, setBusy] = useState(false);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [attaching, setAttaching] = useState<null | 'photo' | 'voice'>(null);
  const [recording, setRecording] = useState(false);

  const houses = user?.assigned_house_ids || [];
  const houseId = houses.length === 1 ? houses[0] : undefined;
  const houseName = (user as any)?.house_name || (user as any)?.service_name || 'Your service';

  // Controlled resident selection — the people supported at this house, so a signal stores the
  // person's identifier rather than a typed name (falls back to free text if the list is empty).
  const suApi = useApi<any>(houseId ? `/houses/${houseId}/service-users` : null);
  const serviceUsers: any[] = suApi.data?.data ?? suApi.data ?? [];

  const addPhoto = () => {
    Alert.alert('Add photo evidence', undefined, [
      { text: 'Take photo', onPress: () => runPhoto('camera') },
      { text: 'Choose from library', onPress: () => runPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const runPhoto = async (source: 'camera' | 'library') => {
    setAttaching('photo');
    try {
      const picked = await pickPhoto(source);
      if (picked) setEvidence(await uploadMedia(picked.base64, picked.mime));
    } catch (e: any) {
      Alert.alert("Couldn't attach photo", e?.message || 'Please try again.');
    } finally { setAttaching(null); }
  };

  const toggleVoice = async () => {
    if (recording) {
      setRecording(false); setAttaching('voice');
      try {
        await recorder.stop();
        if (recorder.uri) {
          const base64 = await fileToBase64(recorder.uri);
          setEvidence(await uploadMedia(base64, 'audio/m4a'));
        }
      } catch (e: any) {
        Alert.alert("Couldn't attach voice note", e?.message || 'Please try again.');
      } finally { setAttaching(null); }
      return;
    }
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) { Alert.alert('Microphone needed', 'Allow microphone access to record a voice note.'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch (e: any) {
      Alert.alert("Couldn't start recording", e?.message || 'Please try again.');
    }
  };

  const submit = async () => {
    if (!domain) { Alert.alert('Choose a theme', 'Select the governance theme this signal belongs to.'); return; }
    if (!what.trim()) { Alert.alert('Add what happened', 'A short, clear account is required.'); return; }
    const body: any = {
      service_id: houseId,
      service_user_id: residentId || undefined,
      related_person: resident.trim() || undefined,
      category: domain,
      governance_domain: domain,
      signal_label: signalLabel || undefined,
      signal_type: /safeguard/i.test(domain) ? 'Safeguarding' : 'Concern',
      severity: sevToApi(severity),
      description: what.trim(),
      evidence_url: evidence?.url,
    };
    setBusy(true);
    try {
      await api.post('/pulses', body);
      Alert.alert('Signal saved', 'Your account has been logged as evidence.');
      nav.goBack();
    } catch (e: any) {
      if (e instanceof ApiError) {
        Alert.alert("Couldn't save", e.message);
      } else {
        await queue.enqueue({ kind: 'signal', path: '/pulses', body, label: `${domain} · ${resident || 'signal'}` });
        Alert.alert('Saved on this device', "You're offline — it will send automatically when you're back.");
        nav.goBack();
      }
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Text size={22} weight="700" style={{ marginBottom: 4 }}>Raise a Signal</Text>

      <View style={{ gap: 4 }}>
        <Caption>Governance theme</Caption>
        <Dropdown value={domain || 'Select a theme…'} options={themes.map((t) => t.name)}
          onChange={(v) => { setDomain(v); setSignalLabel(''); }} />
      </View>

      {selectedTheme && signalMetas.length > 0 && (
        <View style={{ gap: 4 }}>
          <Caption>Signal</Caption>
          <Dropdown value={signalLabel || 'Select a signal…'} options={signalMetas.map((s) => s.label)} onChange={setSignalLabel} />
          {selectedMeta?.escalation === 'IMMEDIATE' && (
            <Row gap={7} style={{ backgroundColor: c.sevCrit + '18', borderColor: c.sevCrit, borderWidth: 1, borderRadius: radius.md, padding: 10, marginTop: 4 }}>
              <Feather name="alert-triangle" size={15} color={c.sevCrit} />
              <Text size={12} weight="600" color={c.sevCrit} style={{ flex: 1 }}>Escalated to the Registered Manager immediately on saving.</Text>
            </Row>
          )}
          {selectedMeta?.escalation === 'CONDITIONAL' && (
            <Row gap={7} style={{ backgroundColor: c.sevHigh + '18', borderColor: c.sevHigh, borderWidth: 1, borderRadius: radius.md, padding: 10, marginTop: 4 }}>
              <Feather name="alert-triangle" size={15} color={c.sevHigh} />
              <Text size={12} weight="600" color={c.sevHigh} style={{ flex: 1 }}>Escalated immediately if marked High or Critical.</Text>
            </Row>
          )}
        </View>
      )}

      <View style={{ gap: 4 }}>
        <Caption>Severity</Caption>
        <SeverityRow value={severity} onChange={setSeverity} />
      </View>

      <View style={{ gap: 4 }}>
        <Caption>Resident</Caption>
        {serviceUsers.length > 0 ? (
          <Dropdown
            value={resident || '— Not about a resident —'}
            options={['— Not about a resident —', ...serviceUsers.map((u: any) => u.display_name)]}
            onChange={(v) => {
              if (v.startsWith('—')) { setResident(''); setResidentId(''); return; }
              const su = serviceUsers.find((u: any) => u.display_name === v);
              setResident(v); setResidentId(su?.id ? String(su.id) : '');
            }}
          />
        ) : (
          <View style={{ position: 'relative', justifyContent: 'center' }}>
            <Field value={resident} onChangeText={setResident} placeholder="Search resident…" />
            <Feather name="search" size={16} color={c.faint} style={{ position: 'absolute', right: 12 }} />
          </View>
        )}
      </View>

      <View style={{ gap: 4 }}>
        <Caption>House</Caption>
        <Row style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 13 }} gap={8}>
          <Feather name="home" size={15} color={c.muted} />
          <Text size={14}>{houseName}</Text>
        </Row>
      </View>

      <View style={{ gap: 4 }}>
        <Caption>What happened?</Caption>
        <TextArea value={what} onChangeText={setWhat} placeholder="Be clear and concise…" required minHeight={92} />
      </View>

      <Row gap={10}>
        <AttachButton icon="camera" label={attaching === 'photo' ? 'Attaching…' : 'Photo'} busy={attaching === 'photo'} onPress={addPhoto} />
        <AttachButton icon={recording ? 'square' : 'mic'} label={recording ? 'Stop' : attaching === 'voice' ? 'Attaching…' : 'Voice'} active={recording} busy={attaching === 'voice'} onPress={toggleVoice} />
      </Row>

      {/* Attached evidence preview */}
      {evidence && (
        <Row style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 10 }} gap={11}>
          {evidence.kind === 'photo' ? (
            <Image source={{ uri: evidence.url }} style={{ width: 42, height: 42, borderRadius: radius.sm }} />
          ) : (
            <View style={{ width: 42, height: 42, borderRadius: radius.sm, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="mic" size={18} color={c.accent} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text size={13} weight="600">{evidence.kind === 'photo' ? 'Photo attached' : 'Voice note attached'}</Text>
            <Text size={11.5} muted numberOfLines={1}>{evidence.filename || 'Evidence'}</Text>
          </View>
          <Pressable onPress={() => setEvidence(null)} hitSlop={8}><Feather name="x" size={18} color={c.muted} /></Pressable>
        </Row>
      )}

      <Button title="Save Signal" onPress={submit} loading={busy} style={{ marginTop: 4 }} />
    </Screen>
  );
}
