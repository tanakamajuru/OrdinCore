import React, { useEffect, useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '@/api/client';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Text } from './ui';

// Chapter 2 — the Daily Governance Brief on the Team Leader's phone: today's priorities
// published by the RM, with a "Confirm reviewed" acknowledgement (evidence the operational
// lead was informed). Proportionate "nothing new" note otherwise.
export function TeamBriefBanner() {
  const { c } = useTheme();
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState(false);

  const load = async () => {
    try { setBrief(await api.get('/governance/daily-log/team-brief')); }
    catch { setBrief(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const acknowledge = async () => {
    if (!brief?.id) return;
    setAcking(true);
    try {
      await api.post(`/governance/daily-log/${brief.id}/acknowledge`, {});
      setBrief({ ...brief, acknowledged: true });
    } catch (e: any) { Alert.alert("Couldn't acknowledge", e?.message || 'Please try again.'); }
    finally { setAcking(false); }
  };

  if (loading) return null;

  if (!brief || !brief.material_change || !brief.team_brief) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 12, marginBottom: 12 }}>
        <Feather name="check-circle" size={16} color={c.sevLow} />
        <Text size={13} muted style={{ flex: 1 }}>No new governance priorities today. Continue with existing actions.</Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.accent, borderRadius: radius.md, padding: 14, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Feather name="clipboard" size={16} color={c.accent} />
        <Text size={15} weight="700" style={{ flex: 1 }}>Daily Governance Brief</Text>
        {brief.published_at && <Text size={11} muted>{new Date(brief.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>}
      </View>
      <Text size={13.5} style={{ lineHeight: 20 }}>{brief.team_brief}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
        {brief.acknowledged ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="check-circle" size={16} color={c.sevLow} />
            <Text size={13} weight="600" color={c.sevLow}>Acknowledged</Text>
          </View>
        ) : (
          <Pressable onPress={acknowledge} disabled={acking}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.accent, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.md, opacity: acking ? 0.6 : 1 }}>
            <Feather name="check" size={15} color={c.accentInk} />
            <Text size={13.5} weight="600" color={c.accentInk}>{acking ? 'Confirming…' : 'Confirm reviewed'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default TeamBriefBanner;
