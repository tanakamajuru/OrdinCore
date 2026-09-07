import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { Screen, Row, Chip, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, StatusList, BoardItem, Tone } from '@/components/board';

const arr = (v: any): any[] => Array.isArray(v) ? v : v?.data || v?.pulses || [];
const needsReview = (s: any) => !s.review_status || String(s.review_status).toLowerCase() === 'new';
const tone = (s: any): Tone => /critical|high/i.test(s.severity || '') ? 'red' : /moderate|medium/i.test(s.severity || '') ? 'amber' : 'green';

export function RMSignalQueueScreen() {
  const nav = useNavigation<any>();
  const q = useApi<any>('/pulses?limit=200');
  const [tab, setTab] = useState<'needs'|'monitoring'|'all'>('needs');
  const all = arr(q.data);
  const shown = all.filter((s) => tab === 'needs' ? needsReview(s) : tab === 'monitoring' ? /monitor/i.test(s.review_status || '') : true);
  const items: BoardItem[] = shown.map((s) => ({
    title: `${s.governance_domain || s.category || (Array.isArray(s.risk_domain) ? s.risk_domain[0] : s.risk_domain) || 'Signal'}${s.related_person ? ` · ${s.related_person}` : ''}`,
    meta: [s.house_name, s.description, s.entry_date ? new Date(s.entry_date).toLocaleDateString('en-GB') : ''].filter(Boolean).join(' · '),
    value: needsReview(s) ? 'Decision due' : s.review_status,
    tone: tone(s), onPress: () => nav.navigate('SignalDetail', { id: s.id }),
  }));
  return <Screen refreshing={q.loading} onRefresh={q.refetch}>
    <BoardHeader title="Daily Oversight" subtitle="Signals requiring your governance decision" />
    <Row gap={7}>
      <Chip label={`Decision due (${all.filter(needsReview).length})`} active={tab === 'needs'} onPress={() => setTab('needs')} />
      <Chip label="Monitoring" active={tab === 'monitoring'} onPress={() => setTab('monitoring')} />
      <Chip label="All" active={tab === 'all'} onPress={() => setTab('all')} />
    </Row>
    {q.loading && !q.data ? <Loading /> : q.error ? <ErrorNote message={q.error} onRetry={q.refetch} /> : <StatusList items={items} empty="No signals require a decision." />}
  </Screen>;
}
