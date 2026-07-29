import React from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useApi } from '@/api/useApi';
import { Screen, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, StatusList, BoardItem, Tone } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.escalations || []);
const isClosed = (e: any) => /resolved|closed/i.test(String(e.lifecycle_status || e.status || ''));
const ago = (x?: string) => {
  if (!x) return '';
  const d = Math.floor((Date.now() - new Date(x).getTime()) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`;
};

/** The escalations this Support Worker has raised to their Team Leader, and where they stand. */
export function SWEscalationsScreen() {
  const { user } = useAuth();
  const uid = user?.id || user?.user_id;
  const { data, loading, error, refetch } = useApi<any>('/escalations?limit=200');
  const mine = arr(data).filter((e) => e.escalated_by === uid);

  const items: BoardItem[] = mine.map((e) => ({
    title: e.risk_title || e.reason || 'Escalation',
    meta: `${e.house_name || ''}${e.created_at ? ` · raised ${ago(e.created_at)}` : ''} · ${e.lifecycle_status || e.status || 'Open'}`,
    tone: (isClosed(e) ? 'green' : e.overdue ? 'red' : 'amber') as Tone,
  }));

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="My Escalations" subtitle="Raised to your Team Leader" />
      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <StatusList items={items} empty="You haven't escalated anything yet. Open a signal and tap Escalate to Team Leader." />
      )}
    </Screen>
  );
}
