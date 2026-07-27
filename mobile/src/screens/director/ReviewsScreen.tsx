import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApi } from '@/api/useApi';
import { RootStackParams } from '@/navigation/types';
import { Screen, AppHeader, Label, ListItem, Pill, Loading, ErrorNote, Empty } from '@/components/ui';

const FINALISED = ['pending_validation', 'validated', 'published', 'LOCKED'];

export function ReviewsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { data, loading, error, refetch } = useApi<any>('/weekly-reviews/service-rollup');
  const houses: any[] = data?.houses || [];

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <AppHeader title="Weekly reviews" subtitle={data?.week_ending ? `W/E ${data.week_ending}` : 'Validate the week'} />
      <Label>Per service</Label>
      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : houses.length === 0 ? (
        <Empty icon="file-text" title="No reviews to validate." />
      ) : houses.map((h) => {
        const awaiting = h.status === 'pending_validation' || (h.finalised && h.validation_status !== 'Approved');
        return (
          <ListItem
            key={h.review_id || h.house_id}
            icon="file-text"
            title={h.house_name}
            meta={`${h.position || 'No position'} · authored by ${h.created_by_name || 'RM'}`}
            right={<Pill tone={awaiting ? 'mod' : 'low'}>{awaiting ? 'Validate' : 'Done'}</Pill>}
            onPress={awaiting && h.review_id ? () => nav.navigate('ValidateReview', { review: h }) : undefined}
          />
        );
      })}
    </Screen>
  );
}
