import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { Screen, Card, TextArea, Row, Button, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, StatusList, BoardButton, BoardItem, Tone } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.notes || []);
const when = (x?: string) => (x ? new Date(x).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const catTone = (cat?: string): Tone => (cat === 'handover' ? 'purple' : cat === 'shift' ? 'red' : 'blue');

export function TLNotesScreen() {
  const { data, loading, error, refetch } = useApi<any>('/notes');
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const notes = arr(data);

  const items: BoardItem[] = notes.map((n) => ({
    title: n.note,
    meta: `${n.author_name || 'Team'} · ${when(n.created_at)}`,
    tone: catTone(n.category),
  }));

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.post('/notes', { note: text.trim(), category: 'handover' });
      setText(''); setComposing(false); refetch();
    } catch (e: any) {
      Alert.alert("Couldn't add note", e?.message || 'Try again when back online.');
    } finally { setBusy(false); }
  };

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Notes" subtitle="Your service" />

      {composing && (
        <Card>
          <TextArea value={text} onChangeText={setText} placeholder="Add a note for the team…" minHeight={70} />
          <Row gap={8} style={{ marginTop: 10 }}>
            <Button title="Cancel" tone="ghost" onPress={() => { setComposing(false); setText(''); }} style={{ flex: 1 }} />
            <Button title="Add" icon="check" onPress={add} loading={busy} style={{ flex: 1 }} />
          </Row>
        </Card>
      )}

      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <StatusList items={items} empty="No notes yet — add the first." />
      )}

      {!composing && <BoardButton label="New note" icon="plus" onPress={() => setComposing(true)} />}
    </Screen>
  );
}
