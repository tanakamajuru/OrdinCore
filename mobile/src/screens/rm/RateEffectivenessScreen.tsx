import React, { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { api } from '@/api/client';
import { useApi } from '@/api/useApi';
import { RootStackParams } from '@/navigation/types';
import { Screen, Row, Label, Text, TextArea, Button, Banner, Card, Chip } from '@/components/ui';

// The doctrine test: completion proves activity, not impact. Rating records whether the control
// actually reduced the risk — so the RM must see WHAT WAS DONE before judging it, and a control that
// did not work gets a date to come back and re-check.
const OUTCOMES: { v: string; sub: string; tone: 'low' | 'mod' | 'crit' | 'ghost' }[] = [
  { v: 'Effective', sub: 'The risk reduced', tone: 'low' },
  { v: 'Partially Effective', sub: 'Some improvement', tone: 'mod' },
  { v: 'Not Effective', sub: 'No change / worse', tone: 'crit' },
  { v: 'Too Early To Assess', sub: 'Needs more time', tone: 'ghost' },
];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const prettyDate = (s: string) => { const d = new Date(`${s}T12:00:00Z`); return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };

export function RateEffectivenessScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { action } = useRoute<RouteProp<RootStackParams, 'RateEffectiveness'>>().params;

  // Pull the full effectiveness context for THIS action so the RM sees what was actually done before
  // rating it (the list/param may only carry a title).
  const pending = useApi<any[]>('/actions/pending-effectiveness');
  const ctx = useMemo(() => {
    const list = (pending.data as any)?.items || pending.data || [];
    const found = Array.isArray(list) ? list.find((a: any) => String(a.id) === String(action.id)) : null;
    return { ...(found || {}), ...action };
  }, [pending.data, action]);

  const [outcome, setOutcome] = useState('Effective');
  const [evidence, setEvidence] = useState('');
  const [intended, setIntended] = useState('');
  const [nextReview, setNextReview] = useState('');
  const [busy, setBusy] = useState(false);

  const needsEvidence = outcome !== 'Too Early To Assess';
  const needsNextDate = outcome === 'Not Effective' || outcome === 'Too Early To Assess';
  // The backend requires an intended outcome on record before a rating; collect it only if missing.
  const hasIntended = String(ctx.intended_outcome || '').trim().length >= 10;
  const whatWasDone = ctx.completion_evidence || ctx.completion_rationale || ctx.completion_note || ctx.description || null;
  const sourceSignal = ctx.source_signal_description || ctx.source_immediate_action || null;
  const toneColor = (t: string) => (t === 'low' ? c.sevLow : t === 'mod' ? c.sevMod : t === 'crit' ? c.sevCrit : c.muted);

  const submit = async () => {
    if (needsEvidence && evidence.trim().length < 20) {
      Alert.alert('Add evidence', 'Record what tells you this (at least 20 characters).');
      return;
    }
    if (!hasIntended && intended.trim().length < 10) {
      Alert.alert('Intended outcome', 'Record what this control was meant to achieve (at least 10 characters).');
      return;
    }
    if (needsNextDate && !nextReview) {
      Alert.alert('Set a review date', outcome === 'Not Effective'
        ? 'Set a date to come back and re-check whether the revised control works.'
        : 'Too Early to Assess needs a future date to reassess.');
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/actions/${action.id}/effectiveness`, {
        outcome,
        evidence: evidence.trim(),
        ...(hasIntended ? {} : { intended_outcome: intended.trim() }),
        ...(nextReview ? { next_review_date: nextReview } : {}),
      });
      Alert.alert('Recorded', needsNextDate ? `Rating saved. It returns for review on ${prettyDate(nextReview)}.` : 'The rating moves the risk trajectory.');
      nav.goBack();
    } catch (e: any) {
      Alert.alert("Couldn't rate", e?.message || 'Only a Registered Manager can rate a completed action.');
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Text weight="600">{ctx.title || action.title}</Text>
      <Text muted size={12}>Did it actually reduce the risk?</Text>

      {/* What was done — the RM must see the actual work before judging impact. */}
      <Card>
        <Label>What was done</Label>
        {whatWasDone
          ? <Text size={13}>{whatWasDone}</Text>
          : <Text muted size={12}>No completion notes recorded on this action.</Text>}
        {(ctx.house_name || ctx.completed_by_name) && (
          <Text muted size={11} style={{ marginTop: 4 }}>
            {[ctx.house_name, ctx.completed_by_name ? `completed by ${ctx.completed_by_name}` : null].filter(Boolean).join(' · ')}
          </Text>
        )}
        {sourceSignal && <Text muted size={11} style={{ marginTop: 4 }}>Concern: {sourceSignal}</Text>}
        {hasIntended && <Text muted size={11} style={{ marginTop: 4 }}>Intended: {ctx.intended_outcome}</Text>}
      </Card>

      {!hasIntended && (
        <>
          <Label>What was this control meant to achieve? · min 10 chars</Label>
          <TextArea value={intended} onChangeText={setIntended} placeholder="The intended outcome this control was expected to deliver." minHeight={56} required />
        </>
      )}

      <Label>Outcome</Label>
      {OUTCOMES.map((o) => {
        const on = outcome === o.v;
        const col = toneColor(o.tone);
        return (
          <Pressable key={o.v} onPress={() => setOutcome(o.v)} style={{
            flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: on ? col + '18' : c.card,
            borderWidth: 1, borderColor: on ? col : c.line, borderRadius: 12, padding: 12,
          }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: on ? col : c.line, backgroundColor: on ? col : 'transparent' }} />
            <View style={{ flex: 1 }}>
              <Text size={13} weight="600">{o.v}</Text>
              <Text muted size={11}>{o.sub}</Text>
            </View>
          </Pressable>
        );
      })}

      {needsEvidence && (
        <>
          <Label>Evidence · min 20 chars</Label>
          <TextArea value={evidence} onChangeText={setEvidence} placeholder="What tells you this? (observations, pulse counts, incidents…)" required minHeight={70} />
        </>
      )}

      {needsNextDate && (
        <>
          <Label>{outcome === 'Not Effective' ? 'Come back and re-check on' : 'Reassess on'}</Label>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {[['In 1 week', 7], ['In 2 weeks', 14], ['In 30 days', 30]].map(([lbl, n]) => (
              <Chip key={lbl as string} label={lbl as string} active={nextReview === inDays(n as number)} onPress={() => setNextReview(inDays(n as number))} />
            ))}
          </Row>
          {!!nextReview && <Text muted size={12} style={{ marginTop: 4 }}>Next review: {prettyDate(nextReview)}</Text>}
        </>
      )}

      {outcome === 'Not Effective' && (
        <Banner tone="warn" icon="alert-triangle">Two consecutive "Not Effective" ratings re-escalate this risk.</Banner>
      )}

      <Button title="Record rating" onPress={submit} loading={busy} />
      <Row gap={6} style={{ justifyContent: 'center' }}>
        <Feather name="trending-up" size={12} color={c.muted} />
        <Text muted size={11}>Feeds the one computed trajectory</Text>
      </Row>
    </Screen>
  );
}
