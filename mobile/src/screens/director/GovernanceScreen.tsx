/**
 * screens/director/GovernanceScreen.tsx
 * Governance overview list + escalations-by-severity donut — matches
 * screenshot 5/6.
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
import { BoardHeader, StatusList, PercentDonut, type StatusRow } from '@/components/board';

const sevBucket = (e: any): 'high' | 'medium' | 'low' =>
  /high|critical|urgent/i.test(String(e.priority || e.severity || '')) ? 'high' : /med|mod/i.test(String(e.priority || e.severity || '')) ? 'medium' : 'low';

export default function GovernanceScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();
  const { data: mw } = useApi<any>('/my-work');
  const { data: escData } = useApi<any>('/escalations?limit=400');

  const overviewRows: StatusRow[] = myWorkRows(mw);

  const openEsc = listOf(escData).filter((e: any) => !/closed|resolved/i.test(String(e.lifecycle_status || e.status || '')));
  const high = openEsc.filter((e) => sevBucket(e) === 'high').length;
  const medium = openEsc.filter((e) => sevBucket(e) === 'medium').length;
  const low = openEsc.filter((e) => sevBucket(e) === 'low').length;
  const total = high + medium + low;
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);

  return (
    <Screen scroll>
      <BoardHeader
        title="Governance"
        subtitle="Updated just now"
        onMenuPress={() => openDrawer()}
        onBellPress={() => {}}
      />

      <Text variant="subtitle" style={{ fontSize: 16, marginBottom: spacing.sm }}>
        Governance overview
      </Text>
      {overviewRows.length ? <StatusList rows={overviewRows} onPressRow={(row) => goToMyWork(navigation, 'DIRECTOR', row.id)} /> : <Text muted variant="caption">Nothing awaiting governance review.</Text>}

      <Text variant="subtitle" style={{ fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.md }}>
        Escalations by severity
      </Text>
      <Card>
        <Row gap={spacing.xl} align="center">
          <PercentDonut
            size={110}
            strokeWidth={16}
            label={`${total}\nOpen`}
            segments={[
              { value: high || 0.0001, color: colors.danger },
              { value: medium || 0.0001, color: colors.warning },
              { value: low || 0.0001, color: colors.success },
            ]}
          />
          <View style={{ gap: spacing.sm, flex: 1 }}>
            <LegendRow color={colors.danger} label="High" value={`${high} (${pct(high)}%)`} />
            <LegendRow color={colors.warning} label="Medium" value={`${medium} (${pct(medium)}%)`} />
            <LegendRow color={colors.success} label="Low" value={`${low} (${pct(low)}%)`} />
          </View>
        </Row>
      </Card>
    </Screen>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <Row justify="space-between">
      <Row gap={8}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Text variant="caption">{label}</Text>
      </Row>
      <Text variant="caption" weight="700">
        {value}
      </Text>
    </Row>
  );
}
