/**
 * screens/RoleSelectScreen.tsx
 * Dev/demo entry point for this reference build — lets you jump into any
 * of the 5 role experiences. In production this would be replaced by an
 * auth flow that resolves the signed-in user's role automatically.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card } from '@/components/ui';
import { Logo } from '@/components/Logo';

const roles: { key: string; label: string; subtitle: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'Director', label: 'Director', subtitle: 'Organisation-wide governance oversight', icon: 'briefcase' },
  { key: 'RM', label: 'Registered Manager', subtitle: 'Site-level risk, escalations & governance', icon: 'shield' },
  { key: 'CareWorker', label: 'Care Worker', subtitle: 'Raise signals, complete actions', icon: 'heart' },
  { key: 'TeamLeader', label: 'Team Leader', subtitle: 'Morning meeting, signals & escalations', icon: 'users' },
  { key: 'RI', label: 'Responsible Individual', subtitle: 'Provider assurance & board reporting', icon: 'award' },
];

export default function RoleSelectScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xxl }}>
        <Logo size={44} />
        <Text muted variant="caption" style={{ marginTop: spacing.sm }}>
          Select a role to preview
        </Text>
      </View>

      {roles.map((r) => (
        <Card
          key={r.key}
          onPress={() => navigation.navigate(r.key)}
          style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: radius.md,
              backgroundColor: colors.primary + '1F',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name={r.icon} size={19} color={colors.primary} />
          </View>
          <View style={{ flex: 1 } as any}>
            <Text weight="700">{r.label}</Text>
            <Text muted variant="caption">
              {r.subtitle}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        </Card>
      ))}
    </Screen>
  );
}
