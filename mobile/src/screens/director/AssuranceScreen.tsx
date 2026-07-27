import React from 'react';
import { View, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { Screen, Text, Row, Pill, Button, Loading } from '@/components/ui';
import { StatCard, Section, Donut } from '@/components/dashboard';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.escalations || v?.actions || v?.rows || []);
const isRising = (t?: string) => ['Rising', 'Deteriorating', 'Critical'].includes(String(t || ''));
const dd = (x?: string) => (x ? new Date(x).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');

function HeatCell({ trend }: { trend?: string }) {
  const { c } = useTheme();
  if (!trend) return <View style={{ flex: 1, height: 30, borderRadius: 6, backgroundColor: c.lineSoft }} />;
  const rising = isRising(trend), improving = trend === 'Improving';
  const bg = rising ? c.sevCrit : improving ? c.sevLow : c.sevMod;
  const icon = rising ? 'arrow-up-right' : improving ? 'arrow-down-right' : 'minus';
  return (
    <View style={{ flex: 1, height: 30, borderRadius: 6, backgroundColor: bg + '26', alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={icon as any} size={15} color={bg} />
    </View>
  );
}

export function DirectorAssuranceScreen() {
  const { c } = useTheme();
  const risks = useApi<any>('/risks?limit=200');
  const esc = useApi<any>('/escalations?limit=200');
  const stats = useApi<any>('/escalations/stats');
  const acts = useApi<any>('/actions/oversight');
  const eff = useApi<any>('/actions/pending-effectiveness');
  const houses = useApi<any>('/houses?limit=100');
  const heat = useApi<any>('/director/cross-site-heatmap');

  const loading = risks.loading && !risks.data;
  const refetch = () => { risks.refetch(); esc.refetch(); stats.refetch(); acts.refetch(); eff.refetch(); houses.refetch(); heat.refetch(); };

  const riskList = arr(risks.data);
  const openRisks = riskList.filter((r: any) => (r.status || '').toLowerCase() !== 'closed');
  const trendOf = (r: any) => r.trend || r.trajectory || 'Stable';
  const rising = openRisks.filter((r: any) => isRising(trendOf(r))).length;
  const improving = openRisks.filter((r: any) => trendOf(r) === 'Improving').length;
  const stable = Math.max(openRisks.length - rising - improving, 0);

  const escList = arr(esc.data);
  const openEsc = escList.filter((e: any) => (e.lifecycle_status || '') !== 'Closed');
  const overdueEsc = escList.filter((e: any) => e.overdue).length;

  const actions = arr(acts.data);
  const rated = actions.filter((a: any) => a.effectiveness_outcome || a.effectiveness);
  const effCount = (names: string[]) => rated.filter((a: any) => names.includes(a.effectiveness_outcome) || names.includes(a.effectiveness)).length;
  const effEffective = effCount(['Effective']);
  const effPartial = effCount(['Partially Effective', 'Neutral']);
  const effNot = effCount(['Not Effective', 'Ineffective']);
  const effPct = rated.length ? Math.round((effEffective / rated.length) * 100) : 0;
  const actionsDue = actions.filter((a: any) => !['Complete', 'Completed', 'Cancelled'].includes(a.status));

  const themeCount: Record<string, number> = {};
  openRisks.forEach((r: any) => { const t = r.strategic_theme || r.risk_domain || r.title; if (t) themeCount[t] = (themeCount[t] || 0) + 1; });
  const topThemes = Object.entries(themeCount).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5).map(([t]) => t);

  const services = arr(houses.data).slice(0, 7);
  const heatRows = arr(heat.data);
  const heatTrend: Record<string, string> = {};
  heatRows.forEach((h: any) => { heatTrend[`${h.service_id}|${h.theme}`] = h.trend; });
  const heatThemes = (heatRows.length
    ? Array.from(new Set(heatRows.map((h: any) => h.theme))).slice(0, 4)
    : topThemes.slice(0, 4)) as string[];
  const heatServices = heatRows.length
    ? Array.from(new Map(heatRows.map((h: any) => [h.service_id, { id: h.service_id, name: h.service_name }])).values()).slice(0, 6)
    : services.slice(0, 6);
  const worstTrend = (svcId: string, theme: string) => {
    const rs = openRisks.filter((r: any) => r.house_id === svcId && (r.strategic_theme || r.risk_domain || r.title) === theme);
    if (!rs.length) return undefined;
    if (rs.some((r: any) => isRising(trendOf(r)))) return 'Rising';
    if (rs.some((r: any) => trendOf(r) === 'Stable')) return 'Stable';
    return 'Improving';
  };
  const trendFor = (id: string, t: string) => heatRows.length ? heatTrend[`${id}|${t}`] : worstTrend(id, t);
  const svcAttention = services.filter((s: any) => openRisks.some((r: any) => r.house_id === s.id && isRising(trendOf(r)))).length;

  const st = stats.data || {};
  const statusBars = [
    { name: 'Open', value: Number(st.new_open || 0) },
    { name: 'Under Review', value: Number(st.under_review || 0) },
    { name: 'Actions Impl.', value: Number(st.actions_implemented || 0) },
    { name: 'Monitoring', value: Number(st.monitoring_effectiveness || 0) },
    { name: 'Closed', value: Number(st.closed || 0) },
  ];
  const maxStatus = Math.max(1, ...statusBars.map((s) => s.value));

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen refreshing={risks.loading} onRefresh={refetch}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text size={22} weight="600">Director Dashboard</Text>
          <Text muted size={12.5}>Strategic oversight across all services</Text>
        </View>
      </Row>
      <Button title="Download Reports" icon="download" tone="ghost" onPress={() => Alert.alert('Reports', 'Reports are on the web app.')} />

      <Row gap={8}>
        <StatCard icon="shield" tint="#6366f1" label="Strategic Risks" value={openRisks.length}
          footer={<><Text size={11} color={c.sevCrit}>↑ {rising}</Text><Text size={11} color={c.sevMod}>→ {stable}</Text><Text size={11} color={c.sevLow}>↓ {improving}</Text></>} />
        <StatCard icon="flag" tint={c.sevHigh} label="Escalations Open" value={openEsc.length}
          footer={<><Text size={11} color={c.sevCrit}>● {overdueEsc} Overdue</Text><Text size={11} color={c.sevLow}>● {openEsc.length - overdueEsc} On time</Text></>} />
      </Row>
      <Row gap={8}>
        <StatCard icon="clock" tint={c.sevMod} label="Overdue Reviews" value={overdueEsc} delta="need attention" />
        <StatCard icon="check-square" tint="#2F6CB5" label="Actions Due" value={actionsDue.length} delta="across services" />
      </Row>
      <Row gap={8}>
        <StatCard icon="trending-up" tint={c.sevLow} label="Action Effectiveness" value={`${effPct}%`}
          footer={<><Text size={11} color={c.sevMod}>{rated.length ? Math.round(effPartial / rated.length * 100) : 0}% Partial</Text><Text size={11} color={c.sevCrit}>{rated.length ? Math.round(effNot / rated.length * 100) : 0}% Not</Text></>} />
        <StatCard icon="users" tint="#e11d48" label="Services Need Attention" value={svcAttention} delta="rising risk" />
      </Row>

      {/* Heat map */}
      <Section title="Risk Heat Map" note="by service & theme">
        <Row gap={5} style={{ marginBottom: 5 }}>
          <View style={{ width: 88 }} />
          {heatThemes.map((t) => <Text key={t} faint size={9.5} style={{ flex: 1, textAlign: 'center' }} >{t}</Text>)}
        </Row>
        {heatServices.map((s: any) => (
          <Row key={s.id} gap={5} style={{ marginBottom: 5 }}>
            <Text size={11} weight="600" style={{ width: 88 }} numberOfLines={1}>{s.name}</Text>
            {heatThemes.map((t) => <HeatCell key={t} trend={trendFor(s.id, t)} />)}
          </Row>
        ))}
        {heatServices.length === 0 && <Text muted size={12}>No services</Text>}
      </Section>

      {/* Two donuts */}
      <Section title="Risks by Trend">
        <Row gap={16} style={{ alignItems: 'center' }}>
          <Donut total={openRisks.length} centerLabel="Risks" data={[{ value: rising, color: '#ef4444' }, { value: stable, color: '#f59e0b' }, { value: improving, color: '#10b981' }]} />
          <View style={{ flex: 1, gap: 6 }}>
            {[['Rising', rising, '#ef4444'], ['Stable', stable, '#f59e0b'], ['Improving', improving, '#10b981']].map(([n, v, col]) => (
              <Row key={n as string} gap={7}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col as string }} /><Text muted size={12} style={{ flex: 1 }}>{n as string}</Text><Text size={12} weight="600">{v as number}</Text></Row>
            ))}
          </View>
        </Row>
      </Section>

      <Section title="Action Effectiveness" note="all services">
        <Row gap={16} style={{ alignItems: 'center' }}>
          <Donut total={rated.length} center={`${effPct}%`} centerLabel="Effective" data={[{ value: effEffective, color: '#10b981' }, { value: effPartial, color: '#f59e0b' }, { value: effNot, color: '#ef4444' }]} />
          <View style={{ flex: 1, gap: 6 }}>
            {[['Effective', effEffective, '#10b981'], ['Partially', effPartial, '#f59e0b'], ['Not Effective', effNot, '#ef4444']].map(([n, v, col]) => (
              <Row key={n as string} gap={7}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col as string }} /><Text muted size={12} style={{ flex: 1 }}>{n as string}</Text><Text size={12} weight="600">{v as number}</Text></Row>
            ))}
          </View>
        </Row>
      </Section>

      {/* Escalations by status */}
      <Section title="Escalations by Status">
        {statusBars.map((s) => (
          <Row key={s.name} gap={8} style={{ marginBottom: 8 }}>
            <Text muted size={11.5} style={{ width: 90 }}>{s.name}</Text>
            <View style={{ flex: 1, height: 14, borderRadius: 4, backgroundColor: c.lineSoft, overflow: 'hidden' }}>
              <View style={{ width: `${(s.value / maxStatus) * 100}%`, height: '100%', backgroundColor: '#6366f1', borderRadius: 4 }} />
            </View>
            <Text size={11.5} weight="600" style={{ width: 22, textAlign: 'right' }}>{s.value}</Text>
          </Row>
        ))}
      </Section>

      {/* Top themes */}
      <Section title="Top Risk Themes" note="by services affected">
        {topThemes.map((t) => {
          const svcs = new Set(openRisks.filter((r: any) => (r.strategic_theme || r.risk_domain || r.title) === t).map((r: any) => r.house_id)).size;
          const trend = openRisks.some((r: any) => (r.strategic_theme || r.risk_domain || r.title) === t && isRising(trendOf(r))) ? 'Rising' : 'Stable';
          return (
            <Row key={t} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
              <View style={{ flex: 1 }}><Text size={13} weight="600">{t}</Text><Text muted size={11}>{svcs} service{svcs !== 1 ? 's' : ''}</Text></View>
              <Pill tone={trend === 'Rising' ? 'crit' : 'mod'}>{trend}</Pill>
            </Row>
          );
        })}
        {topThemes.length === 0 && <Text muted size={12} style={{ textAlign: 'center', paddingVertical: 16 }}>No themes</Text>}
      </Section>

      {/* Services overview */}
      <Section title="Services Overview">
        {services.map((s: any) => {
          const sr = openRisks.filter((r: any) => r.house_id === s.id);
          const risingN = sr.filter((r: any) => isRising(trendOf(r))).length;
          const level = risingN >= 2 ? 'High' : risingN === 1 ? 'Medium' : 'Low';
          return (
            <Row key={s.id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
              <Text size={13} weight="600">{s.name}</Text>
              <Pill tone={level === 'High' ? 'crit' : level === 'Medium' ? 'mod' : 'low'}>{level}</Pill>
            </Row>
          );
        })}
        {services.length === 0 && <Text muted size={12} style={{ textAlign: 'center', paddingVertical: 16 }}>No services</Text>}
      </Section>

      {/* Recent escalations */}
      <Section title="Recent Escalations">
        {escList.slice(0, 8).map((e: any) => (
          <Row key={e.id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
            <View style={{ flex: 1 }}>
              <Text size={13} weight="600" numberOfLines={1}>{e.risk_title || e.reason || 'Escalation'}</Text>
              <Text muted size={11}>{e.service_name || e.house_name || '—'} · {dd(e.created_at)}{e.due_by ? ` · due ${dd(e.due_by)}` : ''}</Text>
            </View>
            <Pill tone={e.overdue ? 'crit' : 'ghost'}>{e.overdue ? 'Overdue' : (e.lifecycle_status || e.status)}</Pill>
          </Row>
        ))}
        {escList.length === 0 && <Text muted size={12} style={{ textAlign: 'center', paddingVertical: 16 }}>No escalations</Text>}
      </Section>
    </Screen>
  );
}
