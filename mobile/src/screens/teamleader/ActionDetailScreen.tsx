/**
 * screens/teamleader/ActionDetailScreen.tsx
 * Matches Team Leader screenshot 6/8.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { listOf } from '@/api/mappers';
import { api } from '@/api/client';
import { Screen, Text, Row, Card, TextArea, Button } from '@/components/ui';

const dueBadge = (a: any): { label: string; overdue: boolean } => {
  const x = a?.due_at || a?.due_by;
  if (a?.overdue) return { label: 'Overdue', overdue: true };
  if (!x) return { label: 'No due date', overdue: false };
  const days = Math.floor((new Date(x).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: 'Overdue', overdue: true };
  return { label: days <= 0 ? 'Due today' : `Due ${new Date(x).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`, overdue: days <= 0 };
};

export default function ActionDetailScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const id = route.params?.id ? String(route.params.id) : undefined;
  const { data } = useApi<any>('/actions/my');
  const a = listOf(data).find((x: any) => String(x.id) === id) || {};

  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const badge = dueBadge(a);
  const completed = done || /complete|done|closed/i.test(String(a.status || ''));

  const complete = async () => {
    if (!id || busy) return;
    setBusy(true);
    try {
      await api.post(`/actions/${id}/complete`, { note: note.trim() || 'Completed on mobile' });
      setDone(true);
      navigation.goBack();
    } catch { setBusy(false); }
  };

  return (
    <Screen scroll>
      <Row gap={spacing.md} style={{ paddingTop: spacing.sm, marginBottom: spacing.lg }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">Action Detail</Text>
      </Row>

      <Row justify="space-between" align="flex-start" style={{ marginBottom: spacing.lg }}>
        <Text variant="title" style={{ fontSize: 18, flex: 1 }}>
          {a.title || a.description || 'Action'}
        </Text>
        <View style={{ backgroundColor: (badge.overdue ? colors.danger : colors.textMuted) + '1F', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ color: badge.overdue ? colors.danger : colors.textMuted, fontSize: 11 }} weight="700">
            {badge.label}
          </Text>
        </View>
      </Row>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Concern / Signal
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text weight="600">{a.risk_title || a.domain || 'Linked concern'}</Text>
        {a.risk_narrative || a.concern_note ? (
          <Text muted variant="caption" style={{ marginTop: 4 }}>
            {a.risk_narrative || a.concern_note}
          </Text>
        ) : null}
      </Card>

      <Text weight="700" style={{ marginBottom: 4 }}>
        Required action
      </Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        {a.description || a.title || 'No description provided.'}
      </Text>

      <Row justify="space-between" style={{ marginBottom: spacing.lg }}>
        <View>
          <Text muted variant="caption">
            Deadline
          </Text>
          <Text weight="700">{(a.due_at || a.due_by) ? new Date(a.due_at || a.due_by).toLocaleString() : '—'}</Text>
        </View>
        <View>
          <Text muted variant="caption">
            Assigned by
          </Text>
          <Text weight="700">{a.assigned_by_name || a.created_by_name || 'Registered Manager'}</Text>
        </View>
      </Row>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Your notes / evidence
      </Text>
      <TextArea value={note} onChangeText={setNote} placeholder="Add a completion note…" maxLength={500} />

      {completed ? (
        <Row gap={spacing.sm} justify="center" style={{ marginTop: spacing.xl }}>
          <Feather name="check-circle" size={16} color="#1B8A3E" />
          <Text style={{ color: '#1B8A3E' }} weight="700">Completed</Text>
        </Row>
      ) : (
        <Row gap={spacing.md} style={{ marginTop: spacing.xl }}>
          <View style={{ flex: 1 } as any}>
            <Button label={busy ? 'Completing…' : 'Complete action'} onPress={complete} />
          </View>
        </Row>
      )}
    </Screen>
  );
}
