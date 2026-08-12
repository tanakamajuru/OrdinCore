import React, { useState } from 'react';
import { useApi } from '@/api/useApi';
import { Screen, Row, Chip, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, StatusList, BoardItem } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.escalations || []);
const ago = (x?: string) => {
  if (!x) return '';
  const days = Math.floor((Date.now() - new Date(x).getTime()) / 86400000);
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
};

export function TLEscalationsScreen() {
  const { data, loading, error, refetch } = useApi<any>('/escalations?limit=200');
  const [tab, setTab] = useState<'open' | 'overdue'>('open');
  const all = arr(data);
  const open = all.filter((e) => (e.lifecycle_status || '') !== 'Closed');
  const overdue = open.filter((e) => e.overdue);
  const shown = tab === 'overdue' ? overdue : open;
  const items: BoardItem[] = shown.map((e) => {
    const sev = String(e.priority || e.severity || '');
    const raised = ago(e.created_at || e.escalated_at);
    // Design: each escalation states what's expected + how urgent.
    const meta = [e.house_name, sev, raised ? `raised ${raised}` : ''].filter(Boolean).join(' · ');
    return {
      title: e.risk_title || e.reason || 'Escalation',
      meta,
      value: e.overdue ? 'Overdue' : 'Awaiting response',
      tone: e.overdue ? 'red' : 'amber',
    };
  });

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Escalations" />
      <Row gap={7}>
        <Chip label={`Open (${open.length})`} active={tab === 'open'} onPress={() => setTab('open')} />
        <Chip label={`Overdue (${overdue.length})`} active={tab === 'overdue'} onPress={() => setTab('overdue')} />
      </Row>
      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <StatusList items={items} button="View all" empty="No escalations here." />
      )}
    </Screen>
  );
}
