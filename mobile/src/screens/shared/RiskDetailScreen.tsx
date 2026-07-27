import React from 'react';
import { View, Pressable } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { RootStackParams } from '@/navigation/types';
import { radius, Palette } from '@/theme/tokens';
import { Screen, Card, Row, Label, Text, Pill, SeverityPill, Traj, Loading, ErrorNote } from '@/components/ui';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.actions || v?.escalations || []);
const isDone = (a: any) => /complete|done|cancel/i.test(a?.status || '');
const gradeTone = (g?: string): 'crit' | 'high' | 'mod' | 'low' => {
  const s = String(g || '').toLowerCase();
  return s === 'critical' ? 'crit' : s === 'high' ? 'high' : s === 'medium' || s === 'moderate' ? 'mod' : 'low';
};

/* Full risk detail — the mobile mirror of the web risk drawer: computed metrics + governance
   summary, the recurrence banner, description, trajectory narrative, controls, and the escalation
   response. Read-only viewing; the decision flows (promote/close/rate) keep their own screens. */
export function RiskDetailScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParams, 'RiskDetail'>>();
  const seed: any = (route.params as any)?.risk || {};
  const id = seed.id || (route.params as any)?.id;

  const riskQ = useApi<any>(id ? `/risks/${id}` : null);
  const actionsQ = useApi<any>(id ? `/risks/${id}/actions` : null);
  const escQ = useApi<any>(id ? `/escalations?risk_id=${id}` : null);

  const r = riskQ.data || seed;
  const m = r?.metrics;
  const prev = r?.previous_chapter;
  const actions = arr(actionsQ.data);
  const escs = arr(escQ.data);

  if (riskQ.loading && !riskQ.data) return <Screen><Loading /></Screen>;
  if (riskQ.error && !riskQ.data) return <Screen><ErrorNote message={riskQ.error} onRetry={riskQ.refetch} /></Screen>;

  const title = r.title || r.risk_title || r.theme || 'Risk';
  const trajDir = m?.trajectoryDirection || r.trajectory_direction || r.trajectory;
  const narrative = m?.narrative || r.trajectory_narrative;

  return (
    <Screen refreshing={riskQ.loading} onRefresh={() => { riskQ.refetch(); actionsQ.refetch(); escQ.refetch(); }}>
      {/* Title + status */}
      <View style={{ gap: 6 }}>
        <Text size={20} weight="700" style={{ letterSpacing: -0.3 }}>{title}</Text>
        <Row gap={7} style={{ flexWrap: 'wrap' }}>
          <SeverityPill severity={r.severity || r.current_severity} />
          {!!r.status && <Pill tone="ghost">{r.status}</Pill>}
          <Traj dir={trajDir} />
        </Row>
        <Text size={12} muted>
          {r.house_name || r.service_name || 'Organisation-wide'}
          {r.created_at ? ` · registered ${new Date(r.created_at).toLocaleDateString('en-GB')}` : ''}
          {r.created_by_name ? ` by ${r.created_by_name}` : ''}
        </Text>
      </View>

      {/* Recurrence — this risk continues a previously closed one */}
      {prev && (
        <View style={{ backgroundColor: c.sevHigh + '18', borderWidth: 1, borderColor: c.sevHigh + '66', borderRadius: radius.lg, padding: 13 }}>
          <Text size={11} weight="700" color={c.sevHigh} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Recurrence · occurrence {prev.occurrence} of this concern
          </Text>
          <Text size={13} style={{ marginTop: 6 }}>
            Previously raised as “{prev.title}”{prev.house ? ` (${prev.house})` : ''} and closed
            {prev.closed_on ? ` on ${new Date(prev.closed_on).toLocaleDateString('en-GB')}` : ''}
            {prev.resolution_outcome ? ` — ${prev.resolution_outcome}` : ''}. The controls signed off then did not hold.
          </Text>
        </View>
      )}

      {/* Computed governance metrics */}
      {m && (
        <>
          <Label>Computed metrics · no manual scoring</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Metric label="Risk Index" value={m.riskIndex} sub={`Grade: ${m.grade}`} tone={gradeGlyph(c, m.grade)} />
            <Metric label="Trajectory" value={`${m.trajectoryPct > 0 ? '+' : ''}${m.trajectoryPct}%`} sub={m.trajectoryGrade} />
            <Metric label="Priority" value={m.priority} sub="of 100" />
            <Metric label="Confidence" value={`${m.confidence}%`} sub="evidence strength" />
          </View>
          {!!narrative && (
            <View style={{ backgroundColor: c.card, borderLeftWidth: 3, borderLeftColor: c.accent, borderRadius: radius.md, padding: 12 }}>
              <Text size={13} style={{ lineHeight: 19 }}>{narrative}</Text>
            </View>
          )}
        </>
      )}

      {/* Governance description */}
      {!!r.description && (
        <Card>
          <Label>Governance description</Label>
          <Text size={13} style={{ lineHeight: 19 }}>{r.description}</Text>
        </Card>
      )}

      {/* Trajectory narration (evidence trail) */}
      {!!(r.trajectory_v2?.basis) && (
        <Card>
          <Row gap={7} style={{ marginBottom: 4 }}>
            <Feather name="trending-up" size={14} color={c.accent} />
            <Text size={12} weight="700">Trajectory · {r.trajectory_v2.direction}</Text>
          </Row>
          <Text size={12.5} muted style={{ lineHeight: 18 }}>{r.trajectory_v2.basis}</Text>
        </Card>
      )}

      {/* Controls & actions */}
      <Label>Controls &amp; effectiveness</Label>
      {actions.length === 0 ? (
        <Card><Text size={12.5} muted>No controls recorded yet.</Text></Card>
      ) : (
        <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, paddingHorizontal: 13 }}>
          {actions.map((a: any, i: number) => (
            <View key={a.id || i} style={{ paddingVertical: 11, borderBottomWidth: i < actions.length - 1 ? 1 : 0, borderBottomColor: c.lineSoft }}>
              <Row style={{ justifyContent: 'space-between' }} gap={8}>
                <Text size={13.5} weight="600" style={{ flex: 1 }} numberOfLines={2}>{a.title || a.action_description || 'Control'}</Text>
                <Feather name={isDone(a) ? 'check-circle' : 'clock'} size={15} color={isDone(a) ? c.sevLow : c.sevHigh} />
              </Row>
              <Text size={11.5} muted style={{ marginTop: 3 }}>
                {a.status || 'Pending'}
                {a.effectiveness_outcome ? ` · rated ${a.effectiveness_outcome}` : ''}
                {a.due_date ? ` · due ${new Date(a.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Response — escalations opened against this risk */}
      {escs.length > 0 && (
        <>
          <Label>Response · escalations</Label>
          <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, paddingHorizontal: 13 }}>
            {escs.map((e: any, i: number) => {
              const status = e.lifecycle_status || e.status || 'Open';
              const closed = /resolved|closed/i.test(String(status));
              const days = e.created_at ? Math.max(0, Math.floor((Date.now() - new Date(e.created_at).getTime()) / 86400000)) : null;
              return (
                <Pressable key={e.id || i} onPress={() => nav.navigate('RMEscalations')}
                  style={({ pressed }) => ({ paddingVertical: 11, borderBottomWidth: i < escs.length - 1 ? 1 : 0, borderBottomColor: c.lineSoft, opacity: pressed ? 0.6 : 1 })}>
                  <Row style={{ justifyContent: 'space-between' }} gap={8}>
                    <Pill tone={closed ? 'low' : 'high'}>{status}</Pill>
                    {days != null && !closed && <Text size={11.5} muted>{days} day{days === 1 ? '' : 's'} open</Text>}
                  </Row>
                  <Text size={12.5} style={{ marginTop: 5 }} numberOfLines={2}>{e.reason || 'Escalation'}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

/* Local metric tile — matches the web's 4-up computed-metric strip. */
function Metric({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ width: '47.5%', flexGrow: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 12 }}>
      <Text size={10.5} muted style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</Text>
      <Text size={22} weight="700" color={tone} style={{ marginTop: 3, letterSpacing: -0.4 }}>{value}</Text>
      {!!sub && <Text size={11} muted style={{ marginTop: 2 }}>{sub}</Text>}
    </View>
  );
}

// Reuse the severity palette to colour the grade value.
function gradeGlyph(c: Palette, grade?: string): string {
  const t = gradeTone(grade);
  return t === 'crit' ? c.sevCrit : t === 'high' ? c.sevHigh : t === 'mod' ? c.sevMod : c.sevLow;
}
