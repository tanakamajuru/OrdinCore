/**
 * screens/careworker/ActionDetailsScreen.tsx
 * Matches Care Worker screenshot: Action details with evidence + complete.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { roleAccent } from '@/theme/roleAccents';
import { useApi } from '@/api/useApi';
import { listOf } from '@/api/mappers';
import { api } from '@/api/client';
import { Screen, Text, Row, Card, Button } from '@/components/ui';

const originLine = (a: any) => {
  const when = a?.created_at ? new Date(a.created_at).toLocaleString() : '';
  const by = a?.raised_by_name || a?.created_by_name;
  return `${by ? `Signal raised by ${by}` : 'Governance action'}${when ? `\n${when}` : ''}`;
};

export default function ActionDetailsScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const accent = roleAccent.careWorker;
  const id = route.params?.id ? String(route.params.id) : undefined;

  const { data } = useApi<any>('/actions/my');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const a = listOf(data).find((x: any) => String(x.id) === id) || {};
  const completed = done || /complete|done|closed/i.test(String(a.status || ''));
  const domain = a.domain || a.risk_title || a.signal_domain;

  const complete = async () => {
    if (!id || busy) return;
    setBusy(true);
    try {
      await api.post(`/actions/${id}/complete`, { note: 'Completed on mobile' });
      setDone(true);
      navigation.goBack();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Row gap={spacing.md} style={{ paddingTop: spacing.sm, marginBottom: spacing.lg }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">Action details</Text>
      </Row>

      <Text variant="title" style={{ fontSize: 19 }}>
        {a.title || a.description || 'Action'}
      </Text>
      <Text muted style={{ marginBottom: spacing.sm }}>
        {a.house_name || a.service_user_name || a.service_name || '—'}
      </Text>
      {domain ? (
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
            {domain} signal
          </Text>
        </View>
      ) : null}

      <Text weight="700" style={{ marginBottom: 4 }}>
        What you need to do
      </Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        {a.description || a.title || 'No description provided.'}
      </Text>

      <Text weight="700" style={{ marginBottom: 4 }}>
        Origin
      </Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        {originLine(a)}
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

      {completed ? (
        <Row gap={spacing.sm} justify="center" style={{ paddingVertical: spacing.md }}>
          <Feather name="check-circle" size={16} color="#1B8A3E" />
          <Text style={{ color: '#1B8A3E' }} weight="700">Completed</Text>
        </Row>
      ) : (
        <Button label={busy ? 'Completing…' : 'Mark as complete'} accentColor={accent} onPress={complete} />
      )}
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
