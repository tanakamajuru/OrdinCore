/**
 * screens/ri/OversightScreen.tsx
 * Strategic oversight across the provider — matches RI screenshot 2/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { listOf, authoritativeTrajectory } from '@/api/mappers';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader, Metrics, PercentDonut } from '@/components/board';

const dirColor = (d: string) => (d === 'Deteriorating' ? '#D64545' : d === 'Improving' ? '#1B8A3E' : '#667085');

export default function OversightScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();
  const { data: riskData } = useApi<any>('/risks?limit=400');
  const { data: themeData } = useApi<any>('/interventions/themes');
  const { data: escData } = useApi<any>('/escalations?limit=400');
  const { data: assur } = useApi<any>('/ri/assurance-summary');

  const openRisks = listOf(riskData).filter((r: any) => String(r.status || '').toLowerCase() !== 'closed');
  const sev = (r: any) => String(r.severity || r.risk_rating || '').toLowerCase();
  const critical = openRisks.filter((r: any) => /critical/.test(sev(r))).length;
  const high = openRisks.filter((r: any) => /high/.test(sev(r)) && !/critical/.test(sev(r))).length;
  const moderate = openRisks.filter((r: any) => /med|mod/.test(sev(r))).length;
  const low = openRisks.filter((r: any) => /low/.test(sev(r))).length;

  const rawThemes: any[] = themeData?.themes ?? themeData?.data ?? (Array.isArray(themeData) ? themeData : []);
  const themes = rawThemes.map((t: any) => {
    const dir = t?.trajectory?.direction || (Array.isArray(t?.risk_trajectories) && t.risk_trajectories.some((r: any) => authoritativeTrajectory(r) === 'Deteriorating') ? 'Deteriorating' : 'Stable');
    return { label: t.name || t.theme || t.label || 'Theme', trend: dir, color: dirColor(dir) };
  });

  const overdueEsc = listOf(escData).filter((e: any) => e.overdue && !/closed|resolved/i.test(String(e.lifecycle_status || e.status || ''))).length;

  const d: any = assur?.data ?? assur ?? {};
  const effPct = Math.round(Number(d.resolution_effectiveness_rate ?? 0));
  const resolvedTotal = Number(d.resolved_total ?? 0);

  return (
    <Screen scroll>
      <BoardHeader
        title="Oversight"
        subtitle="Strategic oversight across the provider"
        onMenuPress={() => openDrawer()}
      />

      <Text variant="subtitle" style={{ fontSize: 16, marginBottom: spacing.sm }}>
        Strategic Risks
      </Text>
      <Text muted variant="caption" style={{ marginBottom: spacing.sm }}>
        Across provider
      </Text>
      <Metrics
        columns={4}
        items={[
          { label: 'Critical', value: critical, tone: 'critical' },
          { label: 'High', value: high, tone: 'high' },
          { label: 'Moderate', value: moderate, tone: 'medium' },
          { label: 'Low', value: low, tone: 'low' },
        ]}
      />

      <Text variant="subtitle" style={{ fontSize: 16, marginTop: spacing.md, marginBottom: spacing.sm }}>
        Theme direction of travel
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        {themes.length === 0 && <Text muted variant="caption">No cross-service themes yet.</Text>}
        {themes.map((t, i) => (
          <Row
            key={t.label + i}
            justify="space-between"
            style={{ paddingVertical: 8, borderBottomWidth: i < themes.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
          >
            <Text variant="caption">{t.label}</Text>
            <Text style={{ color: t.color }} variant="caption" weight="700">
              {t.trend}
            </Text>
          </Row>
        ))}
      </Card>

      <Text variant="subtitle" style={{ fontSize: 16, marginBottom: spacing.sm }}>
        Escalations Outside Threshold
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text muted variant="caption">Across provider</Text>
        <Text variant="title" style={{ marginVertical: spacing.sm }}>
          {overdueEsc}
        </Text>
        <Text muted variant="caption">Requires RI response</Text>
      </Card>

      <Text variant="subtitle" style={{ fontSize: 16, marginBottom: spacing.sm }}>
        Action Effectiveness
      </Text>
      <Card>
        <Text muted variant="caption" style={{ marginBottom: spacing.md }}>
          Resolution effectiveness across resolved concerns
        </Text>
        <Row gap={spacing.xl} align="center">
          <PercentDonut percent={effPct} size={90} strokeWidth={12} />
          <View style={{ gap: 6 } as any}>
            <Text variant="caption">
              <Text weight="700" variant="caption">{effPct}% </Text>effective
            </Text>
            <Text variant="caption">
              <Text weight="700" variant="caption">{resolvedTotal} </Text>concerns resolved
            </Text>
          </View>
        </Row>
      </Card>
    </Screen>
  );
}
