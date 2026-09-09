import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { Screen, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, StatusList, BoardItem, Tone } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.actions || []);
const isDone = (a: any) => /complete|done|cancel/i.test(a.status || '');
const isOverdue = (a: any) => /overdue/i.test(a.status || '') || (a.due_date && new Date(a.due_date) < new Date() && !isDone(a));
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '');

/**
 * Oversight actions list. Two lenses, each backed by the SAME query the dashboard count uses, so
 * the number you tapped equals the list you land on:
 *  - 'oversight'     → /actions/oversight            (every open action in the service)
 *  - 'effectiveness' → /actions/pending-effectiveness (completed controls awaiting a verdict)
 */
export function RMActionsListScreen() {
  const nav = useNavigation<any>();
  const lens: 'oversight' | 'effectiveness' = ((useRoute().params as any)?.lens) || 'oversight';
  const effectiveness = lens === 'effectiveness';
  const { data, loading, error, refetch } = useApi<any>(effectiveness ? '/actions/pending-effectiveness' : '/actions/oversight');
  const rows = arr(data);

  const items: BoardItem[] = rows.map((a) => {
    const meta = [a.risk_title || a.house_name, a.assigned_to_name && `owner ${a.assigned_to_name}`,
      effectiveness ? (a.completed_at ? `completed ${fmt(a.completed_at)}` : '') : (a.due_date ? `due ${fmt(a.due_date)}` : '')]
      .filter(Boolean).join(' · ');
    const tone: Tone = effectiveness ? 'blue' : isOverdue(a) ? 'red' : 'amber';
    return {
      title: a.title || 'Governance action',
      meta,
      value: effectiveness ? 'Rate' : isOverdue(a) ? 'Overdue' : undefined,
      tone,
      // Effectiveness items open the rating screen; open actions open the action record.
      onPress: () => effectiveness ? nav.navigate('RateEffectiveness', { action: a }) : nav.navigate('ActionDetail', { action: a }),
    };
  });

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader
        title={effectiveness ? 'Effectiveness reviews due' : 'Actions'}
        subtitle={effectiveness ? 'Completed controls awaiting an effectiveness verdict' : 'Every open action across your service'}
      />
      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <StatusList items={items} empty={effectiveness ? 'No controls are awaiting an effectiveness verdict.' : 'No open actions.'} />
      )}
    </Screen>
  );
}

export default RMActionsListScreen;
