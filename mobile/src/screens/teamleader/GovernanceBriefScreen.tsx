/**
 * screens/teamleader/GovernanceBriefScreen.tsx
 * Daily governance brief acknowledge & act — matches screenshot 8/8.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card, Button } from '@/components/ui';

export default function GovernanceBriefScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const [reviewed, setReviewed] = useState(false);

  return (
    <Screen scroll>
      <Row gap={spacing.md} style={{ paddingTop: spacing.sm, marginBottom: spacing.lg }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">Governance Brief</Text>
      </Row>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text weight="700" variant="subtitle" style={{ fontSize: 16 }}>
          Today's Governance Brief
        </Text>
        <Text muted variant="caption" style={{ marginTop: 4 }}>
          47 Walcourt Road{'\n'}Mon 10 Aug
        </Text>
      </Card>

      <BriefSection title="What changed" body="3 recurring concerns identified." />
      <BriefSection title="Priority" body="Medication refusal requires closer monitoring." />

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Actions
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="caption">• Continue medication monitoring</Text>
        <Text variant="caption">• Update CMHT if refusal repeats</Text>
        <Text variant="caption">• Complete environmental action by 14 Aug</Text>
      </Card>

      <BriefSection title="Escalation" body="1 matter remains under RM oversight." />

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

      <Button label="Confirm reviewed" disabled={!reviewed} onPress={() => navigation.goBack()} />
      <Row justify="center" style={{ marginTop: spacing.md }}>
        <Text style={{ color: colors.primary }} weight="600" variant="caption">
          Read full governance review
        </Text>
      </Row>
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
