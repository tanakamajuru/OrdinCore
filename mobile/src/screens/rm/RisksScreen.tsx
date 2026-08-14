/**
 * screens/rm/RisksScreen.tsx
 * Active risk picture with severity, trajectory and linked signals —
 * matches RM Mobile screenshot 3/8.
 */
import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { listOf } from '@/api/mappers';
import { Screen, Text, Row, Card, FilterPill, Chip } from '@/components/ui';
import { BoardHeader } from '@/components/board';

type Risk = {
  id: string;
  title: string;
  site: string;
  tone: 'high' | 'medium' | 'low';
  trend: 'Deteriorating' | 'Stable' | 'Improving';
  linkedSignals: number;
  lastSignal: string;
  decisionRequired?: boolean;
};

const trendIcon: Record<Risk['trend'], keyof typeof Feather.glyphMap> = {
  Deteriorating: 'trending-up',
  Stable: 'arrow-right',
  Improving: 'trending-down',
};
const toneOfSev = (sev?: string): Risk['tone'] => (/high|critical/i.test(sev || '') ? 'high' : /med|mod/i.test(sev || '') ? 'medium' : 'low');
const trendOf = (r: any): Risk['trend'] => { const s = String(r.trajectory || r.trend || '').toLowerCase(); return /deteriorat|escalat|worsen/.test(s) ? 'Deteriorating' : /improv/.test(s) ? 'Improving' : 'Stable'; };
const lastSignalLine = (x?: string) => { if (!x) return 'No recent activity'; const days = Math.floor((Date.now() - new Date(x).getTime()) / 86400000); return days <= 0 ? 'Last signal today' : days === 1 ? 'Last signal 1d ago' : `Last signal ${days}d ago`; };
const isOpenRisk = (r: any) => String(r.status || '').toLowerCase() !== 'closed';

export default function RisksScreen() {
  const { colors, spacing, severityColor, mode } = useTheme();
  const { data } = useApi<any>('/risks?limit=300');

  const risks: Risk[] = listOf(data).filter(isOpenRisk).map((r: any) => ({
    id: String(r.id),
    title: r.title || r.risk_title || r.theme || 'Risk',
    site: r.house_name || r.service_name || '',
    tone: toneOfSev(r.severity || r.risk_rating),
    trend: trendOf(r),
    linkedSignals: Number(r.linked_signal_count ?? r.evidence_count ?? r.signal_count ?? 0),
    lastSignal: lastSignalLine(r.last_signal_at || r.updated_at || r.created_at),
    decisionRequired: !!(r.closure_eligible || r.decision_required),
  }));

  return (
    <Screen scroll>
      <BoardHeader title="Risks" onBellPress={() => {}} />

      <Row gap={spacing.sm} style={{ marginBottom: spacing.lg }}>
        <FilterPill label="All Sites" />
        <FilterPill label="Open" />
        <FilterPill label="High, Med, Low" />
      </Row>

      {risks.length === 0 && <Text muted variant="caption">No open risks.</Text>}
      {risks.map((r) => {
        const t = severityColor(mode, r.tone);
        return (
          <Card
            key={r.id}
            style={{
              marginBottom: spacing.md,
              borderColor: r.decisionRequired ? colors.danger : colors.border,
            }}
          >
            <Row justify="space-between" align="flex-start">
              <View style={{ flex: 1 }}>
                <Text weight="700">{r.title}</Text>
                <Text muted variant="caption" style={{ marginTop: 2 }}>
                  {r.site}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </Row>

            <Row gap={spacing.sm} style={{ marginTop: spacing.sm }}>
              <Chip label={r.tone === 'high' ? 'HIGH' : r.tone === 'medium' ? 'MEDIUM' : 'LOW'} tone={r.tone} size="sm" />
              <Row gap={4}>
                <Feather name={trendIcon[r.trend]} size={12} color={t.fg} />
                <Text style={{ color: t.fg }} variant="caption" weight="700">
                  {r.trend}
                </Text>
              </Row>
            </Row>

            <Text muted variant="caption" style={{ marginTop: spacing.sm }}>
              {r.linkedSignals} linked signal{r.linkedSignals > 1 ? 's' : ''} · {r.lastSignal}
            </Text>

            {r.decisionRequired ? (
              <Row gap={4} style={{ marginTop: spacing.sm }}>
                <Feather name="alert-circle" size={13} color={colors.danger} />
                <Text style={{ color: colors.danger }} variant="caption" weight="700">
                  Decision required
                </Text>
              </Row>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
