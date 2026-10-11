import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { Screen, Row, Label, Chip, TextArea, Button, Card, Text, Loading, ErrorNote, Pill, ListItem } from '@/components/ui';
import { BoardHeader } from '@/components/board';

// "Show the work first": the RM lands on a per-service status list for the current reporting period
// (one review per service-period, so completing one never removes the others). Tapping an
// outstanding service opens the mobile review editor; a completed/submitted one opens the signed
// read-only review.
const unwrap = (v: any): any => v?.data?.data ?? v?.data ?? v;
const fmtD = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const STATE_META: Record<string, { label: string; tone: 'low' | 'mod' | 'crit' | 'ghost' }> = {
  NOT_STARTED: { label: 'Not started', tone: 'ghost' },
  IN_PROGRESS: { label: 'In progress', tone: 'mod' },
  AWAITING_VALIDATION: { label: 'Submitted – awaiting validation', tone: 'mod' },
  COMPLETED: { label: 'Completed', tone: 'low' },
};

export function RMWeeklyReviewScreen() {
  const nav = useNavigation<any>();
  const ov = useApi<any>('/weekly-reviews/overview');
  const data = unwrap(ov) || { services: [], summary: { completed: 0, total: 0 }, period: null };
  const services: any[] = data.services || [];
  const period = data.period;
  const dueDay = period?.due ? new Date(period.due).toLocaleDateString('en-GB', { weekday: 'long' }) : '';

  const [tab, setTab] = useState<'outstanding' | 'completed' | 'all'>('outstanding');
  const [editing, setEditing] = useState<{ houseId: string; houseName: string; week: string } | null>(null);

  // Editor state (simple mobile finalise; full evidence review remains on web).
  const hid = editing?.houseId || '';
  const week = editing?.week || '';
  const preview = useApi<any>(editing ? `/weekly-reviews/preview?house_id=${hid}&week_ending=${week}` : null, [hid, week]);
  const [interpretation, setInterpretation] = useState(''); const [position, setPosition] = useState('Stable');
  const [narrative, setNarrative] = useState(''); const [lessons, setLessons] = useState(''); const [ahead, setAhead] = useState(''); const [busy, setBusy] = useState(false);

  const openService = (s: any) => {
    if ((s.state === 'COMPLETED' || s.state === 'AWAITING_VALIDATION') && s.review_id) { nav.navigate('TLWeeklyReviewDetail', { id: s.review_id }); return; }
    setInterpretation(''); setPosition('Stable'); setNarrative(''); setLessons(''); setAhead('');
    setEditing({ houseId: s.house_id, houseName: s.house_name, week: String(s.week_ending).slice(0, 10) });
  };

  const finalise = async () => {
    if (interpretation.trim().length < 20 || narrative.trim().length < 40 || lessons.trim().length < 20 || ahead.trim().length < 10) {
      Alert.alert('Complete the review', 'Interpretation and lessons need 20 characters, narrative 40, and the week-ahead note 10.'); return;
    }
    setBusy(true);
    try {
      const base = preview.data?.content || preview.data?.data?.content || preview.data?.data || preview.data || {};
      const saved: any = await api.post('/weekly-reviews', { house_id: hid, week_ending: week, step_reached: 15, status: 'draft', content: { ...base, step8_interpretation: interpretation.trim(), step14_overall_position: position, step15_narrative: narrative.trim(), lessons_learnt: lessons.trim(), anticipated_risks: { ...(base.anticipated_risks || {}), rm_note: ahead.trim() } } });
      await api.post(`/weekly-reviews/${saved.id}/finalise`, {});
      Alert.alert('Weekly review finalised', 'It is locked for RM editing and awaiting independent validation.');
      setEditing(null); ov.refetch();
    } catch (e: any) { Alert.alert("Couldn't finalise", e?.message || 'Try again.'); }
    finally { setBusy(false); }
  };

  if (ov.loading && !ov.data) return <Screen><Loading /></Screen>;

  // ── Editor ────────────────────────────────────────────────────────────────
  if (editing) {
    return <Screen refreshing={preview.loading} onRefresh={preview.refetch}>
      <BoardHeader title="Weekly Governance Review" subtitle={`${editing.houseName} · week ending ${fmtD(editing.week)}`} />
      <Button title="← Back to services" tone="ghost" onPress={() => setEditing(null)} />
      {preview.error ? <ErrorNote message={preview.error} onRetry={preview.refetch} /> : <Card><Text size={12} muted>Evidence is populated by the same weekly review service used by the web app. Your interpretation below is your own signed account. The full evidence review is available on the web app.</Text></Card>}
      <Label>What we knew and what it means</Label><TextArea value={interpretation} onChangeText={setInterpretation} placeholder="Leadership interpretation…" minHeight={80} required />
      <Label>Overall position</Label><Row gap={6}>{['Stable', 'Watch', 'Concern'].map(v => <Chip key={v} label={v} active={position === v} onPress={() => setPosition(v)} />)}</Row>
      <Label>Governance narrative</Label><TextArea value={narrative} onChangeText={setNarrative} placeholder="What we knew, what we did and the current position…" minHeight={110} required />
      <Label>Lessons learnt</Label><TextArea value={lessons} onChangeText={setLessons} placeholder="What was learnt this week…" minHeight={75} required />
      <Label>Week ahead</Label><TextArea value={ahead} onChangeText={setAhead} placeholder="Anticipated risks, or why none are anticipated…" minHeight={75} required />
      <Button title="Finalise for validation" onPress={finalise} loading={busy} disabled={!hid} />
    </Screen>;
  }

  // ── Status-first service list ───────────────────────────────────────────────
  const isOutstanding = (s: any) => s.state === 'NOT_STARTED' || s.state === 'IN_PROGRESS';
  const isDone = (s: any) => s.state === 'COMPLETED' || s.state === 'AWAITING_VALIDATION';
  const shown = tab === 'outstanding' ? services.filter(isOutstanding) : tab === 'completed' ? services.filter(isDone) : services;

  return <Screen refreshing={ov.loading} onRefresh={ov.refetch}>
    <BoardHeader title="Weekly Review" subtitle={period ? `Reporting ${fmtD(period.start)} – ${fmtD(period.end)}${dueDay ? ` · due ${dueDay}` : ''}` : 'Review each service once for this reporting period'} />
    {ov.error ? <ErrorNote message={ov.error} onRetry={ov.refetch} /> : null}
    <Row gap={6} style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        <Chip label={`Outstanding · ${services.filter(isOutstanding).length}`} active={tab === 'outstanding'} onPress={() => setTab('outstanding')} />
        <Chip label={`Completed · ${services.filter(isDone).length}`} active={tab === 'completed'} onPress={() => setTab('completed')} />
        <Chip label={`All · ${services.length}`} active={tab === 'all'} onPress={() => setTab('all')} />
      </Row>
      <Text size={12.5} weight="700" color="#28633f">{data.summary.completed} of {data.summary.total} completed</Text>
    </Row>
    {shown.length === 0 ? (
      <Card><Text muted>{tab === 'outstanding' ? 'No outstanding weekly reviews for this period. Completed and submitted reviews are under the Completed tab.' : 'No weekly review for this period in this view.'}</Text></Card>
    ) : shown.map((s: any) => {
      const m = STATE_META[s.state] || STATE_META.NOT_STARTED;
      const meta = `Week ending ${fmtD(s.week_ending)}${s.reviewer_name ? ` · ${s.reviewer_name}` : ''}`;
      return <ListItem key={s.house_id} icon="file-text" title={s.house_name} meta={meta}
        right={<Pill tone={s.overdue ? 'crit' : m.tone}>{s.overdue ? `Overdue · ${m.label}` : m.label}</Pill>}
        onPress={() => openService(s)} />;
    })}
  </Screen>;
}
