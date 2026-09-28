import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { Screen, AppHeader, Banner, Label, Card, Row, Text, Pill, Button, Loading, ErrorNote, Feather, Chip, TextArea } from '@/components/ui';

export function ProviderSignoffScreen() {
  const { c } = useTheme();
  const roll = useApi<any>('/weekly-reviews/service-rollup');
  const week = roll.data?.week_ending as string | undefined;
  const prov = useApi<any>(week ? `/weekly-reviews/rollup?week_ending=${week}` : null, [week]);
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState('Assured with actions');
  const [rationale, setRationale] = useState('');

  const d = prov.data || {};
  // Trust the backend's readiness/gate (doctrine: the frontend must not recalculate a different
  // readiness state). Fall back to the legacy fields only if the new contract isn't present yet.
  const blockers: any[] = Array.isArray(d.blockers) ? d.blockers : [];
  const blocked = typeof d.assurance_ready === 'boolean'
    ? !d.assurance_ready
    : ((d.outstanding?.length || 0) > 0 || (d.sites || []).some((s: any) => s.validation_status !== 'Approved'));
  const includedCount = d.included_service_count ?? d.sites_total ?? 0;
  const validatedCount = d.director_validated_count ?? 0;
  const ev = d.evidence_totals;

  const sign = async () => {
    if (!week) return;
    setBusy(true);
    try {
      await api.post('/weekly-reviews/rollup/sign', { week_ending: week, position, statement: rationale.trim() });
      Alert.alert('Signed', 'The provider position is recorded against you.');
      prov.refetch();
    } catch (e: any) {
      Alert.alert("Couldn't sign", e?.message || 'Every service must be finalised first.');
    } finally { setBusy(false); }
  };

  if ((roll.loading || prov.loading) && !prov.data) return <Screen><Loading /></Screen>;

  return (
    <Screen refreshing={prov.loading} onRefresh={() => { roll.refetch(); prov.refetch(); }}>
      <AppHeader title="Provider assurance" subtitle={d.week_ending_label ? `Week ending ${d.week_ending_label}` : (week ? `W/E ${week}` : 'All services')} />
      {roll.error ? <ErrorNote message={roll.error} onRetry={roll.refetch} /> : (
        <>
          {d.signoff ? (
            <Banner tone="ok" icon="check-circle" title={`${d.signoff.position ? d.signoff.position + ' — ' : ''}signed by ${d.signoff.acknowledged_by_name || 'you'}`}>{d.signoff.statement}</Banner>
          ) : blocked ? (
            <Banner tone="block" icon="lock" title="Provider assurance not ready">
              {(blockers.length ? blockers.map((b: any) => `${b.name} — ${b.reason}`) : ['One or more services are not yet Director validated.']).slice(0, 5).join('\n')}
            </Banner>
          ) : (
            <Banner tone="ok" icon="check" title="All service reviews Director validated">Ready for your assurance decision.</Banner>
          )}

          <Label>Services · {validatedCount} of {includedCount} Director validated{typeof d.rm_finalised_count === 'number' ? ` · ${d.rm_finalised_count} RM finalised` : ''}</Label>
          {(d.sites || []).map((s: any) => (
            <Card key={s.house_id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={8}>
                  <Feather name={s.director_validated ? 'check-circle' : s.rm_finalised ? 'clock' : 'circle'} size={15} color={s.director_validated ? c.sevLow : s.rm_finalised ? c.sevHigh : c.faint} />
                  <Text size={13} weight="500">{s.house}</Text>
                </Row>
                <Row gap={6}>
                  {s.position ? <Pill tone="ghost">{s.position}</Pill> : null}
                  <Pill tone={s.director_validated ? 'low' : 'ghost'}>{s.lifecycle || (s.director_validated ? 'Director validated' : s.rm_finalised ? 'Awaiting validation' : 'Not started')}</Pill>
                </Row>
              </Row>
            </Card>
          ))}

          {ev && (
            <Card>
              <Label>Evidence this week</Label>
              <Text size={12} color={c.muted}>{ev.signals} signals · {ev.patterns} patterns · {ev.open_risks} open risks · {ev.open_escalations} escalations · {ev.overdue_actions} overdue actions</Text>
              <Text size={12} color={c.muted}>Effectiveness — {ev.effectiveness?.effective ?? 0} effective · {ev.effectiveness?.partially_effective ?? 0} partial · {ev.effectiveness?.not_effective ?? 0} not · {ev.effectiveness?.too_early ?? 0} too early</Text>
            </Card>
          )}

          {!d.signoff && (
            <>
              <Label>Your independent assurance conclusion</Label>
              <Row gap={6} style={{ flexWrap: 'wrap' }}>{['Assured', 'Assured with actions', 'Further evidence required', 'Not assured'].map((p) => <Chip key={p} label={p} active={position === p} onPress={() => setPosition(p)} />)}</Row>
              <TextArea value={rationale} onChangeText={setRationale} placeholder="Your evidence-based conclusion, challenge and required follow-up…" minHeight={90} required />
              <Button title="Record assurance decision" tone={blocked ? 'block' : 'primary'} disabled={blocked || rationale.trim().length < 30} onPress={sign} loading={busy} />
              <Row gap={6} style={{ justifyContent: 'center' }}>
                <Feather name="git-branch" size={12} color={c.muted} />
                <Text muted size={11} style={{ textAlign: 'center' }}>Signed by the RI — not the RMs who authored each site.</Text>
              </Row>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
