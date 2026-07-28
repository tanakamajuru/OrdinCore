import React, { useState } from 'react';
import { useApi } from '@/api/useApi';
import { Screen, Row, Chip, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, StatusList, BoardItem } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.documents || []);
const CATEGORIES: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'care_plan', label: 'Care plans' },
  { key: 'risk_assessment', label: 'Risk assessments' },
  { key: 'policy', label: 'Policies' },
  { key: 'house_record', label: 'House records' },
  { key: 'training_record', label: 'Training records' },
  { key: 'procedure', label: 'Procedures' },
  { key: 'other', label: 'Other' },
];
const fmt = (x?: string) => (x ? new Date(x).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

export function TLDocumentsScreen() {
  const { data, loading, error, refetch } = useApi<any>('/documents');
  const [cat, setCat] = useState<string>('all');
  const docs = arr(data);
  const shown = cat === 'all' ? docs : docs.filter((d) => d.category === cat);
  const labelFor = (k?: string) => CATEGORIES.find((c) => c.key === k)?.label || 'Other';
  // Only show category chips that actually have documents.
  const chips = CATEGORIES.filter((c) => c.key === 'all' || docs.some((d) => d.category === c.key));
  const items: BoardItem[] = shown.map((d) => ({
    title: d.title || d.name || d.file_name || 'Document',
    meta: `${labelFor(d.category)}${d.created_at || d.uploaded_at ? ` · ${fmt(d.created_at || d.uploaded_at)}` : ''}`,
    tone: 'neutral',
  }));

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Documents" subtitle="Your service" />
      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <>
          <Row gap={7} style={{ flexWrap: 'wrap' }}>
            {chips.map((c) => <Chip key={c.key} label={c.key === 'all' ? `All · ${docs.length}` : c.label} active={cat === c.key} onPress={() => setCat(c.key)} />)}
          </Row>
          <StatusList items={items} empty="No documents in this category." />
        </>
      )}
    </Screen>
  );
}
