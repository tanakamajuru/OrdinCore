/**
 * screens/careworker/ActionDetailsScreen.tsx
 * Matches Care Worker screenshot: Action details with evidence + complete.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { roleAccent } from '@/theme/roleAccents';
import { Screen, Text, Row, Card, Button } from '@/components/ui';

export default function ActionDetailsScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const accent = roleAccent.careWorker;

  return (
    <Screen scroll>
      <Row gap={spacing.md} style={{ paddingTop: spacing.sm, marginBottom: spacing.lg }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">Action details</Text>
      </Row>

      <Text variant="title" style={{ fontSize: 19 }}>
        Check bedroom smoke detector
      </Text>
      <Text muted style={{ marginBottom: spacing.sm }}>
        Bedford House
      </Text>
      <View
        style={{
          alignSelf: 'flex-start',
          backgroundColor: '#1B8A3E1F',
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 3,
          marginBottom: spacing.lg,
        }}
      >
        <Text style={{ color: '#1B8A3E', fontSize: 11 }} weight="700">
          Environmental signal
        </Text>
      </View>

      <Text weight="700" style={{ marginBottom: 4 }}>
        What you need to do
      </Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        Check the smoke detector in the bedroom and ensure it is working correctly.
      </Text>

      <Text weight="700" style={{ marginBottom: 4 }}>
        Origin
      </Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        Signal submitted by you{'\n'}Yesterday, 14:20
      </Text>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Add evidence
      </Text>
      <Text muted variant="caption" style={{ marginBottom: spacing.md, marginTop: -6 }}>
        Add a photo or note to confirm action completed.
      </Text>

      <Row gap={spacing.sm} style={{ marginBottom: spacing.sm }}>
        <EvidenceRow icon="camera" label="Add photo" accent={accent} />
      </Row>
      <Row gap={spacing.sm} style={{ marginBottom: spacing.xl }}>
        <EvidenceRow icon="edit-3" label="Add note" accent={accent} />
      </Row>

      <Button label="Mark as complete" accentColor={accent} onPress={() => navigation.goBack()} />
    </Screen>
  );
}

function EvidenceRow({ icon, label, accent }: { icon: keyof typeof Feather.glyphMap; label: string; accent: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Row
      gap={spacing.sm}
      style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md }}
    >
      <Feather name={icon} size={16} color={accent} />
      <Text weight="600">{label}</Text>
    </Row>
  );
}
