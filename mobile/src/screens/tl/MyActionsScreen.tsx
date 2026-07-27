import React, { useState, useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { Screen, AppHeader, Row, Chip, ListItem, Pill, Text, Loading, ErrorNote, Empty } from '@/components/ui';

type Filter = 'open' | 'overdue' | 'done';
const PAGE_SIZE = 10;
const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.actions || v?.data || []);

export function MyActionsScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { data, loading, error, refetch } = useApi<any[]>('/actions/my');
  const [filter, setFilter] = useState<Filter>('open');
  const [page, setPage] = useState(1);
  const all = arr(data);

  const isDone = (a: any) => /complete|done/i.test(a.status || '');
  const isOverdue = (a: any) => /overdue/i.test(a.status || '');
  const shown = all.filter((a: any) => (filter === 'done' ? isDone(a) : filter === 'overdue' ? isOverdue(a) : !isDone(a)));

  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = shown.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filter]);

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <AppHeader title="My actions" subtitle="Allocated to you · tap to action" />
      <Row gap={7}>
        <Chip label={`Open · ${all.filter((a: any) => !isDone(a)).length}`} active={filter === 'open'} onPress={() => setFilter('open')} />
        <Chip label={`Overdue · ${all.filter(isOverdue).length}`} active={filter === 'overdue'} onPress={() => setFilter('overdue')} />
        <Chip label="Done" active={filter === 'done'} onPress={() => setFilter('done')} />
      </Row>

      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : shown.length === 0 ? (
        <Empty title="Nothing here." />
      ) : (
        <>
          {paged.map((a: any) => (
            <ListItem
              key={a.id}
              icon={isDone(a) ? 'check' : 'check-square'}
              iconColor={isDone(a) ? c.sevLow : isOverdue(a) ? c.sevCrit : c.accent}
              title={a.title}
              meta={`${a.risk_title ? `Risk: ${a.risk_title}` : a.house_name || ''}${a.due_date ? ` · due ${new Date(a.due_date).toLocaleDateString('en-GB')}` : ''}`}
              right={<Pill tone={isDone(a) ? 'low' : isOverdue(a) ? 'crit' : 'mod'}>{a.status || 'Open'}</Pill>}
              onPress={() => nav.navigate('ActionDetail', { action: a })}
            />
          ))}

          {shown.length > PAGE_SIZE && (
            <Row style={{ justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
              <Pressable onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} hitSlop={8}
                style={{ opacity: safePage <= 1 ? 0.35 : 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="chevron-left" size={16} color={c.accent} /><Text color={c.accent} size={13}>Prev</Text>
              </Pressable>
              <Text muted size={12}>Page {safePage} of {totalPages}</Text>
              <Pressable onPress={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} hitSlop={8}
                style={{ opacity: safePage >= totalPages ? 0.35 : 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text color={c.accent} size={13}>Next</Text><Feather name="chevron-right" size={16} color={c.accent} />
              </Pressable>
            </Row>
          )}
          <Text faint size={11} style={{ textAlign: 'center' }}>{shown.length} action{shown.length === 1 ? '' : 's'}</Text>
        </>
      )}
    </Screen>
  );
}
