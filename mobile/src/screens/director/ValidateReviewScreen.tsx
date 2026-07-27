import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { useTheme } from '@/theme/ThemeProvider';
import { RootStackParams } from '@/navigation/types';
import { Screen, Row, Label, Card, Text, Pill, Banner, Button, Loading } from '@/components/ui';

export function ValidateReviewScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { review } = useRoute<RouteProp<RootStackParams, 'ValidateReview'>>().params;
  const id = review.review_id || review.id;
  const full = useApi<any>(id ? `/weekly-reviews/${id}` : null);
  const [busy, setBusy] = useState(false);

  const d = full.data || {};
  const narrative = d.governance_narrative || d.content?.step15_narrative || review.narrative || '—';
  const position = d.overall_position || review.position || '—';
  const signedBy = d.acknowledged_by_name;

  const decide = (validation_status: 'Approved' | 'Challenged') => {
    if (validation_status === 'Challenged') {
      Alert.prompt?.('Challenge', 'What needs revisiting? (returned to the RM)', async (comment) => submit(validation_status, comment || ''));
      if (!Alert.prompt) submit(validation_status, 'Please revisit.');
      return;
    }
    submit(validation_status, 'Approved on mobile.');
  };

  const submit = async (validation_status: string, validation_comment: string) => {
    setBusy(true);
    try {
      await api.post(`/weekly-reviews/${id}/validate`, { validation_status, validation_comment });
      Alert.alert('Done', `Review ${validation_status.toLowerCase()}.`);
      nav.goBack();
    } catch (e: any) {
      Alert.alert("Couldn't validate", e?.message || 'You can’t validate a review you authored.');
    } finally { setBusy(false); }
  };

  if (full.loading && !full.data) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text weight="600">{review.house_name || 'Weekly review'}</Text>
        <Pill tone="ghost">Position · {position}</Pill>
      </Row>

      <Card>
        <Label>RM's narrative · in their own words</Label>
        <Text size={13}>{narrative}</Text>
      </Card>
      {!!signedBy && <Text muted size={12}>Signed by the RM · {signedBy}</Text>}

      <Banner tone="ok" icon="git-branch" title="Separation of duties">
        You didn't author this — you may validate. The app blocks validating your own review.
      </Banner>

      <Label>Your decision</Label>
      <Row gap={8}>
        <Button title="Approve" onPress={() => decide('Approved')} loading={busy} style={{ flex: 1 }} />
        <Button title="Challenge" tone="ghost" onPress={() => decide('Challenged')} style={{ flex: 1 }} />
      </Row>
      <Text muted size={11} style={{ textAlign: 'center' }}>A challenge returns it to the RM with your reason.</Text>
    </Screen>
  );
}
