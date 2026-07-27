import React from 'react';
import { useApi } from '@/api/useApi';
import { Screen, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, Metrics, SectionTitle, StatusList, BoardItem } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.houses || v?.staff || v?.pulses || v?.actions || []);
const isDone = (a: any) => /complete|done|cancel/i.test(a.status || '');
const isOverdue = (a: any) => /overdue/i.test(a.status || '');
const prettyRole = (r?: string) => String(r || 'Team member').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

export function TLTeamOverviewScreen() {
  const houses = useApi<any>('/houses');
  const house = arr(houses.data)[0] || null;
  const staff = useApi<any>(house?.id ? `/houses/${house.id}/staff` : null, [house?.id]);
  const sig = useApi<any>('/pulses?limit=200');
  const act = useApi<any>('/actions/my');
  const loading = houses.loading && !houses.data;

  const team = arr(staff.data);
  const actions = arr(act.data);
  const items: BoardItem[] = team.map((m) => ({
    title: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email,
    meta: prettyRole(m.role_in_house || m.role),
    tone: 'green',
  }));

  if (loading) return <Screen><Loading /></Screen>;
  if (houses.error) return <Screen><ErrorNote message={houses.error} onRetry={houses.refetch} /></Screen>;
  return (
    <Screen refreshing={houses.loading} onRefresh={() => { houses.refetch(); staff.refetch(); sig.refetch(); act.refetch(); }}>
      <BoardHeader title="Team Overview" subtitle={house?.name || 'Your service'} />
      <Metrics items={[
        { value: arr(sig.data).length, label: 'Active signals' },
        { value: actions.filter((a) => !isDone(a)).length, label: 'Open actions', tone: 'amber' },
        { value: actions.filter(isOverdue).length, label: 'Overdue', tone: 'red' },
      ]} />
      <SectionTitle>Team members</SectionTitle>
      <StatusList items={items} button="View rota" empty="No staff assigned." />
    </Screen>
  );
}
