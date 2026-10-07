import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { Screen, AppHeader, ListItem, Pill, Loading, ErrorNote, Empty, Card, Label, Row, Chip, Text } from '@/components/ui';
import { CalendarField } from '@/components/CalendarField';

// Read-only reader of published weekly review reports for the signed-in person's service(s) — shared
// by Registered Managers and Team Leaders. Authoring/finalising happens on the web app. A From–To
// range narrows the list (e.g. to catch up after being away).
export function TLWeeklyReviewsScreen() {
  const nav = useNavigation<any>();
  const q = useApi<any[]>('/weekly-reviews/for-me');
  const all = Array.isArray(q.data) ? q.data : [];
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [picking, setPicking] = useState<null | 'from' | 'to'>(null);
  const fmt = (d: string) => d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const reviews = all.filter((r) => {
    const w = String(r.week_ending || '').slice(0, 10);
    if (from && w < from) return false;
    if (to && w > to) return false;
    return true;
  });

  return (
    <Screen refreshing={q.loading} onRefresh={q.refetch}>
      <AppHeader title="Weekly Reviews" subtitle="Published reviews for your service(s)" />

      <Card>
        <Label>Reading period (optional)</Label>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          <Chip label={`From: ${fmt(from)}`} active={picking === 'from'} onPress={() => setPicking(picking === 'from' ? null : 'from')} />
          <Chip label={`To: ${fmt(to)}`} active={picking === 'to'} onPress={() => setPicking(picking === 'to' ? null : 'to')} />
          {(from || to) && <Chip label="Clear" active={false} onPress={() => { setFrom(''); setTo(''); setPicking(null); }} />}
        </Row>
        {picking === 'from' && <View style={{ marginTop: 8 }}><CalendarField value={from} onChange={(v) => { setFrom(v); if (to && v > to) setTo(v); setPicking(null); }} /></View>}
        {picking === 'to' && <View style={{ marginTop: 8 }}><CalendarField value={to} onChange={(v) => { setTo(v); if (from && v < from) setFrom(v); setPicking(null); }} minDate={from || undefined} /></View>}
      </Card>

      {q.loading && !q.data ? <Loading /> : q.error ? <ErrorNote message={q.error} onRetry={q.refetch} /> : reviews.length === 0 ? (
        <Empty icon="file-text" title={(from || to) ? 'No weekly reviews in this period.' : 'No weekly review has been published for your service.'} />
      ) : reviews.map((r) => (
        <ListItem key={r.id} icon="file-text" title={r.house_name || 'Service'}
          meta={`Week ending ${new Date(r.week_ending).toLocaleDateString('en-GB')} · ${r.position || 'Position not stated'}`}
          right={<Pill tone={r.acknowledged ? 'low' : 'mod'}>{r.acknowledged ? 'Read' : 'Read now'}</Pill>}
          onPress={() => nav.navigate('TLWeeklyReviewDetail', { id: r.id })} />
      ))}
    </Screen>
  );
}

export default TLWeeklyReviewsScreen;
