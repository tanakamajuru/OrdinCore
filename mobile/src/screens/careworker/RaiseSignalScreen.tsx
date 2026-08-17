/**
 * screens/careworker/RaiseSignalScreen.tsx
 * Two-step "Raise a signal" flow — matches Care Worker screenshots 2 & 3.
 * Step 1: who/what + what happened + theme + signal type + immediate action
 * Step 2: evidence (photo / voice) + submit
 */
import React, { useState } from 'react';
import { View, Pressable, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { roleAccent } from '@/theme/roleAccents';
import { useApi } from '@/api/useApi';
import { listOf } from '@/api/mappers';
import { api } from '@/api/client';
import { Screen, Text, Row, Field, TextArea, Button } from '@/components/ui';
import { SelectModal, PersonPicker, type PersonSelection, type Option } from '@/components/pickers';

// "Signal type" carries the governance severity the backend requires.
const signalTypeOptions: Option[] = [
  { value: 'Low', label: 'Routine observation', sublabel: 'Low' },
  { value: 'Medium', label: 'Notable concern', sublabel: 'Medium' },
  { value: 'High', label: 'Serious concern', sublabel: 'High' },
  { value: 'Critical', label: 'Critical / immediate risk', sublabel: 'Critical' },
];

const who = [
  { key: 'person', label: 'Person', icon: 'user' as const },
  { key: 'service', label: 'Service', icon: 'briefcase' as const },
  { key: 'environment', label: 'Environment', icon: 'home' as const },
  { key: 'other', label: 'Other', icon: 'more-horizontal' as const },
];

export default function RaiseSignalScreen() {
  const { colors, radius, spacing } = useTheme();
  const navigation = useNavigation();
  const accent = roleAccent.careWorker;

  const [step, setStep] = useState<1 | 2>(1);
  const [whoKey, setWhoKey] = useState('person');
  const [person, setPerson] = useState<PersonSelection | null>(null);
  const [domain, setDomain] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const [description, setDescription] = useState('');
  const [immediateAction, setImmediateAction] = useState<'no' | 'yes'>('no');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: domainData } = useApi<any>('/governance/domains');
  const domainOptions: Option[] = listOf(domainData?.data ?? domainData).map((d: any) => ({
    value: d.name || d.label || String(d),
    label: d.name || d.label || String(d),
    sublabel: d.pillar || undefined,
  }));

  const canSubmit = !!person?.service_user_id && !!person?.house_id && !!domain && !!severity && description.trim().length >= 10;

  const submit = async () => {
    if (submitting) return;
    if (!canSubmit) {
      setError('Select a person, a theme, a signal type, and describe what happened (min 10 characters).');
      setStep(1);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const now = new Date();
      await api.post('/pulses', {
        service_id: person!.house_id,
        governance_domain: domain,
        category: domain,
        severity,
        description: description.trim(),
        entry_date: now.toISOString().slice(0, 10),
        entry_time: now.toTimeString().slice(0, 5),
        service_user_id: person!.service_user_id,
        related_person: person!.related_person,
        immediate_action: immediateAction === 'yes' ? 'Immediate action was taken' : undefined,
      });
      navigation.navigate('MySignals' as never);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit signal');
      setSubmitting(false);
    }
  };

  const StepDots = () => (
    <Row gap={6} style={{ marginBottom: spacing.xl }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View
          key={n}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: n <= step ? accent : colors.border,
          }}
        />
      ))}
    </Row>
  );

  const Header = () => (
    <Row gap={spacing.md} style={{ paddingTop: spacing.sm, marginBottom: spacing.lg }}>
      <Pressable
        onPress={() => (step === 1 ? navigation.goBack() : setStep(1))}
        hitSlop={10}
      >
        <Feather name="chevron-left" size={22} color={colors.text} />
      </Pressable>
      <Text variant="subtitle">Raise a signal</Text>
    </Row>
  );

  if (step === 1) {
    return (
      <Screen scroll>
        <Header />
        <StepDots />

        <Field label="Who/what is this about?">
          <Row gap={spacing.sm} wrap>
            {who.map((w) => {
              const active = w.key === whoKey;
              return (
                <Pressable
                  key={w.key}
                  onPress={() => setWhoKey(w.key)}
                  style={{
                    width: '23%',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? accent : colors.border,
                    backgroundColor: active ? accent + '12' : colors.surface,
                  }}
                >
                  <Feather name={w.icon} size={18} color={active ? accent : colors.textMuted} />
                  <Text variant="caption" style={active ? { color: accent } : undefined} weight="600">
                    {w.label}
                  </Text>
                </Pressable>
              );
            })}
          </Row>
        </Field>

        <Field label="Select person">
          <PersonPicker value={person} onSelect={setPerson} />
        </Field>

        <Field label="What happened?">
          <TextArea
            value={description}
            onChangeText={setDescription}
            placeholder="A short governance observation (2–3 lines)…"
            maxLength={200}
          />
        </Field>

        <Field label="Theme">
          <SelectModal placeholder="Select a theme" label="Governance theme" value={domain} options={domainOptions} onSelect={(o) => setDomain(o.value)} />
        </Field>

        <Field label="Signal type">
          <SelectModal placeholder="Select a signal type" label="Signal type" value={severity} options={signalTypeOptions} onSelect={(o) => setSeverity(o.value)} />
        </Field>

        <Field label="Immediate action required?">
          <Row gap={spacing.xl}>
            <RadioRow label="No" selected={immediateAction === 'no'} onPress={() => setImmediateAction('no')} accent={accent} />
            <RadioRow label="Yes" selected={immediateAction === 'yes'} onPress={() => setImmediateAction('yes')} accent={accent} />
          </Row>
        </Field>

        {error ? <Text style={{ color: colors.danger, marginBottom: spacing.md }} variant="caption">{error}</Text> : null}

        <Button label="Next" accentColor={accent} onPress={() => setStep(2)} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header />
      <StepDots />

      <Field label="Evidence" optional>
        <Text muted variant="caption" style={{ marginBottom: spacing.md, marginTop: -spacing.sm }}>
          Add photos or voice recording to help provide more context.
        </Text>

        <Row gap={spacing.sm} style={{ marginBottom: spacing.md }}>
          <IconRow icon="camera" label="Add photo" />
        </Row>
        <Row gap={spacing.sm} style={{ marginBottom: spacing.lg }}>
          <IconRow icon="mic" label="Record voice" />
        </Row>

        <Text weight="600" style={{ marginBottom: spacing.sm }}>
          Photos
        </Text>
        <Row gap={spacing.sm} style={{ marginBottom: spacing.lg }}>
          {photos.map((p) => (
            <View
              key={p}
              style={{ width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt }}
            />
          ))}
          <Pressable
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => setPhotos((p) => [...p, String(p.length + 1)])}
          >
            <Feather name="plus" size={18} color={colors.textMuted} />
          </Pressable>
        </Row>

        <Text weight="600" style={{ marginBottom: spacing.sm }}>
          Voice recording
        </Text>
        <Row
          gap={spacing.sm}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xl }}
        >
          <Feather name="play" size={16} color={colors.text} />
          <Text variant="caption">0:00</Text>
          <View style={{ flex: 1, height: 2, backgroundColor: colors.border, borderRadius: 1 }} />
          <Text variant="caption">0:15</Text>
          <Feather name="x" size={16} color={colors.textMuted} />
        </Row>
      </Field>

      {error ? <Text style={{ color: colors.danger, marginBottom: spacing.md }} variant="caption">{error}</Text> : null}

      <Button label={submitting ? 'Submitting…' : 'Submit signal'} accentColor={accent} onPress={submit} />
    </Screen>
  );
}

function SelectRow({ placeholder }: { placeholder: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Row
      justify="space-between"
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md }}
    >
      <Text muted>{placeholder}</Text>
      <Feather name="chevron-down" size={16} color={colors.textMuted} />
    </Row>
  );
}

function RadioRow({
  label,
  selected,
  onPress,
  accent,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accent: string;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selected ? accent : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accent }} /> : null}
      </View>
      <Text>{label}</Text>
    </Pressable>
  );
}

function IconRow({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Row
      gap={spacing.sm}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <Feather name={icon} size={16} color={roleAccent.careWorker} />
      <Text weight="600">{label}</Text>
    </Row>
  );
}
