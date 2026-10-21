import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useAuth, normalizeRole } from '@/auth/AuthContext';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { Screen, AppHeader, Label, Card, Row, Text, Pill, Button, Loading, ErrorNote, TextArea, Empty } from '@/components/ui';

// RI Queries (scoped and confirmed 21 Oct 2026): a Responsible Individual's "assurance and
// challenge" duty as a real tracked workflow — raise a formal question, get an evidenced answer,
// and either accept it (close) or challenge it (reopen with a reason). Director/Admin can also
// raise or answer, matching the backend's role-agnostic assigned_to/raised_by model.
const fmtD = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';
const STATUS_META: Record<string, { label: string; tone: 'ghost' | 'mod' | 'low' }> = {
  OPEN: { label: 'Open', tone: 'mod' },
  ANSWERED: { label: 'Answered — review', tone: 'mod' },
  CLOSED: { label: 'Closed', tone: 'low' },
};

export function RIQueriesScreen() {
  const { user, role } = useAuth();
  const myId = user?.id || (user as any)?.user_id;
  const r = normalizeRole(role || '');
  const canRaise = ['RESPONSIBLE_INDIVIDUAL', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'].includes(r);

  const q = useApi<any>('/queries');
  const items: any[] = Array.isArray(q.data) ? q.data : q.data?.data ?? [];

  const [showRaise, setShowRaise] = useState(false);
  const [subject, setSubject] = useState('');
  const [raiseBusy, setRaiseBusy] = useState(false);
  const raise = async () => {
    if (subject.trim().length < 10) { Alert.alert('Describe the query', 'At least a short sentence.'); return; }
    setRaiseBusy(true);
    try {
      await api.post('/queries', { subject: subject.trim() });
      Alert.alert('Query raised', 'It has been sent for an answer.');
      setSubject(''); setShowRaise(false); q.refetch();
    } catch (e: any) { Alert.alert("Couldn't raise query", e?.message || 'Please try again.'); }
    finally { setRaiseBusy(false); }
  };

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [respondBusy, setRespondBusy] = useState(false);
  const respond = async (id: string) => {
    if (responseText.trim().length < 10) { Alert.alert('Give an answer', 'At least a short sentence, with the evidence behind it.'); return; }
    setRespondBusy(true);
    try {
      await api.post(`/queries/${id}/respond`, { response_text: responseText.trim() });
      setResponseText(''); setRespondingId(null); q.refetch();
    } catch (e: any) { Alert.alert("Couldn't answer", e?.message || 'Please try again.'); }
    finally { setRespondBusy(false); }
  };

  const [busyId, setBusyId] = useState<string | null>(null);
  const closeQuery = async (id: string) => {
    setBusyId(id);
    try { await api.post(`/queries/${id}/close`, {}); q.refetch(); }
    catch (e: any) { Alert.alert("Couldn't close", e?.message || 'Please try again.'); }
    finally { setBusyId(null); }
  };
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenBusy, setReopenBusy] = useState(false);
  const reopen = async (id: string) => {
    if (reopenReason.trim().length < 10) { Alert.alert('Explain why', 'Say why the answer does not resolve the query (at least a short sentence).'); return; }
    setReopenBusy(true);
    try { await api.post(`/queries/${id}/reopen`, { reopen_reason: reopenReason.trim() }); setReopenReason(''); setReopeningId(null); q.refetch(); }
    catch (e: any) { Alert.alert("Couldn't reopen", e?.message || 'Please try again.'); }
    finally { setReopenBusy(false); }
  };

  if (q.loading && !q.data) return <Screen><Loading /></Screen>;
  if (q.error) return <Screen><ErrorNote message={q.error} onRetry={q.refetch} /></Screen>;

  return (
    <Screen refreshing={q.loading} onRefresh={q.refetch}>
      <AppHeader title="Queries" subtitle="Assurance and challenge — raised, answered and tracked" />
      {canRaise && !showRaise && <Button title="Raise a query" icon="help-circle" onPress={() => setShowRaise(true)} />}
      {showRaise && (
        <Card>
          <Label>What are you querying?</Label>
          <TextArea value={subject} onChangeText={setSubject} placeholder="Describe the concern or question clearly enough for the respondent to act on." minHeight={64} required />
          <Row gap={8}>
            <Button title="Send" onPress={raise} loading={raiseBusy} style={{ flex: 1 }} />
            <Button title="Cancel" tone="ghost" onPress={() => { setShowRaise(false); setSubject(''); }} style={{ flex: 1 }} />
          </Row>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty title="No queries yet." />
      ) : items.map((it: any) => {
        const meta = STATUS_META[it.status] || STATUS_META.OPEN;
        const canAnswer = it.status === 'OPEN' && it.assigned_to === myId;
        const canReviewAnswer = it.status === 'ANSWERED' && it.raised_by === myId;
        return (
          <Card key={it.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Pill tone={meta.tone}>{meta.label}</Pill>
              <Text faint size={10.5}>{fmtD(it.raised_at)}</Text>
            </Row>
            <Text size={13.5} weight="600" style={{ marginTop: 6 }}>{it.subject}</Text>
            <Text muted size={11.5} style={{ marginTop: 2 }}>
              Raised by {it.raised_by_name || 'Unknown'}{it.service_name ? ` · ${it.service_name}` : ''}{it.assigned_to_name ? ` · for ${it.assigned_to_name}` : ''}
            </Text>
            {!!it.response_text && (
              <View style={{ marginTop: 8, borderLeftWidth: 2, borderLeftColor: '#9992', paddingLeft: 10 }}>
                <Text size={12} muted>Answer, by {it.responded_by_name || 'respondent'} ({fmtD(it.responded_at)}):</Text>
                <Text size={12.5} style={{ marginTop: 2 }}>{it.response_text}</Text>
              </View>
            )}
            {!!it.reopen_reason && it.status === 'OPEN' && (
              <Text size={12} color="#b45309" style={{ marginTop: 6 }}>Reopened: {it.reopen_reason}</Text>
            )}
            {!!it.close_reason && it.status === 'CLOSED' && (
              <Text size={12} muted style={{ marginTop: 6 }}>Closed: {it.close_reason}</Text>
            )}

            {canAnswer && (
              respondingId === it.id ? (
                <View style={{ marginTop: 8 }}>
                  <TextArea value={responseText} onChangeText={setResponseText} placeholder="Give an evidenced answer." minHeight={56} required />
                  <Row gap={8}>
                    <Button title="Submit answer" onPress={() => respond(it.id)} loading={respondBusy} style={{ flex: 1 }} />
                    <Button title="Cancel" tone="ghost" onPress={() => { setRespondingId(null); setResponseText(''); }} style={{ flex: 1 }} />
                  </Row>
                </View>
              ) : <Button title="Answer this query" icon="message-square" onPress={() => setRespondingId(it.id)} style={{ marginTop: 8 }} />
            )}

            {canReviewAnswer && (
              reopeningId === it.id ? (
                <View style={{ marginTop: 8 }}>
                  <TextArea value={reopenReason} onChangeText={setReopenReason} placeholder="Why does this answer not resolve the query?" minHeight={56} required />
                  <Row gap={8}>
                    <Button title="Reopen" tone="block" onPress={() => reopen(it.id)} loading={reopenBusy} style={{ flex: 1 }} />
                    <Button title="Cancel" tone="ghost" onPress={() => { setReopeningId(null); setReopenReason(''); }} style={{ flex: 1 }} />
                  </Row>
                </View>
              ) : (
                <Row gap={8} style={{ marginTop: 8 }}>
                  <Button title="Satisfied — close" icon="check" onPress={() => closeQuery(it.id)} loading={busyId === it.id} style={{ flex: 1 }} />
                  <Button title="Not satisfied — reopen" tone="ghost" onPress={() => setReopeningId(it.id)} style={{ flex: 1 }} />
                </Row>
              )
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
