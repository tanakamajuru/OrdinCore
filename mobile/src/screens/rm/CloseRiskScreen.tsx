import React, { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { api } from '@/api/client';
import { RootStackParams } from '@/navigation/types';
import { Screen, Row, Label, Text, TextArea, Button } from '@/components/ui';

// Exact verdict strings the API accepts (backend risks.service.closeRisk).
const VERDICTS = [
  { v: 'Resolved — controls effective', note: 'Requires a control rated effective' },
  { v: 'Resolved — no longer applicable' },
  { v: 'Tolerated — risk accepted' },
];

export function CloseRiskScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { risk } = useRoute<RouteProp<RootStackParams, 'CloseRisk'>>().params;
  const [verdict, setVerdict] = useState(VERDICTS[0].v);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<any>(null);

  // Chapter 6 — the four-question Risk Review, derived from evidence. Closure is blocked
  // until the risk has genuinely reduced (backend enforces the same gate).
  useEffect(() => {
    api.get(`/risks/${risk.id}/closure-review`).then(setReview).catch(() => setReview(null));
  }, [risk.id]);

  const close = async () => {
    if (reason.trim().length < 20) { Alert.alert('Add a rationale', 'A closure rationale of at least 20 characters is required.'); return; }
    if (review && !review.eligible) { Alert.alert('Not ready to close', (review.blockers || []).join(' ') || 'The risk has not reduced enough to close.'); return; }
    setBusy(true);
    try {
      await api.post(`/risks/${risk.id}/close`, { verdict, reason: reason.trim() });
      Alert.alert('Risk closed', 'Locked, with a 60-day recurrence watch. Reopening needs a reason.');
      nav.goBack();
    } catch (e: any) {
      Alert.alert("Couldn't close", e?.message || 'The verdict is checked against the evidence on the server.');
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Text weight="600">{risk.title || 'Risk'}</Text>

      {/* Risk Review — the four evidence questions that gate closure. */}
      {review && (
        <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 12, marginTop: 10 }}>
          <Text size={11} weight="700" muted style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Risk Review</Text>
          {[
            ['All required actions complete?', review.questions?.actions_complete, `${review.detail?.actions_open ?? 0} open`],
            ['Interventions effective?', review.questions?.interventions_effective, `${review.detail?.effective_controls ?? 0} rated`],
            ['Trajectory improved?', review.questions?.trajectory_improved, `${review.detail?.signals_last_14d ?? 0} vs ${review.detail?.signals_prior_14d ?? 0}`],
            ['New signals stopped?', review.questions?.no_recurring_signals, `${review.detail?.signals_last_14d ?? 0} in 14d`],
          ].map(([q, ok, detail]: any, i: number) => (
            <Row key={i} style={{ justifyContent: 'space-between', paddingVertical: 3 }}>
              <Text size={12.5} style={{ flex: 1 }}>{q}</Text>
              <Text size={11} weight="600" color={ok ? c.sevLow : c.sevHigh}>{ok ? '✓' : '!'} {detail}</Text>
            </Row>
          ))}
          {(review.blockers?.length > 0) && <Text size={11} color={c.sevCrit} style={{ marginTop: 6 }}>{review.blockers.join(' ')}</Text>}
          {review.eligible && <Text size={11} color={c.sevLow} style={{ marginTop: 6 }}>Eligible to close with a verdict.</Text>}
        </View>
      )}

      <Label>Resolution verdict</Label>
      {VERDICTS.map((o) => {
        const on = verdict === o.v;
        return (
          <Pressable key={o.v} onPress={() => setVerdict(o.v)} style={{
            flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: on ? c.accentTint : c.card,
            borderWidth: 1, borderColor: on ? c.accent : c.line, borderRadius: 12, padding: 11,
          }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent', marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text size={12.5} weight="600">{o.v}</Text>
              {!!o.note && <Text muted size={11} style={{ marginTop: 2 }}>{o.note}</Text>}
            </View>
          </Pressable>
        );
      })}

      <Label>Rationale · min 20 chars</Label>
      <TextArea value={reason} onChangeText={setReason} placeholder="Why the risk is safe to close…" required minHeight={64} />

      <Button title="Close risk" onPress={close} loading={busy} disabled={!!review && !review.eligible} />
      <Row gap={6} style={{ justifyContent: 'center' }}>
        <Feather name="lock" size={12} color={c.muted} />
        <Text muted size={11} style={{ textAlign: 'center' }}>Locked on close · 60-day recurrence watch · "controls effective" needs a rated control</Text>
      </Row>
    </Screen>
  );
}
