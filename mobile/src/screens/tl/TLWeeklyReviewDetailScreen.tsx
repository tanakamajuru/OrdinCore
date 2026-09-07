import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { RootStackParams } from '@/navigation/types';
import { Screen, AppHeader, Card, Label, Text, Banner, Button, Loading, ErrorNote } from '@/components/ui';

export function TLWeeklyReviewDetailScreen() {
  const { id } = useRoute<RouteProp<RootStackParams, 'TLWeeklyReviewDetail'>>().params;
  const q = useApi<any>(`/weekly-reviews/${id}`);
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const r = q.data;
  const c = r?.content || {};
  const acknowledge = async () => {
    setBusy(true);
    try { await api.post(`/weekly-reviews/${id}/acknowledge`, {}); setAcknowledged(true); Alert.alert('Recorded', 'You have acknowledged this published review.'); }
    catch (e: any) { Alert.alert("Couldn't acknowledge", e?.message || 'Please try again.'); }
    finally { setBusy(false); }
  };
  if (q.loading && !r) return <Screen><Loading /></Screen>;
  if (q.error || !r) return <Screen><ErrorNote message={q.error || 'Review unavailable'} onRetry={q.refetch} /></Screen>;
  if (r.status !== 'published') return <Screen><Banner tone="block" icon="lock" title="Not available">This review has not been published to the team.</Banner></Screen>;
  return <Screen>
    <AppHeader title={r.house_name || 'Weekly Governance Review'} subtitle={`Week ending ${new Date(r.week_ending).toLocaleDateString('en-GB')}`} />
    <Banner tone="ok" icon="shield" title={`Management position: ${r.overall_position || c.step14_overall_position || 'Not stated'}`}>
      Published {r.published_at ? new Date(r.published_at).toLocaleString('en-GB') : 'to your service'}.
    </Banner>
    <Card><Label>What management concluded</Label><Text size={13}>{r.governance_narrative || c.step15_narrative || 'No narrative recorded.'}</Text></Card>
    <Card><Label>What this means for the team</Label><Text size={13}>{c.step12_decisions || c.team_priorities || 'Continue current actions and follow the service plan.'}</Text></Card>
    <Card><Label>Lessons learned</Label><Text size={13}>{c.lessons_learnt || 'No additional lessons recorded.'}</Text></Card>
    <Card><Label>Week ahead</Label><Text size={13}>{c.anticipated_risks?.rm_note || 'No additional watch items recorded.'}</Text></Card>
    {acknowledged ? <Banner tone="ok" icon="check-circle" title="Acknowledged">Your acknowledgement is recorded against this version.</Banner>
      : <Button title="Acknowledge after reading" icon="check" onPress={acknowledge} loading={busy} />}
  </Screen>;
}

export default TLWeeklyReviewDetailScreen;
