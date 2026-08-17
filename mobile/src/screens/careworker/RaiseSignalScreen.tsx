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
import { Screen, Text, Row, Field, TextArea, Button } from '@/components/ui';

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
  const [description, setDescription] = useState('');
  const [immediateAction, setImmediateAction] = useState<'no' | 'yes'>('no');
  const [photos, setPhotos] = useState<string[]>(['1', '2']); // placeholder ids

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

        <Field label="Select person" optional>
          <Row
            justify="space-between"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
            }}
          >
            <Text muted>Search and select a person</Text>
            <Feather name="chevron-right" size={16} color={colors.textMuted} />
          </Row>
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
          <SelectRow placeholder="Select a theme" />
        </Field>

        <Field label="Signal type">
          <SelectRow placeholder="Select a signal type" />
        </Field>

        <Field label="Immediate action required?">
          <Row gap={spacing.xl}>
            <RadioRow label="No" selected={immediateAction === 'no'} onPress={() => setImmediateAction('no')} accent={accent} />
            <RadioRow label="Yes" selected={immediateAction === 'yes'} onPress={() => setImmediateAction('yes')} accent={accent} />
          </Row>
        </Field>

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

      <Button label="Submit signal" accentColor={accent} onPress={() => navigation.navigate('MySignals' as never)} />
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
