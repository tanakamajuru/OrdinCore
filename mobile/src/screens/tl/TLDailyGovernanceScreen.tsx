import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '@/api/client';
import { useApi } from '@/api/useApi';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Screen, AppHeader, Card, Loading, Empty, Button, Text, Row } from '@/components/ui';

// The Team Leader's "Daily Governance" section on mobile — the briefs the RM publishes
// at sign-off, with Confirm-reviewed (Chapters 2/3).
export function TLDailyGovernanceScreen() {
  const { c } = useTheme();
  const { data, loading, refetch } = useApi<any>('/governance/daily-log/team-briefs');
  const briefs: any[] = data?.data ?? data ?? [];
  const [acking, setAcking] = useState<string | null>(null);
  const [acked, setAcked] = useState<Record<string, boolean>>({});

  const acknowledge = async (id: string) => {
    setAcking(id);
    try {
      await api.post(`/governance/daily-log/${id}/acknowledge`, {});
      setAcked((a) => ({ ...a, [id]: true }));
    } catch (e: any) { Alert.alert("Couldn't acknowledge", e?.message || 'Please try again.'); }
    finally { setAcking(null); }
  };

  const dateOf = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }) : '';

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <AppHeader title="Daily Governance" subtitle="Briefs published by your Registered Manager" />
      {loading && !data ? <Loading />
        : briefs.length === 0 ? <Empty icon="check-circle" title="No governance briefs yet" />
        : briefs.map((b) => {
          const nothingNew = !b.material_change || !b.team_brief;
          const isAck = b.acknowledged || acked[b.id];
          return (
            <Card key={b.id} style={{ borderColor: nothingNew ? c.line : c.accent }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <Row gap={7}><Feather name="shield" size={15} color={c.accent} /><Text weight="700">{b.house_name || 'Service'}</Text></Row>
                <Text size={11} muted>{dateOf(b.published_at || b.review_date)}</Text>
              </Row>
              {nothingNew ? (
                <Text size={13} muted>No new governance priorities. Continue with existing actions.</Text>
              ) : (
                <>
                  <Text size={13.5} style={{ lineHeight: 20 }}>{b.team_brief}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                    {isAck ? (
                      <Row gap={6}><Feather name="check-circle" size={16} color={c.sevLow} /><Text size={13} weight="600" color={c.sevLow}>Acknowledged</Text></Row>
                    ) : (
                      <Button title={acking === b.id ? 'Confirming…' : 'Confirm reviewed'} icon="check" onPress={() => acknowledge(b.id)} loading={acking === b.id} style={{ paddingHorizontal: 18, borderRadius: radius.md }} />
                    )}
                  </View>
                </>
              )}
            </Card>
          );
        })}
    </Screen>
  );
}

export default TLDailyGovernanceScreen;
