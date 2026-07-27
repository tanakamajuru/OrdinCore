import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { Screen, AppHeader, Banner, Label, Card, Row, Text, Pill, Button, Loading, ErrorNote, Feather } from '@/components/ui';

export function ProviderSignoffScreen() {
  const { c } = useTheme();
  const roll = useApi<any>('/weekly-reviews/service-rollup');
  const week = roll.data?.week_ending as string | undefined;
  const prov = useApi<any>(week ? `/weekly-reviews/rollup?week_ending=${week}` : null, [week]);
  const [busy, setBusy] = useState(false);

  const d = prov.data || {};
  const outstanding: string[] = d.outstanding || [];
  const blocked = outstanding.length > 0;

  const sign = async () => {
    if (!week) return;
    setBusy(true);
    try {
      await api.post('/weekly-reviews/rollup/sign', { week_ending: week });
      Alert.alert('Signed', 'The provider position is recorded against you.');
      prov.refetch();
    } catch (e: any) {
      Alert.alert("Couldn't sign", e?.message || 'Every service must be finalised first.');
    } finally { setBusy(false); }
  };

  if ((roll.loading || prov.loading) && !prov.data) return <Screen><Loading /></Screen>;

  return (
    <Screen refreshing={prov.loading} onRefresh={() => { roll.refetch(); prov.refetch(); }}>
      <AppHeader title="Provider position" subtitle={week ? `W/E ${week} · all services` : 'All services'} />
      {roll.error ? <ErrorNote message={roll.error} onRetry={roll.refetch} /> : (
        <>
          {d.signoff ? (
            <Banner tone="ok" icon="check-circle" title={`Signed by ${d.signoff.acknowledged_by_name || 'you'}`}>{d.signoff.statement}</Banner>
          ) : blocked ? (
            <Banner tone="block" icon="lock" title={`Sign-off blocked · ${outstanding.length} outstanding`}>
              {outstanding.slice(0, 4).join(', ')}{outstanding.length > 4 ? '…' : ''} not yet finalised.
            </Banner>
          ) : (
            <Banner tone="ok" icon="check" title="All services finalised">Ready for your sign-off.</Banner>
          )}

          <Label>Services · {d.sites_finalised ?? 0} of {d.sites_total ?? 0} finalised</Label>
          {(d.sites || []).map((s: any) => (
            <Card key={s.house_id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={8}>
                  <Feather name={s.finalised ? 'check' : 'clock'} size={15} color={s.finalised ? c.sevLow : c.faint} />
                  <Text size={13} weight="500">{s.house}</Text>
                </Row>
                <Pill tone={s.finalised ? 'low' : 'ghost'}>{s.finalised ? (s.position || 'Finalised') : 'Not finalised'}</Pill>
              </Row>
            </Card>
          ))}

          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Provider position</Label>
            <Pill tone="high">{d.provider_position || '—'}</Pill>
          </Row>
          {!d.signoff && (
            <>
              <Button title="Sign provider position" tone={blocked ? 'block' : 'primary'} disabled={blocked} onPress={sign} loading={busy} />
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
