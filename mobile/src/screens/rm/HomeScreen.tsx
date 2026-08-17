/**
 * screens/rm/HomeScreen.tsx
 * "Good morning" — needs attention (/my-work), trajectory changes and sites
 * requiring attention (live risks + escalations). Matches RM Mobile screenshot 1/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/auth/AuthContext';
import { useApi } from '@/api/useApi';
import { authoritativeTrajectory } from '@/api/mappers';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader, StatusList, SectionTitle, type StatusRow } from '@/components/board';

type SevTone = 'high' | 'medium' | 'low' | 'info' | 'neutral' | 'success';
const toneOf = (t?: string): SevTone => (t === 'red' ? 'high' : t === 'amber' ? 'medium' : t === 'blue' ? 'info' : t === 'emerald' ? 'success' : 'neutral');
const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.risks || v?.escalations || []);
const isOpenRisk = (r: any) => String(r.status || '').toLowerCase() !== 'closed';
const trajOf = (r: any) => authoritativeTrajectory(r).toLowerCase();
const isEscOpen = (e: any) => String(e.lifecycle_status || e.status || '').toLowerCase() !== 'closed' && String(e.lifecycle_status || e.status || '').toLowerCase() !== 'resolved';

export default function HomeScreen() {
  const { spacing, severityColor, mode } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { data: mw } = useApi<any>('/my-work');
  const { data: riskData } = useApi<any>('/risks?limit=300');
  const { data: escData } = useApi<any>('/escalations?limit=300');

  const items = mw?.items ?? mw?.data?.items ?? [];
  const attentionRows: StatusRow[] = items.map((it: any) => ({ id: it.key, title: it.label, badge: it.count, tone: toneOf(it.tone) }));

  const risks = arr(riskData).filter(isOpenRisk);
  const deteriorating = risks.filter((r) => trajOf(r) === 'deteriorating').length;
  const improving = risks.filter((r) => trajOf(r) === 'improving').length;
  const stable = Math.max(0, risks.length - deteriorating - improving);
  const trajectoryTiles = [
    { label: 'Deteriorating', value: deteriorating, tone: 'high' as const },
    { label: 'Stable', value: stable, tone: 'neutral' as const },
    { label: 'Improving', value: improving, tone: 'success' as const },
  ];

  const escs = arr(escData).filter(isEscOpen);
  const byHouse: Record<string, { name: string; risks: number; esc: number; high: boolean }> = {};
  const bump = (k: string) => { if (!byHouse[k]) byHouse[k] = { name: k, risks: 0, esc: 0, high: false }; return byHouse[k]; };
  for (const r of risks) { const k = r.house_name || r.service_name || '—'; const b = bump(k); b.risks++; if (/high|critical/i.test(String(r.severity || ''))) b.high = true; }
  for (const e of escs) { bump(e.house_name || '—').esc++; }
  const sites = Object.values(byHouse)
    .filter((s) => s.name !== '—' && (s.risks || s.esc))
    .sort((a, b) => (b.risks + b.esc) - (a.risks + a.esc))
    .slice(0, 5)
    .map((s, i) => ({ id: String(i), name: s.name, tone: (s.high ? 'high' : 'medium') as 'high' | 'medium', subtitle: `${s.risks} risk${s.risks === 1 ? '' : 's'} · ${s.esc} escalation${s.esc === 1 ? '' : 's'}` }));

  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Screen scroll>
      <BoardHeader title={`${greet}${user?.first_name ? `, ${user.first_name}` : ''}`} subtitle="Registered Manager" onBellPress={() => {}} />

      <SectionTitle title="Needs your attention" />
      <StatusList rows={attentionRows} onPressRow={() => {}} />

      <SectionTitle title="Trajectory changes" />
      <Row gap={spacing.md} style={{ marginBottom: spacing.lg }}>
        {trajectoryTiles.map((t) => {
          const c = severityColor(mode, t.tone === 'neutral' ? 'info' : t.tone);
          return (
            <Card key={t.label} style={{ flex: 1, backgroundColor: c.bg, borderWidth: 0, alignItems: 'center' }}>
              <Text style={{ color: c.fg }} variant="title" weight="800">{t.value}</Text>
              <Text style={{ color: c.fg }} variant="caption" weight="600">{t.label}</Text>
            </Card>
          );
        })}
      </Row>

      <SectionTitle title="Sites requiring attention" />
      {sites.length === 0 && <Text muted variant="caption">No sites currently need attention.</Text>}
      {sites.map((s) => (
        <Card key={s.id} style={{ marginBottom: spacing.md }}>
          <Row justify="space-between">
            <Text weight="700">{s.name}</Text>
            <StatusPill tone={s.tone} />
          </Row>
          <Text muted variant="caption" style={{ marginTop: 4 }}>{s.subtitle}</Text>
        </Card>
      ))}
    </Screen>
  );
}

function StatusPill({ tone }: { tone: 'high' | 'medium' }) {
  const { severityColor, mode } = useTheme();
  const c = severityColor(mode, tone);
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ color: c.fg, fontSize: 12 }} weight="700">{tone === 'high' ? 'High' : 'Medium'}</Text>
    </View>
  );
}
