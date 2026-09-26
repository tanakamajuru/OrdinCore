import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useApi } from '@/api/useApi';
import { useAuth, normalizeRole } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { navigate, navigateTab } from '@/navigation/navRef';
import { Screen, AppHeader, Card, ListItem, Empty, Loading, ErrorNote, Text, Button } from '@/components/ui';

// Guided Work item as returned by GET /guided-work (read model — no writes).
type GWItem = {
  id: string; taskType: string; title: string; summary?: string;
  category?: 'ASSIGNED' | 'DECISION'; priority?: string;
  canonicalEntityType: string; canonicalEntityId: string;
  concernRiskId?: string | null; serviceName?: string;
  actionLabel?: string; whyAmISeeingThis?: string; route?: string;
};
type GWResponse = {
  needsYou: GWItem[]; waiting: GWItem[]; completedToday: GWItem[];
  counts: { needsYou: number; waiting: number; completedToday: number };
  degraded: boolean; degradedSources: string[];
};

const PAGE = 20;

const ICON: Record<string, string> = {
  ASSIGNED_ACTION: 'check-square', WAITING_ACTION: 'clock', COMPLETED_ACTION: 'check-circle',
  SIGNAL_DECISION: 'bell', MONITORING_REVIEW: 'eye', WEEKLY_ACK: 'book-open',
  WEEKLY_GOVERNANCE: 'file-text', WEEKLY_VALIDATION: 'check-circle', RM_RISK_REVIEW: 'shield',
  ESCALATION_REVIEW: 'alert-circle', PATTERN_REVIEW: 'git-branch', CROSS_SERVICE_PATTERN: 'git-branch',
  EFFECTIVENESS_REVIEW: 'trending-up', STRATEGIC_RISK_REVIEW: 'shield', ASSURANCE_EXCEPTION: 'shield',
  PROVIDER_ASSURANCE_SIGNOFF: 'shield', DIRECTOR_PATTERN_REVIEW: 'git-branch',
};

const priorityTone: Record<string, string> = {
  URGENT: 'red', CRITICAL: 'red', DUE: 'amber', HIGH: 'amber', NORMAL: 'blue',
};

// Map a Guided Work item to a NATIVE destination. The item's `route` is a WEB path, so mobile
// re-derives the screen from the canonical entity + role. Screens needing a full object we don't
// hold (ActionDetail, ValidateReview, RateEffectiveness) fall back to the matching list screen.
function routeFor(role: string, it: GWItem): (() => void) | undefined {
  const r = normalizeRole(role);
  const go = (screen: string, params?: any) => () => navigate(screen as never, params as never);
  const tab = (name: string) => () => navigateTab(name as never);
  const id = it.canonicalEntityId;
  switch (it.canonicalEntityType) {
    case 'action':
      return r === 'REGISTERED_MANAGER' ? go('RMMyActions') : r === 'TEAM_LEADER' ? go('TLMyActions') : r === 'SUPPORT_WORKER' ? go('SWActions') : tab('Actions');
    case 'signal':
      return r === 'REGISTERED_MANAGER' ? go('RMDailyGovernance') : r === 'SUPPORT_WORKER' ? go('SWSignalDetail', { id }) : go('SignalDetail', { id });
    case 'risk':
      return go('RiskDetail', { id });
    case 'escalation':
      return go('EscalationDetail', { id });
    case 'pattern':
      return it.concernRiskId ? go('RiskDetail', { id: it.concernRiskId }) : go('RMPatterns');
    case 'effectiveness_review':
      return r === 'REGISTERED_MANAGER' ? go('RMActionsList', { lens: 'effectiveness' }) : undefined;
    case 'weekly_governance':
      if (it.taskType === 'WEEKLY_ACK') return r === 'TEAM_LEADER' ? go('TLWeeklyReviews') : undefined;
      if (it.taskType === 'WEEKLY_VALIDATION') return go('DirectorReviews');
      return r === 'REGISTERED_MANAGER' ? go('RMWeeklyReview') : undefined;
    case 'provider_assurance':
      return go('ProviderSignoff');
    default:
      return undefined;
  }
}

export function MyWorkScreen() {
  const { c } = useTheme();
  const { role } = useAuth();
  const { data: raw, loading, error, refetch } = useApi<any>('/guided-work');
  const [limit, setLimit] = useState(PAGE);

  const gw: GWResponse | null = raw?.data ?? raw ?? null;
  const needsYou = gw?.needsYou ?? [];
  const waiting = gw?.waiting ?? [];
  const completedToday = gw?.completedToday ?? [];
  const degraded = !!gw?.degraded;

  const assigned = useMemo(() => needsYou.filter(i => i.category === 'ASSIGNED'), [needsYou]);
  const decisions = useMemo(() => needsYou.filter(i => i.category !== 'ASSIGNED'), [needsYou]);
  const allClear = !loading && !error && needsYou.length === 0 && waiting.length === 0;

  const toneColor = (p?: string) => ({ red: c.sevCrit, amber: c.sevHigh, blue: c.accent, emerald: c.sevLow, slate: c.muted } as Record<string, string>)[priorityTone[p || 'NORMAL'] || 'blue'] || c.accent;

  const renderRow = (it: GWItem, i: number, len: number) => (
    <View key={it.id}>
      {i > 0 && <View style={{ height: 1, backgroundColor: c.lineSoft }} />}
      <ListItem
        icon={(ICON[it.taskType] || 'clipboard') as any}
        iconColor={toneColor(it.priority)}
        title={it.title}
        meta={it.serviceName ? `${it.serviceName} · ${it.whyAmISeeingThis || ''}` : (it.whyAmISeeingThis || it.summary || '')}
        right={<Text size={13} color={c.accent}>{it.actionLabel || 'Open'}</Text>}
        onPress={routeFor(role || '', it)}
      />
    </View>
  );

  const section = (title: string, subtitle: string, items: GWItem[], paginate = false) => {
    if (!items.length) return null;
    const shown = paginate ? items.slice(0, limit) : items;
    return (
      <Card>
        <Text weight="700">{title}  <Text color={c.muted} weight="400">{items.length}</Text></Text>
        <Text size={12} color={c.muted} style={{ marginBottom: 4 }}>{subtitle}</Text>
        {shown.map((it, i) => renderRow(it, i, shown.length))}
        {paginate && items.length > shown.length && (
          <Button tone="ghost" title={`Show ${Math.min(PAGE, items.length - shown.length)} more`} onPress={() => setLimit(l => l + PAGE)} />
        )}
      </Card>
    );
  };

  return (
    <Screen refreshing={loading} onRefresh={() => { setLimit(PAGE); refetch(); }}>
      <AppHeader title="My Work" subtitle="What needs your attention today" />

      {degraded && (
        <Card>
          <ListItem icon="alert-triangle" iconColor={c.sevHigh}
            title="This list may be incomplete"
            meta="Some governance sources could not be read. Pull to refresh; escalate if it persists." />
        </Card>
      )}

      {loading && !gw ? <Loading />
        : error ? <ErrorNote message={error} onRetry={refetch} />
        : allClear ? <Empty icon="check-circle" title="You're all caught up" />
        : (
          <>
            {section('Assigned to you', 'Work personally assigned to you', assigned, true)}
            {section('Decisions due', 'Governance decisions your role must make', decisions, true)}
            {section('Waiting on others', "Open, but someone else owns the next step", waiting)}
            {section('Completed today', 'Recorded by you today', completedToday)}
          </>
        )}
    </Screen>
  );
}

export default MyWorkScreen;
