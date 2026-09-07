import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { Screen, AppHeader, ListItem, Pill, Loading, ErrorNote, Empty } from '@/components/ui';

export function TLWeeklyReviewsScreen() {
  const nav = useNavigation<any>();
  const q = useApi<any[]>('/weekly-reviews/for-me');
  const reviews = Array.isArray(q.data) ? q.data : [];
  return (
    <Screen refreshing={q.loading} onRefresh={q.refetch}>
      <AppHeader title="Weekly Reviews" subtitle="Published reviews for your assigned service" />
      {q.loading && !q.data ? <Loading /> : q.error ? <ErrorNote message={q.error} onRetry={q.refetch} /> : reviews.length === 0 ? (
        <Empty icon="file-text" title="No weekly review has been published for your service." />
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
