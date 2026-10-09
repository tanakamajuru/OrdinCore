import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '@/api/client';
import { useApi } from '@/api/useApi';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Screen, AppHeader, Card, Loading, Empty, Button, Text, Row, ErrorNote, Banner, Chip, Label } from '@/components/ui';
import { CalendarField } from '@/components/CalendarField';
import { useAuth } from '@/auth/AuthContext';
import { API_BASE_URL } from '@/config';

const today = () => new Date().toISOString().slice(0, 10);

// The Team Leader's "Daily Governance" section on mobile — the briefs the RM publishes at sign-off,
// with Confirm-reviewed (Chapters 2/3). Defaults to TODAY's brief; a date range pulls a span of
// days (e.g. after being away). Same stored briefs as the web history.
export function TLDailyGovernanceScreen() {
  const { c } = useTheme();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [picking, setPicking] = useState<null | 'from' | 'to'>(null);
  const isToday = from === today() && to === today();
  const url = `/governance/daily-log/team-briefs?from=${from}&to=${to}`;
  const { data, loading, error, refetch } = useApi<any>(url, [url]);
  const briefs: any[] = Array.isArray(data) ? data : [];
  const [acking, setAcking] = useState<string | null>(null);
  const [acked, setAcked] = useState<Record<string, boolean>>({});
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const { token } = useAuth();

  // Download the presentable PDF (with auth) and hand it to the OS share sheet (save / email / print).
  const openPdf = async (b: any) => {
    setPdfBusy(b.id);
    try {
      const target = `${FileSystem.cacheDirectory}daily-governance-${b.id}.pdf`;
      const res = await FileSystem.downloadAsync(`${API_BASE_URL}/governance/daily-log/${b.id}/pdf`, target, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (res.status !== 200) throw new Error('The report could not be generated.');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      else Alert.alert('Report ready', 'The PDF was downloaded to the app cache.');
    } catch (e: any) { Alert.alert("Couldn't open the PDF", e?.message || 'Please try again.'); }
    finally { setPdfBusy(null); }
  };

  const acknowledge = async (id: string) => {
    setAcking(id);
    try {
      await api.post(`/governance/daily-log/${id}/acknowledge`, {});
      setAcked((a) => ({ ...a, [id]: true }));
    } catch (e: any) { Alert.alert("Couldn't acknowledge", e?.message || 'Please try again.'); }
    finally { setAcking(null); }
  };

  const fmt = (d: string) => d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const dateOf = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }) : '';

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <AppHeader title="Daily Governance" subtitle={isToday ? "Today's brief from your Registered Manager" : `Briefs from ${fmt(from)} to ${fmt(to)}`} />

      <Card>
        <Label>Reading period</Label>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          <Chip label={isToday ? 'Today' : 'Show today'} active={isToday} onPress={() => { setFrom(today()); setTo(today()); setPicking(null); }} />
          <Chip label={`From: ${fmt(from)}`} active={picking === 'from'} onPress={() => setPicking(picking === 'from' ? null : 'from')} />
          <Chip label={`To: ${fmt(to)}`} active={picking === 'to'} onPress={() => setPicking(picking === 'to' ? null : 'to')} />
        </Row>
        {picking === 'from' && <View style={{ marginTop: 8 }}><CalendarField value={from} onChange={(v) => { setFrom(v); if (v > to) setTo(v); setPicking(null); }} allowPast maxDate={today()} /></View>}
        {picking === 'to' && <View style={{ marginTop: 8 }}><CalendarField value={to} onChange={(v) => { setTo(v); if (v < from) setFrom(v); setPicking(null); }} minDate={from} maxDate={today()} /></View>}
        {!isToday && <Text size={11.5} muted style={{ marginTop: 8 }}>Showing a range — use "Show today" to return to today's brief.</Text>}
      </Card>

      {loading && !data ? <Loading />
        : error ? <ErrorNote message={error} onRetry={refetch} />
        : briefs.length === 0 ? <Empty icon="file-text" title={isToday ? 'No brief published for today yet' : 'No briefs in this period'} />
        : briefs.map((b) => {
          const nothingNew = !b.material_change || !b.team_brief;
          const isAck = b.acknowledged || acked[b.id];
          return (
            <Card key={b.id} style={{ borderColor: nothingNew ? c.line : c.accent }}>
              {/* Report header — service and date, with a divider, so each brief reads as a report. */}
              <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Row gap={8}><Feather name="shield" size={16} color={c.accent} /><Text weight="800" size={15}>{b.house_name || 'Service'}</Text></Row>
                <Text size={11.5} weight="600" muted>{dateOf(b.published_at || b.review_date)}</Text>
              </Row>
              <View style={{ height: 1, backgroundColor: c.lineSoft, marginVertical: 10 }} />
              {nothingNew ? (
                <Banner tone="ok" icon="check-circle" title="No material change declared">The Registered Manager published a positive confirmation. Continue existing actions.</Banner>
              ) : (
                <Text size={13.5} style={{ lineHeight: 21 }}>{b.team_brief}</Text>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <Button title={pdfBusy === b.id ? 'Preparing…' : 'View / Share PDF'} icon="file-text" tone="ghost" onPress={() => openPdf(b)} loading={pdfBusy === b.id} />
                {isAck ? (
                  <Row gap={6}><Feather name="check-circle" size={16} color={c.sevLow} /><Text size={13} weight="600" color={c.sevLow}>Acknowledged</Text></Row>
                ) : (
                  <Button title={acking === b.id ? 'Confirming…' : 'Confirm reviewed'} icon="check" onPress={() => acknowledge(b.id)} loading={acking === b.id} style={{ paddingHorizontal: 18, borderRadius: radius.md }} />
                )}
              </View>
            </Card>
          );
        })}
    </Screen>
  );
}

export default TLDailyGovernanceScreen;
