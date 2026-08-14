/**
 * screens/teamleader/RecordSignalScreen.tsx
 * Quick signal capture — matches Team Leader screenshot 4/8.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Field, TextArea, Button } from '@/components/ui';

export default function RecordSignalScreen() {
  const { colors, radius, spacing } = useTheme();
  const navigation = useNavigation();
  const [immediate, setImmediate] = useState<'no' | 'action' | 'urgent'>('action');
  const [whatHappened, setWhatHappened] = useState("Refused morning medication. Said he doesn't feel he needs it.");
  const [whatDid, setWhatDid] = useState('Spoke with John and encouraged medication. Will monitor and inform CMHT if refusal continues.');

  const options: { key: typeof immediate; label: string }[] = [
    { key: 'no', label: 'No immediate action' },
    { key: 'action', label: 'Action taken' },
    { key: 'urgent', label: 'Urgent management attention required' },
  ];

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
        <SelectRow value="John" />
      </Field>

      <Field label="Theme">
        <SelectRow value="Medication" />
      </Field>

      <Field label="What happened?">
        <TextArea value={whatHappened} onChangeText={setWhatHappened} maxLength={500} />
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

      <Button label="Submit signal" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

function SelectRow({ value }: { value: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Row
      justify="space-between"
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md }}
    >
      <Text>{value}</Text>
      <Feather name="chevron-down" size={16} color={colors.textMuted} />
    </Row>
  );
}
