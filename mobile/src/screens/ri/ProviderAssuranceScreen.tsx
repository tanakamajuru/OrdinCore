/**
 * screens/ri/ProviderAssuranceScreen.tsx
 * "Provider Assurance" overview — matches RI screenshot 1/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { goToMyWork } from '@/navigation/goToMyWork';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { myWorkRows, listOf } from '@/api/mappers';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader, Metrics, StatusList } from '@/components/board';

export default function ProviderAssuranceScreen() {
  const { colors, spacing, severityColor, mode } = useTheme();
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();
  const { data: assur } = useApi<any>('/ri/assurance-summary');
  const { data: mw } = useApi<any>('/my-work');
  const { data: riskData } = useApi<any>('/risks?limit=300');
  const { data: themeData } = useApi<any>('/interventions/themes');

  const d: any = assur?.data ?? assur ?? {};
  const rags = [d.risks_identified_early, d.escalations_timely, d.actions_effective, d.closures_evidenced].filter(Boolean);
  const concerns = rags.filter((x: string) => x === 'Concern').length;
  const warnings = rags.filter((x: string) => x === 'Warning').length;
  const state = concerns > 0 ? 'CONCERN' : warnings >= 2 ? 'WATCH' : warnings === 1 ? 'ADEQUATE' : 'STRONG';
  const stateTone: any = concerns > 0 ? 'high' : warnings >= 1 ? 'medium' : 'success';
  const sc = severityColor(mode, stateTone);

  const items: any[] = mw?.items ?? mw?.data?.items ?? [];
  const byKey = (k: string) => items.find((i: any) => i.key === k);
  const n = (v: any) => Number(v || 0);
  const attentionRows = myWorkRows(mw);
  const criticalRisks = listOf(riskData).filter((r: any) => String(r.status || '').toLowerCase() !== 'closed' && /critical/i.test(String(r.severity || ''))).length;
  const themes: any[] = themeData?.themes ?? themeData?.data ?? (Array.isArray(themeData) ? themeData : []);
  const deterioratingThemes = themes.filter((t: any) => t.trajectory?.direction === 'Deteriorating').length;

  return (
    <Screen scroll>
      <BoardHeader
        title="Ordin Core"
        subtitle="Responsible Individual"
        onMenuPress={() => openDrawer()}
        onBellPress={() => {}}
      />

      <Text variant="subtitle" style={{ fontSize: 16 }}>
        Provider Assurance
      </Text>
      <Text muted variant="caption" style={{ marginBottom: spacing.md }}>
        Overall assurance position
      </Text>

      <Card style={{ backgroundColor: sc.bg, borderWidth: 0, marginBottom: spacing.lg }}>
        <Text style={{ color: sc.fg }} weight="800">
          {state}
        </Text>
        <Text muted variant="caption" style={{ marginTop: 2 }}>
          {attentionRows.length} matter{attentionRows.length === 1 ? '' : 's'} require RI attention
        </Text>
        <Row justify="flex-end">
          <Text style={{ color: sc.fg }} variant="caption" weight="700">
            Review details →
          </Text>
        </Row>
      </Card>

      <Metrics
        columns={2}
        items={[
          { label: 'Critical Risks', value: criticalRisks, sublabel: 'Requires oversight', icon: 'alert-triangle', tone: 'high' },
          { label: 'Deteriorating Themes', value: deterioratingThemes, sublabel: 'Needs attention', icon: 'trending-up', tone: 'medium' },
          { label: 'Escalations Outside Threshold', value: n(d.overdue_reviews), sublabel: 'Requires action', icon: 'alert-circle', tone: 'medium' },
          { label: 'Overdue Strategic Actions', value: n(byKey('actions')?.emphasis), sublabel: 'Require assurance', icon: 'clipboard', tone: 'medium' },
        ]}
      />

      <Text variant="subtitle" style={{ fontSize: 16, marginTop: spacing.md, marginBottom: spacing.sm }}>
        Requires your attention
      </Text>
      <StatusList rows={attentionRows} onPressRow={(row) => goToMyWork(navigation, 'RESPONSIBLE_INDIVIDUAL', row.id)} />
    </Screen>
  );
}
