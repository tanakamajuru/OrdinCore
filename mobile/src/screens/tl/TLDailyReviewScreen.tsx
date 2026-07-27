import React, { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { radius } from '@/theme/tokens';
import { Screen, Text, Row, Label, TextArea, Loading } from '@/components/ui';
import { BoardHeader, BoardButton } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.pulses || v?.actions || v?.escalations || []);
const isSameDay = (x?: string) => !!x && new Date(x).toDateString() === new Date().toDateString();
const isDone = (a: any) => /complete|done|cancel/i.test(a.status || '');
const isOverdue = (a: any) => /overdue/i.test(a.status || '');

export function TLDailyReviewScreen() {
  const { c } = useTheme();
  const sig = useApi<any>('/pulses?limit=200');
  const act = useApi<any>('/actions/my');
  const esc = useApi<any>('/escalations?limit=100');
  const loading = sig.loading && !sig.data;

  const items = [
    { key: 'signals', label: 'Check new signals', count: arr(sig.data).filter((s) => isSameDay(s.entry_date || s.created_at)).length },
    { key: 'actions', label: 'Review actions', count: arr(act.data).filter((a) => !isDone(a)).length },
    { key: 'esc', label: 'Escalations', count: arr(esc.data).filter((e) => (e.lifecycle_status || '') !== 'Closed').length },
    { key: 'overdue', label: 'Overdue actions', count: arr(act.data).filter(isOverdue).length },
  ];

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const doneCount = items.filter((i) => checked[i.key]).length;

  const complete = async () => {
    setBusy(true);
    try {
      const summary = `Daily review — ${items.map((i) => `${i.label.toLowerCase()} (${i.count})`).join(', ')}.${note.trim() ? ` Note: ${note.trim()}` : ''}`;
      await api.post('/notes', { note: summary, category: 'shift' });
      Alert.alert('Review complete', 'Your daily review has been recorded against the house.');
      setChecked({}); setNote('');
    } catch (e: any) {
      Alert.alert("Couldn't record", e?.message || 'Try again when back online.');
    } finally { setBusy(false); }
  };

  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={sig.loading} onRefresh={() => { sig.refetch(); act.refetch(); esc.refetch(); }}>
      <BoardHeader title="Daily Review" subtitle="Maple House" />

      <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, paddingHorizontal: 13 }}>
        {items.map((it, i) => {
          const on = !!checked[it.key];
          return (
            <Pressable key={it.key} onPress={() => setChecked((s) => ({ ...s, [it.key]: !s[it.key] }))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.lineSoft }}>
              <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: on ? 0 : 1.5, borderColor: c.line, backgroundColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on && <Feather name="check" size={14} color={c.accentInk} />}
              </View>
              <Text size={14} style={{ flex: 1 }} color={on ? c.muted : c.ink}>{it.label}</Text>
              <Text size={13} weight="700">{it.count}</Text>
            </Pressable>
          );
        })}
      </View>

      <Label>My notes</Label>
      <TextArea value={note} onChangeText={setNote} placeholder="Add a note…" minHeight={80} />
      <BoardButton label={doneCount ? `Complete review (${doneCount}/${items.length})` : 'Complete review'} icon="check-circle" onPress={complete} disabled={busy || doneCount === 0} />
    </Screen>
  );
}
