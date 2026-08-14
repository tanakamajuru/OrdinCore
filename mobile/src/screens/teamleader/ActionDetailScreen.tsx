/**
 * screens/teamleader/ActionDetailScreen.tsx
 * Matches Team Leader screenshot 6/8.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card, TextArea, Button } from '@/components/ui';

export default function ActionDetailScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const [note, setNote] = useState('Left message with CC at 09:30 awaiting call back.');

  return (
    <Screen scroll>
      <Row gap={spacing.md} style={{ paddingTop: spacing.sm, marginBottom: spacing.lg }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">Action Detail</Text>
      </Row>

      <Row justify="space-between" align="flex-start" style={{ marginBottom: spacing.lg }}>
        <Text variant="title" style={{ fontSize: 18, flex: 1 }}>
          Contact CC to arrange psychiatric appointment
        </Text>
        <View style={{ backgroundColor: colors.danger + '1F', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ color: colors.danger, fontSize: 11 }} weight="700">
            Due today
          </Text>
        </View>
      </Row>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Concern / Signal
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text weight="600">Mental health deterioration</Text>
        <Text muted variant="caption" style={{ marginTop: 4 }}>
          Presentation deteriorating across 3 observations (07 Aug).
        </Text>
      </Card>

      <Text weight="700" style={{ marginBottom: 4 }}>
        Required action
      </Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        Contact Care Care Coordinator to arrange psychiatric review.
      </Text>

      <Row justify="space-between" style={{ marginBottom: spacing.lg }}>
        <View>
          <Text muted variant="caption">
            Deadline
          </Text>
          <Text weight="700">Today, 15:00</Text>
        </View>
        <View>
          <Text muted variant="caption">
            Assigned by
          </Text>
          <Text weight="700">Registered Manager</Text>
        </View>
      </Row>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Your notes / evidence
      </Text>
      <TextArea value={note} onChangeText={setNote} maxLength={500} />

      <Row gap={spacing.md} style={{ marginTop: spacing.xl }}>
        <View style={{ flex: 1 } as any}>
          <Button label="Complete action" onPress={() => navigation.goBack()} />
        </View>
      </Row>
      <View style={{ marginTop: spacing.sm }}>
        <Button label="Add evidence" variant="outline" onPress={() => {}} />
      </View>
    </Screen>
  );
}
