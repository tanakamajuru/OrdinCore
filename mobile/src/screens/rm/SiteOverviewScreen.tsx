/**
 * screens/rm/SiteOverviewScreen.tsx
 * Per-site metric grid — matches RM Mobile "Site Overview" screen.
 */
import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { listOf, authoritativeTrajectory } from '@/api/mappers';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader, Metrics } from '@/components/board';

const houseName = (x: any) => x.house_name || x.service_name || 'Unassigned';

export default function SiteOverviewScreen() {
  const { colors, spacing, severityColor, mode } = useTheme();
  const { data: riskData } = useApi<any>('/risks?limit=300');
  const { data: escData } = useApi<any>('/escalations?limit=300');
  const { data: sigData } = useApi<any>('/pulses?limit=300');

  const risks = listOf(riskData).filter((r: any) => String(r.status || '').toLowerCase() !== 'closed');
  const escs = listOf(escData).filter((e: any) => !/closed|resolved/i.test(String(e.lifecycle_status || e.status || '')));
  const sigs = listOf(sigData).filter((p: any) => /new/i.test(String(p.status || 'New')));

  const names = Array.from(new Set([...risks, ...escs, ...sigs].map(houseName))).sort();
  const sites = names.map((name) => {
    const rk = risks.filter((r: any) => houseName(r) === name);
    const es = escs.filter((e: any) => houseName(e) === name);
    const deteriorating = rk.filter((r: any) => authoritativeTrajectory(r) === 'Deteriorating').length;
    const highRisks = rk.filter((r: any) => /high|critical/i.test(String(r.severity || ''))).length;
    const escAwaiting = es.filter((e: any) => !e.escalated_to_name).length;
    const overdueEsc = es.filter((e: any) => e.overdue).length;
    const signalsToReview = sigs.filter((p: any) => houseName(p) === name).length;
    const tone: 'high' | 'medium' = deteriorating > 0 || overdueEsc > 0 ? 'high' : 'medium';
    return {
      name,
      tone,
      metrics: [
        { label: 'Open risks', value: rk.length, tone: 'success' as const },
        { label: 'Deteriorating', value: deteriorating, tone: 'high' as const },
        { label: 'High risks', value: highRisks, tone: 'high' as const },
        { label: 'Escalations awaiting response', value: escAwaiting, tone: 'high' as const },
        { label: 'Overdue escalations', value: overdueEsc, tone: 'medium' as const },
        { label: 'Signals awaiting review', value: signalsToReview, tone: 'info' as const },
      ],
    };
  });

  return (
    <Screen scroll>
      <BoardHeader title="Site Overview" onBellPress={() => {}} />

      {sites.length === 0 && <Text muted variant="caption">No site activity to show.</Text>}
      {sites.map((site) => {
        const t = severityColor(mode, site.tone);
        return (
          <View key={site.name} style={{ marginBottom: spacing.xl }}>
            <Row justify="space-between" style={{ marginBottom: spacing.sm }}>
              <Text variant="subtitle" style={{ fontSize: 16 }}>
                {site.name}
              </Text>
              <View style={{ backgroundColor: t.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ color: t.fg, fontSize: 12 }} weight="700">
                  {site.tone === 'high' ? 'High' : 'Medium'}
                </Text>
              </View>
            </Row>
            <Row wrap gap={spacing.md}>
              {site.metrics.map((m) => {
                const mt = severityColor(mode, m.tone);
                return (
                  <View
                    key={m.label}
                    style={{
                      width: '31%',
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      padding: spacing.sm,
                    }}
                  >
                    <Text style={{ color: mt.fg }} variant="title" weight="800">
                      {m.value}
                    </Text>
                    <Text muted variant="caption" style={{ fontSize: 11 }}>
                      {m.label}
                    </Text>
                  </View>
                );
              })}
            </Row>
          </View>
        );
      })}
    </Screen>
  );
}
