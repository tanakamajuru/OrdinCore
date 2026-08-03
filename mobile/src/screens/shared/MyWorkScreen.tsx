import React from 'react';
import { View } from 'react-native';
import { useApi } from '@/api/useApi';
import { useAuth, normalizeRole } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { navigate, navigateTab } from '@/navigation/navRef';
import { Screen, AppHeader, Card, ListItem, Empty, Loading, ErrorNote, Text } from '@/components/ui';

type WorkItem = {
  key: string; label: string; count: number; emphasis?: number;
  tone: 'red' | 'amber' | 'blue' | 'emerald' | 'slate'; link: string; primary_action: string;
};

const ICON: Record<string, any> = { escalations: 'alert-circle', signals: 'bell', actions: 'check-square', effectiveness: 'trending-up', weekly: 'file-text' };

// Chapter 1 — "My Work" on mobile: the same role-scoped read model as the web, so a user
// opens the app and sees exactly what needs their attention. Each row jumps to the screen
// where the work is done (best-effort per role).
function target(role: string, key: string): (() => void) | undefined {
  const r = normalizeRole(role);
  const go = (screen: string) => () => navigate(screen as never);
  const tab = (name: string) => () => navigateTab(name as never);
  if (key === 'actions') return r === 'REGISTERED_MANAGER' ? go('RMMyActions') : r === 'TEAM_LEADER' ? go('TLMyActions') : tab('Actions');
  if (key === 'escalations') return r === 'REGISTERED_MANAGER' ? go('RMEscalations') : r === 'TEAM_LEADER' ? go('TLEscalations') : r === 'SUPPORT_WORKER' ? go('SWEscalations') : undefined;
  if (key === 'signals') return tab('Signals');
  if (key === 'weekly') return r === 'REGISTERED_MANAGER' ? go('RMGovernanceReview') : r === 'TEAM_LEADER' ? go('TLDailyReview') : undefined;
  return undefined;
}

export function MyWorkScreen() {
  const { c } = useTheme();
  const { role } = useAuth();
  const { data, loading, error, refetch } = useApi<any>('/my-work');

  const items: WorkItem[] = data?.items ?? data?.data?.items ?? [];
  const allClear = (data?.all_clear ?? data?.data?.all_clear) || (!loading && !error && items.length === 0);

  const toneColor: Record<string, string> = { red: c.sevCrit, amber: c.sevHigh, blue: c.accent, emerald: c.sevLow, slate: c.muted };

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <AppHeader title="My Work" subtitle="What needs your attention today" />
      {loading && !data ? <Loading />
        : error ? <ErrorNote message={error} onRetry={refetch} />
        : allClear ? <Empty icon="check-circle" title="You're all caught up" />
        : (
          <Card>
            {items.map((it, i) => (
              <View key={it.key}>
                {i > 0 && <View style={{ height: 1, backgroundColor: c.lineSoft }} />}
                <ListItem
                  icon={ICON[it.key] || 'clipboard'}
                  iconColor={toneColor[it.tone] || c.muted}
                  title={`${it.count}  ${it.label}`}
                  meta={it.emphasis ? `${it.emphasis} ${it.key === 'actions' ? 'overdue' : it.key === 'escalations' ? 'urgent' : 'need attention'}` : it.primary_action}
                  right={<Text size={13} color={c.accent}>{it.primary_action}</Text>}
                  onPress={target(role || '', it.key)}
                />
              </View>
            ))}
          </Card>
        )}
    </Screen>
  );
}

export default MyWorkScreen;
