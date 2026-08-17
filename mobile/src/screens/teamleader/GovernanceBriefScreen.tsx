/**
 * screens/teamleader/GovernanceBriefScreen.tsx
 * Daily governance brief acknowledge & act — matches screenshot 8/8.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { Screen, Text, Row, Card, Button } from '@/components/ui';

const asList = (v: any): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : x?.title || x?.description || x?.text)).filter(Boolean) : [];

export default function GovernanceBriefScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data } = useApi<any>('/governance/daily-log/team-brief');

  const b: any = data?.data ?? data ?? {};
  const hasBrief = b && (b.id || b.house_name || b.what_changed || b.summary || b.brief_date || b.date);
  const dateStr = b.brief_date || b.date || b.created_at;
  const actions = asList(b.actions ?? b.action_items ?? b.required_actions);

  const confirm = async () => {
    if (!reviewed || busy) return;
    setBusy(true);
    try {
      if (b.id) await api.post(`/governance/daily-log/${b.id}/acknowledge`, {});
      navigation.goBack();
    } catch { navigation.goBack(); }
  };

  return (
    <Screen scroll>
      <Row gap={spacing.md} style={{ paddingTop: spacing.sm, marginBottom: spacing.lg }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">Governance Brief</Text>
      </Row>

      {!hasBrief ? (
        <Card>
          <Text weight="700">No governance brief published yet</Text>
          <Text muted variant="caption" style={{ marginTop: 4 }}>Today's brief will appear here once the Registered Manager signs it off.</Text>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: spacing.lg }}>
            <Text weight="700" variant="subtitle" style={{ fontSize: 16 }}>
              Today's Governance Brief
            </Text>
            <Text muted variant="caption" style={{ marginTop: 4 }}>
              {b.house_name || 'Your service'}{dateStr ? `\n${new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}
            </Text>
          </Card>

          {(b.what_changed || b.summary || b.narrative) ? <BriefSection title="What changed" body={b.what_changed || b.summary || b.narrative} /> : null}
          {(b.priority || b.priority_note) ? <BriefSection title="Priority" body={b.priority || b.priority_note} /> : null}

          {actions.length > 0 ? (
            <>
              <Text weight="700" style={{ marginBottom: spacing.sm }}>Actions</Text>
              <Card style={{ marginBottom: spacing.lg }}>
                {actions.map((a, i) => <Text key={i} variant="caption">• {a}</Text>)}
              </Card>
            </>
          ) : null}

          {(b.escalation_note || b.escalations_summary) ? <BriefSection title="Escalation" body={b.escalation_note || b.escalations_summary} /> : null}

          <Text weight="700" style={{ marginBottom: spacing.sm }}>
            Team Leader requirement
          </Text>
          <Pressable
            onPress={() => setReviewed((r) => !r)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                borderWidth: 2,
                borderColor: reviewed ? colors.primary : colors.border,
                backgroundColor: reviewed ? colors.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {reviewed ? <Feather name="check" size={13} color="#fff" /> : null}
            </View>
            <Text>I have reviewed today's priorities</Text>
          </Pressable>

          <Button label={busy ? 'Confirming…' : 'Confirm reviewed'} disabled={!reviewed} onPress={confirm} />
        </>
      )}
    </Screen>
  );
}

function BriefSection({ title, body }: { title: string; body: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text weight="700" style={{ marginBottom: 4 }}>
        {title}
      </Text>
      <Text muted>{body}</Text>
    </View>
  );
}
