import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApi } from '@/api/useApi';
import { RootStackParams } from '@/navigation/types';
import { Screen, AppHeader, Label, ListItem, Pill, Loading, ErrorNote, Empty, Text, Row } from '@/components/ui';

// Weekly reviews by service for the current period — completion first ("X of N completed"), with
// missed (Not started) and Overdue services kept visible, not hidden. The Validate action routes
// through the service-rollup entry (which carries the shape ValidateReview expects).
const unwrap = (v: any): any => v?.data?.data ?? v?.data ?? v;
const fmtD = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const STATE: Record<string, { label: string; tone: 'low' | 'mod' | 'crit' | 'ghost' }> = {
  NOT_STARTED: { label: 'Not started', tone: 'ghost' },
  IN_PROGRESS: { label: 'In progress', tone: 'mod' },
  AWAITING_VALIDATION: { label: 'Awaiting validation', tone: 'mod' },
  COMPLETED: { label: 'Completed', tone: 'low' },
};

export function ReviewsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const ov = useApi<any>('/weekly-reviews/overview');
  const roll = useApi<any>('/weekly-reviews/service-rollup');
  const data = unwrap(ov) || { services: [], summary: { completed: 0, total: 0 }, period: null };
  const services: any[] = data.services || [];
  const period = data.period;
  const dueDay = period?.due ? new Date(period.due).toLocaleDateString('en-GB', { weekday: 'long' }) : '';
  const rollHouses: any[] = unwrap(roll)?.houses || [];
  const rollByHouse = (hid: string) => rollHouses.find((h: any) => h.house_id === hid);

  return (
    <Screen refreshing={ov.loading} onRefresh={() => { ov.refetch(); roll.refetch(); }}>
      <AppHeader title="Weekly reviews by service" subtitle={period ? `${fmtD(period.start)} – ${fmtD(period.end)}${dueDay ? ` · due ${dueDay}` : ''}` : 'Validate the week'} />
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Label>Per service</Label>
        <Text size={12.5} weight="700" color="#28633f">{data.summary.completed} of {data.summary.total} completed</Text>
      </Row>
      {ov.loading && !ov.data ? <Loading /> : ov.error ? <ErrorNote message={ov.error} onRetry={ov.refetch} /> : services.length === 0 ? (
        <Empty icon="file-text" title="No services to review this period." />
      ) : services.map((s: any) => {
        const m = STATE[s.state] || STATE.NOT_STARTED;
        const awaiting = s.state === 'AWAITING_VALIDATION';
        const rollEntry = rollByHouse(s.house_id);
        const meta = `${m.label}${s.reviewer_name ? ` · ${s.reviewer_name}` : ''}${s.completed_at ? ` · ${fmtD(s.completed_at)}` : ''}`;
        return (
          <ListItem
            key={s.review_id || s.house_id}
            icon="file-text"
            title={s.house_name}
            meta={meta}
            right={<Pill tone={s.overdue ? 'crit' : m.tone}>{s.overdue ? `Overdue · ${m.label}` : m.label}</Pill>}
            onPress={awaiting && rollEntry?.review_id ? () => nav.navigate('ValidateReview', { review: rollEntry }) : undefined}
          />
        );
      })}
      <Text size={11} muted>Missed reviews (Not started past the due day) stay visible here until completed. Completion alone is not a statement that governance is effective.</Text>
    </Screen>
  );
}
