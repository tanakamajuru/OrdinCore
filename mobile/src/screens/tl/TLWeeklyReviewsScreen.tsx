import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { Screen, AppHeader, ListItem, Pill, Loading, ErrorNote, Empty, Card, Label, Row, Chip, Text, Field, Button } from '@/components/ui';
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
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const fmt = (d: string) => d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const periodReviews = all.filter((r) => {
    const w = String(r.week_ending || '').slice(0, 10);
    if (from && w < from) return false;
    if (to && w > to) return false;
    return true;
  }).sort((a, b) => String(b.week_ending || '').localeCompare(String(a.week_ending || '')));
  const needle = search.trim().toLowerCase();
  const matches = needle ? periodReviews.filter((r) => {
    const week = r.week_ending ? `${new Date(r.week_ending).toLocaleDateString('en-GB')} ${new Date(r.week_ending).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}` : '';
    return [r.house_name, r.week_ending, week, r.position].some((value) => String(value || '').toLowerCase().includes(needle));
  }) : periodReviews;
  const reviews = needle || showAll ? matches : matches.slice(0, 5);

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

      <View>
        <Label>Find a review</Label>
        <Field value={search} onChangeText={(value) => { setSearch(value); setShowAll(false); }} placeholder="Search service, week ending, or position…" autoCapitalize="none" />
        {!!needle && <Text size={11.5} muted style={{ marginTop: 5 }}>{matches.length} matching review{matches.length === 1 ? '' : 's'}</Text>}
      </View>

      {q.loading && !q.data ? <Loading /> : q.error ? <ErrorNote message={q.error} onRetry={q.refetch} /> : matches.length === 0 ? (
        <Empty icon="file-text" title={needle ? `No reviews match "${search.trim()}".` : (from || to) ? 'No weekly reviews in this period.' : 'No weekly review has been published for your service.'} />
      ) : <>
        {!needle && !showAll && <Text size={11.5} muted>Showing the 5 newest of {matches.length} reviews.</Text>}
        {reviews.map((r) => (
          <ListItem key={r.id} icon="file-text" title={r.house_name || 'Service'}
            meta={`Week ending ${new Date(r.week_ending).toLocaleDateString('en-GB')} · ${r.position || 'Position not stated'}`}
            right={<Pill tone={r.acknowledged ? 'low' : 'mod'}>{r.acknowledged ? 'Read' : 'Read now'}</Pill>}
            onPress={() => nav.navigate('TLWeeklyReviewDetail', { id: r.id })} />
        ))}
        {!needle && matches.length > 5 && <Button title={showAll ? 'Show fewer reviews' : `Show all ${matches.length} reviews`} icon={showAll ? 'chevron-up' : 'list'} tone="ghost" onPress={() => setShowAll(!showAll)} />}
      </>}
    </Screen>
  );
}

export default TLWeeklyReviewsScreen;
