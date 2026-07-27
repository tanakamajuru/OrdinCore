import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { Screen, Row, Chip, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, StatusList, BoardItem, Tone } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.actions || v?.data || []);
const isDone = (a: any) => /complete|done|cancel/i.test(a.status || '');

// Relative due label + tone (matches the reference: red = today/overdue, amber = soon, green = done).
function due(a: any): { text: string; tone: Tone } {
  if (isDone(a)) return { text: 'Done', tone: 'green' };
  if (!a.due_date) return { text: '—', tone: 'neutral' };
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(new Date(a.due_date)) - day(new Date())) / 86400000);
  if (diff < 0) return { text: `Overdue ${Math.abs(diff)}d`, tone: 'red' };
  if (diff === 0) return { text: 'Due today', tone: 'red' };
  if (diff === 1) return { text: 'Due tomorrow', tone: 'amber' };
  return { text: `${diff} days left`, tone: diff <= 3 ? 'amber' : 'green' };
}

export function SWMyActionsScreen() {
  const nav = useNavigation<any>();
  const { data, loading, error, refetch } = useApi<any>('/actions/my');
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  const all = arr(data);
  const todo = all.filter((a) => !isDone(a));
  const done = all.filter(isDone);
  const shown = tab === 'todo' ? todo : done;

  const items: BoardItem[] = shown.map((a) => {
    const d = due(a);
    return {
      title: a.title,
      meta: [a.related_person || a.house_name || a.risk_title, d.text].filter(Boolean).join(' · '),
      tone: d.tone,
      onPress: () => nav.navigate('ActionDetail', { action: a }),
    };
  });

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="My Actions" />
      <Row gap={7}>
        <Chip label={`To do (${todo.length})`} active={tab === 'todo'} onPress={() => setTab('todo')} />
        <Chip label="Done" active={tab === 'done'} onPress={() => setTab('done')} />
      </Row>
      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <StatusList items={items} empty={tab === 'done' ? 'Nothing completed yet.' : 'All caught up.'} />
      )}
    </Screen>
  );
}
