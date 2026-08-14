/**
 * screens/rm/EscalationsScreen.tsx
 * Escalations decide & act list — matches RM Mobile screenshot 4/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card, FilterPill, Chip } from '@/components/ui';
import { BoardHeader } from '@/components/board';

type Escalation = {
  id: string;
  title: string;
  site: string;
  tone: 'high' | 'medium';
  raised: string;
  sla: string;
  elapsed: string;
  status: string;
};

const escalations: Escalation[] = [
  { id: '1', title: 'Mental Health Deterioration', site: 'Grafton Road · Bashit A', tone: 'high', raised: 'Raised today · 2h ago', sla: '24h', elapsed: '2h', status: 'Awaiting your response' },
  { id: '2', title: 'Self-Care Decline', site: '24 Hurst Grove · Bashit A', tone: 'medium', raised: 'Raised yesterday', sla: '48h', elapsed: '20h', status: 'Assigned to you' },
  { id: '3', title: 'Medication Missed', site: 'Grafton Road · Bashit A', tone: 'medium', raised: 'Raised 2d ago', sla: '48h', elapsed: '44h', status: 'Awaiting your response' },
];

export default function EscalationsScreen() {
  const { colors, spacing, severityColor, mode } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <Screen scroll>
      <BoardHeader title="Escalations" onBellPress={() => {}} />

      <Row gap={spacing.sm} style={{ marginBottom: spacing.lg }}>
        <FilterPill label="All Sites" />
        <FilterPill label="Open" />
      </Row>

      {escalations.map((e) => {
        const t = severityColor(mode, e.tone);
        return (
          <Card
            key={e.id}
            onPress={() => navigation.navigate('EscalationDetail', { id: e.id })}
            style={{ marginBottom: spacing.md, borderColor: e.tone === 'high' ? colors.danger : colors.border }}
          >
            <Text weight="700">{e.title}</Text>
            <Text muted variant="caption" style={{ marginTop: 2 }}>
              {e.site}
            </Text>
            <Row justify="space-between" style={{ marginTop: spacing.sm }}>
              <Row gap={spacing.sm}>
                <Chip label={e.tone.toUpperCase()} tone={e.tone} size="sm" />
                <Text muted variant="caption">
                  {e.raised}
                </Text>
              </Row>
            </Row>
            <Text muted variant="caption" style={{ marginTop: 4 }}>
              SLA: {e.sla} · Elapsed: {e.elapsed}
            </Text>
            <Row gap={4} style={{ marginTop: spacing.sm }}>
              <Feather name="clock" size={12} color={t.fg} />
              <Text style={{ color: t.fg }} variant="caption" weight="700">
                {e.status}
              </Text>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
