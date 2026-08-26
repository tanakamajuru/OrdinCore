/**
 * screens/teamleader/EscalationsScreen.tsx
 * Requires me / Under RM oversight / Closed — matches screenshot 7/8.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { listOf } from '@/api/mappers';
import { Screen, Text, Row, Card, SegmentedControl } from '@/components/ui';
import { BoardHeader } from '@/components/board';
import { useAppDrawer } from '@/navigation/AppDrawerContext';

type Escalation = {
  id: string;
  title: string;
  site: string;
  escalated: string;
  requirement: string[];
  responseDue: string;
  tone: 'high' | 'medium';
  bucket: 'Requires me' | 'Under RM oversight' | 'Closed';
};

const dateLine = (prefix: string, x?: string) => (x ? `${prefix} ${new Date(x).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : prefix);

const bucketOf = (e: any): Escalation['bucket'] => {
  const s = String(e.lifecycle_status || e.status || '').toLowerCase();
  if (/closed|resolved/.test(s)) return 'Closed';
  if (/review|monitor|action/.test(s)) return 'Under RM oversight';
  return 'Requires me';
};

export default function EscalationsScreen() {
  const { colors, spacing, severityColor, mode } = useTheme();
  const { openDrawer } = useAppDrawer();
  const [tab, setTab] = useState('Requires me');
  const { data } = useApi<any>('/escalations?limit=300');

  const escalations: Escalation[] = listOf(data).map((e: any) => {
    const req: string[] = Array.isArray(e.required_actions) ? e.required_actions
      : Array.isArray(e.actions) ? e.actions.map((a: any) => a.title || a.description).filter(Boolean)
      : e.reason ? [e.reason] : [];
    return {
      id: String(e.id),
      title: e.risk_title || e.reason || 'Escalation',
      site: [e.house_name, e.related_person].filter(Boolean).join(' · ') || '—',
      escalated: dateLine('Escalated', e.created_at || e.escalated_at),
      requirement: req.slice(0, 3),
      responseDue: e.overdue ? 'RM response overdue' : dateLine('RM response due', e.due_by),
      tone: /high|critical|urgent/i.test(String(e.priority || e.severity || '')) ? 'high' : 'medium',
      bucket: bucketOf(e),
    };
  });

  const visible = escalations.filter((e) => e.bucket === tab);

  return (
    <Screen scroll>
      <BoardHeader title="Escalations" onMenuPress={() => openDrawer()} onBellPress={() => {}} />
      <SegmentedControl options={['Requires me', 'Under RM oversight', 'Closed']} value={tab} onChange={setTab} />

      <View style={{ marginTop: spacing.lg }}>
        {visible.length === 0 && <Text muted variant="caption">Nothing in this view.</Text>}
        {visible.map((e) => {
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
