/**
 * screens/rm/EscalationsScreen.tsx
 * Escalations decide & act list — matches RM Mobile screenshot 4/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { listOf } from '@/api/mappers';
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

const hrsBetween = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 3600000));
const nowIso = () => new Date().toISOString();
const raisedOf = (created?: string) => { if (!created) return ''; const days = Math.floor((Date.now() - new Date(created).getTime()) / 86400000); return days <= 0 ? `Raised today · ${hrsBetween(created, nowIso())}h ago` : days === 1 ? 'Raised yesterday' : `Raised ${days}d ago`; };
const elapsedOf = (created?: string) => { if (!created) return '—'; const h = hrsBetween(created, nowIso()); return h < 48 ? `${h}h` : `${Math.floor(h / 24)}d`; };
const isEscOpen = (e: any) => !/closed|resolved/i.test(String(e.lifecycle_status || e.status || ''));

export default function EscalationsScreen() {
  const { colors, spacing, severityColor, mode } = useTheme();
  const navigation = useNavigation<any>();
  const { data } = useApi<any>('/escalations?limit=300');

  const escalations: Escalation[] = listOf(data).filter(isEscOpen).map((e: any) => ({
    id: String(e.id),
    title: e.risk_title || e.reason || 'Escalation',
    site: [e.house_name, e.related_person].filter(Boolean).join(' · '),
    tone: /high|critical|urgent/i.test(String(e.priority || e.severity || '')) ? 'high' : 'medium',
    raised: raisedOf(e.created_at || e.escalated_at),
    sla: e.due_by && (e.created_at || e.escalated_at) ? `${hrsBetween(e.created_at || e.escalated_at, e.due_by)}h` : '—',
    elapsed: elapsedOf(e.created_at || e.escalated_at),
    status: e.overdue ? 'Overdue' : e.escalated_to_name ? `Assigned to ${e.escalated_to_name}` : 'Awaiting your response',
  }));

  return (
    <Screen scroll>
      <BoardHeader title="Escalations" onBellPress={() => {}} />

      <Row gap={spacing.sm} style={{ marginBottom: spacing.lg }}>
        <FilterPill label="All Sites" />
        <FilterPill label="Open" />
      </Row>

      {escalations.length === 0 && <Text muted variant="caption">No open escalations.</Text>}
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
