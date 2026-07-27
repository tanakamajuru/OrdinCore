import React from 'react';
import { Alert } from 'react-native';
import { useApi } from '@/api/useApi';
import { Screen, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, StatusList, BoardItem } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.documents || []);
const CATEGORIES: { key: string; label: string }[] = [
  { key: 'care_plan', label: 'Care plans' },
  { key: 'risk_assessment', label: 'Risk assessments' },
  { key: 'policy', label: 'Policies' },
  { key: 'house_record', label: 'House records' },
  { key: 'training_record', label: 'Training records' },
  { key: 'procedure', label: 'Procedures' },
  { key: 'other', label: 'Other' },
];

export function TLDocumentsScreen() {
  const { data, loading, error, refetch } = useApi<any>('/documents');
  const docs = arr(data);
  const items: BoardItem[] = CATEGORIES
    .map(({ key, label }) => ({ label, n: docs.filter((d) => d.category === key).length }))
    .filter((g) => g.n > 0)
    .map(({ label, n }) => ({ title: label, meta: `${n} file${n === 1 ? '' : 's'}`, value: String(n), tone: 'amber' as const }));

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Documents" subtitle="Your service" />
      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <StatusList items={items} button="View all documents"
          onButton={() => Alert.alert('Documents', 'The full document library is on the OrdinCore web app.')}
          empty="No documents yet." />
      )}
    </Screen>
  );
}
