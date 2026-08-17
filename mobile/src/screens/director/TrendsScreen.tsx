/**
 * screens/director/TrendsScreen.tsx
 * Cross-service trajectories + organisation risk trajectory chart +
 * incidents & safeguarding tiles — matches screenshot 3/6.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { listOf, authoritativeTrajectory } from '@/api/mappers';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader, SectionTitle, StatusList, Metrics, type StatusRow } from '@/components/board';
import { MultiLineChart } from '@/components/MultiLineChart';

const houseName = (x: any) => x.house_name || x.service_name || 'Unassigned';

export default function TrendsScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();
  const { data: riskData } = useApi<any>('/risks?limit=400');
  const { data: trendData } = useApi<any>('/analytics/trends');

  const openRisks = listOf(riskData).filter((r: any) => String(r.status || '').toLowerCase() !== 'closed');

  // Cross-service trajectories: each house's worst authoritative direction of travel.
  const rank = { Deteriorating: 3, Stable: 2, Improving: 1 } as const;
  const byHouse = new Map<string, 'Deteriorating' | 'Stable' | 'Improving'>();
  openRisks.forEach((r: any) => {
    const h = houseName(r);
    const dir = authoritativeTrajectory(r);
    const cur = byHouse.get(h);
    if (!cur || rank[dir] > rank[cur]) byHouse.set(h, dir);
  });
  const toneOf = (d: string) => (d === 'Deteriorating' ? 'deteriorating' : d === 'Improving' ? 'improving' : 'stable') as StatusRow['tone'];
  const trajectoryRows: StatusRow[] = Array.from(byHouse.entries()).map(([name, dir], i) => ({
    id: String(i), title: name, tone: toneOf(dir), trailingText: dir,
  }));

  const deterioratingCount = Array.from(byHouse.values()).filter((d) => d === 'Deteriorating').length;
  const orgDeteriorating = deterioratingCount > 0;

  const td: any = trendData?.data ?? trendData ?? {};
  const seriesPoints: number[] = Array.isArray(td.org_risk_series) ? td.org_risk_series
    : Array.isArray(td.points) ? td.points
    : Array.isArray(td.series?.[0]?.points) ? td.series[0].points : [];
  const seriesLabels: string[] = Array.isArray(td.labels) ? td.labels : Array.isArray(td.x) ? td.x : [];
  const incidents = Number(td.incidents ?? td.incident_count ?? 0);
  const safeguarding = Number(td.safeguarding_concerns ?? td.safeguarding ?? 0);

  const significant: StatusRow[] = trajectoryRows.filter((r) => r.tone === 'deteriorating').map((r) => ({ ...r, trailingText: 'Deteriorating' }));

  return (
    <Screen scroll>
      <BoardHeader title="Trends" onMenuPress={() => openDrawer()} onBellPress={() => {}} />

      <Card style={{ marginBottom: spacing.lg }}>
        <Row justify="space-between">
          <Text variant="subtitle" style={{ fontSize: 16 }}>
            Cross-service trajectories
          </Text>
          <Feather name="info" size={16} color={colors.textMuted} />
        </Row>
        <View style={{ marginTop: spacing.sm }}>
          {trajectoryRows.length ? <StatusList rows={trajectoryRows} /> : <Text muted variant="caption">No open risks across services.</Text>}
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="subtitle" style={{ fontSize: 16, marginBottom: 4 }}>
          Organisation risk trajectory
        </Text>
        <Row gap={6} style={{ marginBottom: spacing.sm }}>
          <Text muted variant="caption">Current:</Text>
          <Text style={{ color: orgDeteriorating ? colors.danger : colors.success }} variant="caption" weight="700">
            {deterioratingCount} deteriorating
          </Text>
          <Text muted variant="caption">· {byHouse.size} service{byHouse.size === 1 ? '' : 's'}</Text>
        </Row>
        {seriesPoints.length >= 2 ? (
          <MultiLineChart
            xLabels={seriesLabels.length ? seriesLabels : seriesPoints.map((_, i) => `${i + 1}`)}
            yTicks={['Low', 'Medium', 'High']}
            yMin={0}
            yMax={100}
            series={[{ label: 'Organisation risk', color: colors.danger, points: seriesPoints }]}
          />
        ) : (
          <Text muted variant="caption">Trend chart appears once enough history is recorded.</Text>
        )}
      </Card>

      <SectionTitle title="Incidents & safeguarding" action="7 days" />
      <Metrics
        columns={2}
        items={[
          { label: 'Incidents', value: incidents, icon: 'alert-circle', tone: 'high' },
          { label: 'Safeguarding concerns', value: safeguarding, icon: 'shield', tone: 'medium' },
        ]}
      />

      <SectionTitle title="Significant changes" />
      {significant.length ? <StatusList rows={significant} /> : <Text muted variant="caption">No deteriorating services this period.</Text>}
    </Screen>
  );
}
