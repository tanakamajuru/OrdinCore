/**
 * screens/director/HomeScreen.tsx
 * "Governance position: Attention required" overview — matches screenshot 2/6.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { goToMyWork } from '@/navigation/goToMyWork';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { myWorkRows, listOf } from '@/api/mappers';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader, Metrics, SectionTitle, StatusList } from '@/components/board';

export default function HomeScreen() {
  const { spacing, severityColor, mode } = useTheme();
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();
  const { data: mw } = useApi<any>('/my-work');
  const { data: gh } = useApi<any>('/interventions/governance-health');
  const { data: riskData } = useApi<any>('/risks?limit=300');

  const items: any[] = mw?.items ?? mw?.data?.items ?? [];
  const byKey = (k: string) => items.find((i: any) => i.key === k);
  const n = (v: any) => Number(v || 0);
  const health = gh?.data?.health ?? gh?.health ?? null;
  const position = health == null ? 'Assessing' : health >= 75 ? 'Stable' : health >= 50 ? 'Attention required' : 'Concern';
  const posTone: any = health == null ? 'info' : health >= 75 ? 'success' : health >= 50 ? 'medium' : 'high';
  const posColor = severityColor(mode, posTone).fg;
  const risks = listOf(riskData).filter((r: any) => String(r.status || '').toLowerCase() !== 'closed');
  const highCritical = risks.filter((r: any) => /high|critical/i.test(String(r.severity || ''))).length;

  return (
    <Screen scroll>
      <BoardHeader
        title="Home"
        onMenuPress={() => openDrawer()}
        onBellPress={() => {}}
      />

      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="body" weight="600">Governance position</Text>
        <Row gap={8} style={{ marginTop: 6, marginBottom: 6 }}>
          <Text style={{ color: posColor }} variant="subtitle">{position}</Text>
        </Row>
        <Text muted variant="caption">Key areas needing your attention today. See details in My Work.</Text>
      </Card>

      <Metrics
        columns={2}
        items={[
          { label: 'Signals to review', value: n(byKey('signals')?.count), sublabel: 'Awaiting governance', icon: 'activity', tone: 'success' },
          { label: 'Open escalations', value: n(byKey('escalations')?.count), sublabel: 'Require oversight', icon: 'alert-triangle', tone: 'high' },
          { label: 'High / Critical risks', value: highCritical, sublabel: 'Require assurance', icon: 'shield', tone: 'medium' },
          { label: 'Overdue actions', value: n(byKey('actions')?.emphasis), sublabel: 'Items overdue', icon: 'calendar', tone: 'info' },
        ]}
      />

      <SectionTitle title="Requires your attention" />
      <StatusList rows={myWorkRows(mw)} onPressRow={(row) => goToMyWork(navigation, 'DIRECTOR', row.id)} />
    </Screen>
  );
}
