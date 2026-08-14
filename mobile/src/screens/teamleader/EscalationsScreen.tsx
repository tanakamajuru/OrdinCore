/**
 * screens/teamleader/EscalationsScreen.tsx
 * Requires me / Under RM oversight / Closed — matches screenshot 7/8.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card, SegmentedControl } from '@/components/ui';
import { BoardHeader } from '@/components/board';

type Escalation = {
  id: string;
  title: string;
  site: string;
  escalated: string;
  requirement: string[];
  responseDue: string;
  tone: 'high' | 'medium';
};

const escalations: Escalation[] = [
  {
    id: '1',
    title: 'Medication deterioration',
    site: 'Bashit A',
    escalated: 'Escalated 09 Aug',
    requirement: ['Continue observations', 'Update CMHT if decline continues'],
    responseDue: 'RM response due today',
    tone: 'high',
  },
  {
    id: '2',
    title: 'Self-harm risk',
    site: 'John',
    escalated: 'Escalated 08 Aug',
    requirement: ['Safety monitoring', 'Daily check-ins'],
    responseDue: 'RM response due 11 Aug',
    tone: 'medium',
  },
  {
    id: '3',
    title: 'Environmental risk',
    site: 'House',
    escalated: 'Escalated 07 Aug',
    requirement: ['Complete environmental audit'],
    responseDue: 'RM response due 12 Aug',
    tone: 'medium',
  },
];

export default function EscalationsScreen() {
  const { colors, spacing, severityColor, mode } = useTheme();
  const [tab, setTab] = useState('Requires me');

  return (
    <Screen scroll>
      <BoardHeader title="Escalations" onBellPress={() => {}} />
      <SegmentedControl options={['Requires me', 'Under RM oversight', 'Closed']} value={tab} onChange={setTab} />

      <View style={{ marginTop: spacing.lg }}>
        {escalations.map((e) => {
          const t = severityColor(mode, e.tone);
          return (
            <Card key={e.id} style={{ marginBottom: spacing.md, borderColor: t.fg }}>
              <Text weight="700">{e.title}</Text>
              <Text muted variant="caption" style={{ marginTop: 2 }}>
                {e.site}
              </Text>
              <Text muted variant="caption" style={{ marginTop: 2 }}>
                {e.escalated}
              </Text>

              <Text variant="caption" weight="700" style={{ marginTop: spacing.sm }}>
                Your requirement:
              </Text>
              {e.requirement.map((r) => (
                <Text key={r} variant="caption" muted>
                  • {r}
                </Text>
              ))}

              <Row gap={4} style={{ marginTop: spacing.sm }}>
                <Feather name="clock" size={12} color={t.fg} />
                <Text style={{ color: t.fg }} variant="caption" weight="700">
                  {e.responseDue}
                </Text>
              </Row>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
