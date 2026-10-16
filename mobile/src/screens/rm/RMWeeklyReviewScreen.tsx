import React, { useState, useEffect } from 'react';
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
  // unwrap the RESPONSE BODY (ov.data), never the hook object — a null body otherwise falls
  // through to the truthy hook and `summary` reads undefined, crashing on first render.
  const data = unwrap(ov.data) || {};
  const services: any[] = data.services || [];
  const summary = data.summary || { completed: 0, total: 0 };
  const period = data.period || null;
  const dueDay = period?.due ? new Date(period.due).toLocaleDateString('en-GB', { weekday: 'long' }) : '';

  const [tab, setTab] = useState<'outstanding' | 'submitted' | 'all'>('outstanding');
  const [editing, setEditing] = useState<{ houseId: string; houseName: string; week: string; reviewId: string | null } | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  // Editor state (simple mobile finalise; full evidence review remains on web).
  const hid = editing?.houseId || '';
  const week = editing?.week || '';
  const reviewId = editing?.reviewId || '';
  const preview = useApi<any>(editing && !reviewId ? `/weekly-reviews/preview?house_id=${hid}&week_ending=${week}` : null, [hid, week, reviewId]);
  // Weekly draft save/restore correction (11 Oct 2026): an existing in-progress review must be
  // loaded by its own id and its saved content restored into the editor — not cleared.
  const existing = useApi<any>(reviewId ? `/weekly-reviews/${reviewId}` : null, [reviewId]);
  const [interpretation, setInterpretation] = useState(''); const [position, setPosition] = useState('Stable');
  const [narrative, setNarrative] = useState(''); const [lessons, setLessons] = useState(''); const [ahead, setAhead] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!reviewId) return;
    const row = unwrap(existing.data);
    if (!row) return;
    const content = row.content || {};
    setInterpretation(String(content.step8_interpretation || ''));
    setPosition(String(content.step14_overall_position || 'Stable'));
    setNarrative(String(content.step15_narrative || ''));
    setLessons(String(content.lessons_learnt || ''));
    setAhead(String(content.anticipated_risks?.rm_note || ''));
    setDraftSavedAt(row.updated_at || null);
  }, [reviewId, existing.data]);

  const openService = (s: any) => {
    if ((s.state === 'COMPLETED' || s.state === 'AWAITING_VALIDATION') && s.review_id) { nav.navigate('TLWeeklyReviewDetail', { id: s.review_id }); return; }
    const hasDraft = s.state === 'IN_PROGRESS' && s.review_id;
    if (!hasDraft) { setInterpretation(''); setPosition('Stable'); setNarrative(''); setLessons(''); setAhead(''); setDraftSavedAt(null); }
    setEditing({ houseId: s.house_id, houseName: s.house_name, week: String(s.week_ending).slice(0, 10), reviewId: hasDraft ? s.review_id : null });
  };

  // Persist the draft without finalising — the required explicit Save draft control. Reuses the
  // same upsert-by-house/week endpoint, so retries/leaving-and-returning never create a duplicate.
  const saveDraft = async (): Promise<string | null> => {
    setBusy(true);
    try {
      const base = reviewId ? (unwrap(existing.data)?.content || {}) : (preview.data?.content || preview.data?.data?.content || preview.data?.data || preview.data || {});
      const saved: any = await api.post('/weekly-reviews', { house_id: hid, week_ending: week, step_reached: 15, status: 'draft', content: { ...base, step8_interpretation: interpretation.trim(), step14_overall_position: position, step15_narrative: narrative.trim(), lessons_learnt: lessons.trim(), anticipated_risks: { ...(base.anticipated_risks || {}), rm_note: ahead.trim() } } });
      setDraftSavedAt(new Date().toISOString());
      if (!reviewId && saved?.id) setEditing(e => e ? { ...e, reviewId: saved.id } : e);
      return saved?.id || reviewId || null;
    } catch (e: any) { Alert.alert("Couldn't save draft", e?.message || 'Your text is preserved on screen — try again.'); return null; }
    finally { setBusy(false); }
  };

  const finalise = async () => {
    if (interpretation.trim().length < 20 || narrative.trim().length < 40 || lessons.trim().length < 20 || ahead.trim().length < 10) {
      Alert.alert('Complete the review', 'Interpretation and lessons need 20 characters, narrative 40, and the week-ahead note 10.'); return;
    }
    const savedId = await saveDraft();
    if (!savedId) return;
    setBusy(true);
    try {
      await api.post(`/weekly-reviews/${savedId}/finalise`, {});
      Alert.alert('Weekly review finalised', 'It is locked for RM editing and awaiting independent validation.');
      setEditing(null); ov.refetch();
    } catch (e: any) { Alert.alert("Couldn't finalise", e?.message || 'Your draft has been saved — try finalising again.'); }
    finally { setBusy(false); }
  };

  if (ov.loading && !ov.data) return <Screen><Loading /></Screen>;

  // ── Editor ────────────────────────────────────────────────────────────────
  if (editing) {
    if (reviewId && existing.loading && !existing.data) return <Screen><Loading /></Screen>;
    return <Screen refreshing={preview.loading} onRefresh={preview.refetch}>
      <BoardHeader title="Weekly Governance Review" subtitle={`${editing.houseName} · week ending ${fmtD(editing.week)}`} />
      <Button title="← Back to services" tone="ghost" onPress={() => setEditing(null)} />
      {existing.error ? <ErrorNote message={existing.error} onRetry={existing.refetch} />
        : preview.error ? <ErrorNote message={preview.error} onRetry={preview.refetch} />
        : <Card><Text size={12} muted>Evidence is populated by the same weekly review service used by the web app. Your interpretation below is your own signed account. The full evidence review is available on the web app.</Text></Card>}
      {draftSavedAt && <Text size={11.5} muted>Draft last saved {new Date(draftSavedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>}
      <Label>What we knew and what it means</Label><TextArea value={interpretation} onChangeText={setInterpretation} placeholder="Leadership interpretation…" minHeight={80} required />
      <Label>Overall position</Label><Row gap={6}>{['Stable', 'Watch', 'Concern'].map(v => <Chip key={v} label={v} active={position === v} onPress={() => setPosition(v)} />)}</Row>
      <Label>Governance narrative</Label><TextArea value={narrative} onChangeText={setNarrative} placeholder="What we knew, what we did and the current position…" minHeight={110} required />
      <Label>Lessons learnt</Label><TextArea value={lessons} onChangeText={setLessons} placeholder="What was learnt this week…" minHeight={75} required />
      <Label>Week ahead</Label><TextArea value={ahead} onChangeText={setAhead} placeholder="Anticipated risks, or why none are anticipated…" minHeight={75} required />
      <Row gap={8}>
        <Button title="Save draft" tone="ghost" onPress={() => saveDraft()} loading={busy} disabled={!hid} />
        <Button title="Finalise for validation" onPress={finalise} loading={busy} disabled={!hid} />
      </Row>
    </Screen>;
  }

  // ── Status-first service list ───────────────────────────────────────────────
  // Awaiting-validation vs completed correction (11-16 Oct 2026): AWAITING_VALIDATION has left
  // the RM's writing queue (it no longer needs RM text) but it has NOT been validated — it must
  // never be folded into "Completed" wording, or a required Director approval reads as finished.
  const isOutstanding = (s: any) => s.state === 'NOT_STARTED' || s.state === 'IN_PROGRESS';
  const isAwaitingValidation = (s: any) => s.state === 'AWAITING_VALIDATION';
  const isCompleted = (s: any) => s.state === 'COMPLETED';
  const isSubmitted = (s: any) => isAwaitingValidation(s) || isCompleted(s);
  const shown = tab === 'outstanding' ? services.filter(isOutstanding) : tab === 'submitted' ? services.filter(isSubmitted) : services;

  return <Screen refreshing={ov.loading} onRefresh={ov.refetch}>
    <BoardHeader title="Weekly Review" subtitle={period ? `Reporting ${fmtD(period.start)} – ${fmtD(period.end)}${dueDay ? ` · due ${dueDay}` : ''}` : 'Review each service once for this reporting period'} />
    {ov.error ? <ErrorNote message={ov.error} onRetry={ov.refetch} /> : null}
    <Row gap={6} style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        <Chip label={`Outstanding · ${services.filter(isOutstanding).length}`} active={tab === 'outstanding'} onPress={() => setTab('outstanding')} />
        <Chip label={`Submitted · ${services.filter(isSubmitted).length}`} active={tab === 'submitted'} onPress={() => setTab('submitted')} />
        <Chip label={`All · ${services.length}`} active={tab === 'all'} onPress={() => setTab('all')} />
      </Row>
      <Text size={12.5} weight="700" color="#28633f">{summary.completed} of {summary.total} completed{services.filter(isAwaitingValidation).length > 0 ? ` · ${services.filter(isAwaitingValidation).length} awaiting validation` : ''}</Text>
    </Row>
    {shown.length === 0 ? (
      <Card><Text muted>{tab === 'outstanding' ? 'No outstanding weekly reviews for this period. Submitted reviews are under the Submitted tab.' : 'No weekly review for this period in this view.'}</Text></Card>
    ) : shown.map((s: any) => {
      const m = STATE_META[s.state] || STATE_META.NOT_STARTED;
      const meta = `Week ending ${fmtD(s.week_ending)}${s.reviewer_name ? ` · ${s.reviewer_name}` : ''}`;
      return <ListItem key={s.house_id} icon="file-text" title={s.house_name} meta={meta}
        right={<Pill tone={s.overdue ? 'crit' : m.tone}>{s.overdue ? `Overdue · ${m.label}` : m.label}</Pill>}
        onPress={() => openService(s)} />;
    })}
  </Screen>;
}
