/**
 * screens/teamleader/RecordSignalScreen.tsx
 * Quick signal capture — matches Team Leader screenshot 4/8.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { listOf } from '@/api/mappers';
import { api } from '@/api/client';
import { Screen, Text, Row, Field, TextArea, Button } from '@/components/ui';
import { SelectModal, PersonPicker, type PersonSelection, type Option } from '@/components/pickers';

const severityForImmediate: Record<'no' | 'action' | 'urgent', string> = { no: 'Low', action: 'Medium', urgent: 'High' };

export default function RecordSignalScreen() {
  const { colors, radius, spacing } = useTheme();
  const navigation = useNavigation();
  const [immediate, setImmediate] = useState<'no' | 'action' | 'urgent'>('action');
  const [person, setPerson] = useState<PersonSelection | null>(null);
  const [domain, setDomain] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [whatDid, setWhatDid] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: domainData } = useApi<any>('/governance/domains');
  const domainOptions: Option[] = listOf(domainData?.data ?? domainData).map((d: any) => ({
    value: d.name || d.label || String(d),
    label: d.name || d.label || String(d),
    sublabel: d.pillar || undefined,
  }));

  const options: { key: typeof immediate; label: string }[] = [
    { key: 'no', label: 'No immediate action' },
    { key: 'action', label: 'Action taken' },
    { key: 'urgent', label: 'Urgent management attention required' },
  ];

  const canSubmit = !!person?.service_user_id && !!person?.house_id && !!domain && whatHappened.trim().length >= 10;

  const submit = async () => {
    if (submitting) return;
    if (!canSubmit) { setError('Select a person and theme, and describe what happened (min 10 characters).'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const now = new Date();
      await api.post('/pulses', {
        service_id: person!.house_id,
        governance_domain: domain,
        category: domain,
        severity: severityForImmediate[immediate],
        description: whatHappened.trim(),
        entry_date: now.toISOString().slice(0, 10),
        entry_time: now.toTimeString().slice(0, 5),
        service_user_id: person!.service_user_id,
        related_person: person!.related_person,
        immediate_action: whatDid.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message || 'Failed to submit signal');
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <Row justify="space-between" style={{ paddingTop: spacing.sm, marginBottom: spacing.lg }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="x" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">Record Signal</Text>
        <View style={{ width: 22 }} />
      </Row>

      <Field label="Who/what does this concern?">
        <PersonPicker value={person} onSelect={setPerson} />
      </Field>

      <Field label="Theme">
        <SelectModal placeholder="Select a theme" label="Governance theme" value={domain} options={domainOptions} onSelect={(o) => setDomain(o.value)} />
      </Field>

      <Field label="What happened?">
        <TextArea value={whatHappened} onChangeText={setWhatHappened} placeholder="A short governance observation (2–3 lines)…" maxLength={200} />
      </Field>

      <Field label="Immediate action required?">
        <View style={{ gap: spacing.sm }}>
          {options.map((o) => (
            <Pressable key={o.key} onPress={() => setImmediate(o.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: immediate === o.key ? colors.primary : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {immediate === o.key ? (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
                ) : null}
              </View>
              <Text>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="What did you do?">
        <TextArea value={whatDid} onChangeText={setWhatDid} maxLength={500} />
      </Field>

      {error ? <Text style={{ color: colors.danger, marginBottom: spacing.md }} variant="caption">{error}</Text> : null}

      <Button label={submitting ? 'Submitting…' : 'Submit signal'} onPress={submit} />
    </Screen>
  );
}
