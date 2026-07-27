import React, { useEffect } from 'react';
import { View, Pressable, Image, Linking } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { radius } from '@/theme/tokens';
import { isImageUrl, isAudioUrl } from '@/api/media';
import { SWSignalsStackParams } from '@/navigation/types';
import { Screen, Row, Text, Pill, SeverityPill, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, DetailCard, BoardButton } from '@/components/board';

const firstDomain = (d?: string[] | string) => (Array.isArray(d) ? d[0] : String(d || '').replace(/[{}]/g, '').split(',')[0]);
const signalRef = (s: any): string => {
  if (s?.reference) return String(s.reference);
  const yr = new Date(s?.entry_date || s?.created_at || Date.now()).getFullYear();
  const tail = String(s?.id || '').replace(/\D/g, '').slice(-4).padStart(4, '0');
  return `SIG-${yr}-${tail}`;
};
const when = (x?: string) => (x ? new Date(x).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

export function SWSignalDetailScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { id } = useRoute<RouteProp<SWSignalsStackParams, 'SWSignalDetail'>>().params;
  const { data: s, loading, error, refetch } = useApi<any>(`/pulses/${id}`);

  useEffect(() => nav.addListener('focus', () => refetch()), [nav, refetch]);

  if (loading && !s) return <Screen><Loading /></Screen>;
  if (error) return <Screen><ErrorNote message={error} onRetry={refetch} /></Screen>;

  const evUrl: string | undefined = s?.evidence_url;
  const notes: any[] = s?.note_versions || [];

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Signal Details" subtitle={signalRef(s)} />

      <Row gap={7}>
        <SeverityPill severity={s?.severity} />
        <Pill tone={/(closed|linked)/i.test(s?.review_status || '') ? 'low' : 'ghost'}>{s?.review_status || 'Open'}</Pill>
      </Row>

      <DetailCard items={[
        { label: 'Domain', value: firstDomain(s?.risk_domain) || s?.governance_domain || s?.category || '—' },
        { label: 'Resident', value: s?.related_person || '—' },
        { label: 'House', value: s?.house_name || s?.service_name || '—' },
        { label: 'Description', value: s?.description || '—' },
      ]} />

      {/* Evidence */}
      <Text size={11} weight="600" color={c.faint} style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>Evidence ({evUrl ? 1 : 0})</Text>
      {!evUrl ? (
        <Row style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 12 }} gap={9}>
          <Feather name="paperclip" size={15} color={c.faint} /><Text size={13} muted>No evidence attached.</Text>
        </Row>
      ) : isImageUrl(evUrl) ? (
        <Pressable onPress={() => Linking.openURL(evUrl!)}>
          <Image source={{ uri: evUrl }} style={{ width: '100%', height: 190, borderRadius: radius.md, borderWidth: 1, borderColor: c.line }} resizeMode="cover" />
        </Pressable>
      ) : (
        <Pressable onPress={() => Linking.openURL(evUrl!)}>
          <Row style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 12 }} gap={11}>
            <View style={{ width: 38, height: 38, borderRadius: radius.sm, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={isAudioUrl(evUrl) ? 'play' : 'file'} size={17} color={c.accent} />
            </View>
            <Text size={13} style={{ flex: 1 }} numberOfLines={1}>{isAudioUrl(evUrl) ? 'Voice note' : 'Attachment'}</Text>
            <Feather name="external-link" size={16} color={c.faint} />
          </Row>
        </Pressable>
      )}

      {/* Update history */}
      {notes.length > 1 && (
        <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, paddingHorizontal: 13 }}>
          {notes.map((n, i) => (
            <View key={n.id || i} style={{ paddingVertical: 9, borderBottomWidth: i < notes.length - 1 ? 1 : 0, borderBottomColor: c.lineSoft }}>
              <Row style={{ justifyContent: 'space-between' }} gap={8}>
                <Text size={12} weight="600" style={{ flex: 1 }}>{n.edited_by_name || 'Update'}</Text>
                <Text size={10.5} faint>{when(n.created_at)}</Text>
              </Row>
              <Text size={12.5} muted style={{ marginTop: 2 }}>{n.note}</Text>
            </View>
          ))}
        </View>
      )}

      <BoardButton label="Update signal" icon="edit-3" onPress={() => nav.navigate('SWSignalUpdate', { id, current: s?.description })} />
      <Pressable onPress={() => nav.navigate('SWSignalTimeline', { id })} style={{ alignItems: 'center', paddingVertical: 6 }}>
        <Row gap={6}><Feather name="clock" size={14} color={c.accent} /><Text size={13} weight="600" color={c.accent}>View timeline</Text></Row>
      </Pressable>
    </Screen>
  );
}
