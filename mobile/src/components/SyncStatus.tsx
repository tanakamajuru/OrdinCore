import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { queue, QueuedItem } from '@/offline/queue';
import { Text, Row } from '@/components/ui';

// Shows a calm banner whenever signals/updates are queued on the device, with a manual flush.
// Hidden when the queue is empty.
export function SyncStatus() {
  const { c } = useTheme();
  const [items, setItems] = useState<QueuedItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const unsub = queue.subscribe(setItems); return () => { unsub(); }; }, []);

  if (!items.length) return null;

  const sync = async () => { setBusy(true); try { await queue.flush(); } finally { setBusy(false); } };

  return (
    <Row style={{ backgroundColor: c.sevMod + '22', borderRadius: 13, padding: 11 }} gap={10}>
      <Feather name="upload-cloud" size={18} color={c.sevMod} />
      <View style={{ flex: 1 }}>
        <Text weight="600" size={12.5}>{items.length} waiting to sync</Text>
        <Text muted size={11}>Saved on this device — sends automatically when you're online.</Text>
      </View>
      <Pressable onPress={sync} disabled={busy} hitSlop={8}>
        <Text color={c.accent} weight="600" size={12.5}>{busy ? 'Syncing…' : 'Sync now'}</Text>
      </Pressable>
    </Row>
  );
}
