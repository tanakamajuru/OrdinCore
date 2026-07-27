import React from 'react';
import {
  View, Text as RNText, TextInput, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, ViewStyle, TextStyle, StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, severityColor, trajectoryColor, Palette } from '@/theme/tokens';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

/* ---------- text ---------- */
export function Text({ style, muted, faint, size, weight, color, numberOfLines, children }: {
  style?: StyleProp<TextStyle>; muted?: boolean; faint?: boolean; size?: number;
  weight?: TextStyle['fontWeight']; color?: string; numberOfLines?: number; children: React.ReactNode;
}) {
  const { c } = useTheme();
  return <RNText numberOfLines={numberOfLines} style={[{ color: color || (faint ? c.faint : muted ? c.muted : c.ink), fontSize: size ?? 14, fontWeight: weight }, style]}>{children}</RNText>;
}

export function Label({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <RNText style={{ color: c.faint, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600', marginBottom: 2 }}>{children}</RNText>;
}

/* ---------- layout ---------- */
export function Screen({ children, refreshing, onRefresh, scroll = true, padded = true }: {
  children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void; scroll?: boolean; padded?: boolean;
}) {
  const { c } = useTheme();
  const inner = <View style={{ padding: padded ? 16 : 0, gap: 12 }}>{children}</View>;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.paper }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.accent} /> : undefined}
        >{inner}</ScrollView>
      ) : inner}
    </SafeAreaView>
  );
}

export function Row({ children, style, gap = 10 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function AppHeader({ title, subtitle, left, right }: {
  title: string; subtitle?: string; left?: React.ReactNode; right?: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <Row style={{ paddingHorizontal: 4, paddingBottom: 6 }}>
      {left}
      <View style={{ flex: 1 }}>
        <RNText style={{ color: c.ink, fontSize: 20, fontWeight: '600', letterSpacing: -0.3 }}>{title}</RNText>
        {!!subtitle && <RNText style={{ color: c.muted, fontSize: 12.5, marginTop: 1 }}>{subtitle}</RNText>}
      </View>
      {right}
    </Row>
  );
}

export function Avatar({ initials, color }: { initials: string; color?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: color || c.accent, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ color: c.accentInk, fontWeight: '600', fontSize: 14 }}>{initials}</RNText>
    </View>
  );
}

/* ---------- surfaces ---------- */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 13 }, style]}>{children}</View>;
}

export function ListItem({ icon, iconColor, title, meta, right, onPress }: {
  icon?: FeatherName; iconColor?: string; title: React.ReactNode; meta?: React.ReactNode; right?: React.ReactNode; onPress?: () => void;
}) {
  const { c } = useTheme();
  const body = (
    <Row style={{ alignItems: 'flex-start', backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 12 }} gap={11}>
      {icon && (
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: (iconColor || c.accent) + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={15} color={iconColor || c.accent} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <RNText style={{ color: c.ink, fontSize: 13.5, fontWeight: '600' }}>{title}</RNText>
        {!!meta && <RNText style={{ color: c.muted, fontSize: 11.5, marginTop: 3 }}>{meta}</RNText>}
      </View>
      {right}
    </Row>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>{body}</Pressable> : body;
}

/* ---------- pills / chips ---------- */
type PillTone = 'crit' | 'high' | 'mod' | 'low' | 'accent' | 'ghost' | 'redact';
export function Pill({ tone = 'ghost', children }: { tone?: PillTone; children: React.ReactNode }) {
  const { c } = useTheme();
  const map: Record<PillTone, string> = { crit: c.sevCrit, high: c.sevHigh, mod: c.sevMod, low: c.sevLow, accent: c.accent, ghost: c.muted, redact: c.faint };
  const col = map[tone];
  return (
    <View style={{ backgroundColor: col + '24', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <RNText style={{ color: col, fontSize: 10.5, fontWeight: '600', letterSpacing: 0.2 }}>{children}</RNText>
    </View>
  );
}

export function SeverityPill({ severity }: { severity?: string }) {
  const { c } = useTheme();
  const col = severityColor(c, severity);
  return (
    <View style={{ backgroundColor: col + '24', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <RNText style={{ color: col, fontSize: 10.5, fontWeight: '600' }}>{severity || '—'}</RNText>
    </View>
  );
}

export function Traj({ dir }: { dir?: string }) {
  const { c } = useTheme();
  const col = trajectoryColor(c, dir);
  const icon: FeatherName = /deterior/i.test(dir || '') ? 'trending-up' : /improv/i.test(dir || '') ? 'trending-down' : 'minus';
  return (
    <Row gap={4}>
      <Feather name={icon} size={13} color={col} />
      <RNText style={{ color: col, fontSize: 10.5, fontWeight: '600' }}>{dir || 'Stable'}</RNText>
    </Row>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={{
      borderWidth: 1, borderColor: active ? c.accent : c.line, backgroundColor: active ? c.accent : c.card,
      borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 7,
    }}>
      <RNText style={{ color: active ? c.accentInk : c.muted, fontSize: 12, fontWeight: active ? '600' : '400' }}>{label}</RNText>
    </Pressable>
  );
}

/* ---------- inputs ---------- */
export function Field({ value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, required }: {
  value: string; onChangeText: (t: string) => void; placeholder?: string; secureTextEntry?: boolean;
  keyboardType?: any; autoCapitalize?: any; required?: boolean;
}) {
  const { c } = useTheme();
  return (
    <TextInput
      value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.faint}
      secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize}
      style={{ backgroundColor: c.card, borderWidth: 1, borderColor: required && !value ? c.accent : c.line, borderRadius: radius.md, padding: 12, fontSize: 14, color: c.ink }}
    />
  );
}

export function TextArea({ value, onChangeText, placeholder, minHeight = 66, required }: {
  value: string; onChangeText: (t: string) => void; placeholder?: string; minHeight?: number; required?: boolean;
}) {
  const { c } = useTheme();
  return (
    <TextInput
      value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.faint}
      multiline textAlignVertical="top"
      style={{ backgroundColor: c.card, borderWidth: 1, borderColor: required && !value ? c.accent : c.line, borderRadius: radius.md, padding: 12, fontSize: 13, color: c.ink, minHeight }}
    />
  );
}

export function SeverityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { c } = useTheme();
  const opts = ['Low', 'Moderate', 'High', 'Critical'];
  return (
    <Row gap={6}>
      {opts.map((o) => {
        const on = value === o;
        const col = severityColor(c, o);
        return (
          <Pressable key={o} onPress={() => onChange(o)} style={{
            flex: 1, borderWidth: on ? 1.5 : 1, borderColor: on ? col : c.line, backgroundColor: on ? col + '18' : c.card,
            borderRadius: radius.md, paddingVertical: 9, alignItems: 'center',
          }}>
            <RNText style={{ color: on ? col : c.muted, fontSize: 11, fontWeight: '600' }}>{o === 'Moderate' ? 'Mod' : o === 'Critical' ? 'Crit' : o}</RNText>
          </Pressable>
        );
      })}
    </Row>
  );
}

/* ---------- buttons ---------- */
export function Button({ title, onPress, tone = 'primary', icon, disabled, loading, style }: {
  title: string; onPress?: () => void; tone?: 'primary' | 'ghost' | 'block'; icon?: FeatherName;
  disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const bg = tone === 'primary' ? c.accent : tone === 'block' ? c.sevCrit + '1f' : c.card;
  const fg = tone === 'primary' ? c.accentInk : tone === 'block' ? c.sevCrit : c.ink;
  const border = tone === 'primary' ? c.accent : tone === 'block' ? c.sevCrit + '4d' : c.line;
  return (
    <Pressable onPress={disabled || loading ? undefined : onPress} style={({ pressed }) => [{
      backgroundColor: bg, borderWidth: 1, borderColor: border, borderRadius: radius.md, paddingVertical: 12,
      alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
    }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon && <Feather name={icon} size={16} color={fg} />}
          <RNText style={{ color: fg, fontSize: 14, fontWeight: '600' }}>{title}</RNText>
        </>
      )}
    </Pressable>
  );
}

/* ---------- misc ---------- */
export function Banner({ tone = 'ok', title, children, icon }: {
  tone?: 'ok' | 'warn' | 'block'; title?: string; children?: React.ReactNode; icon?: FeatherName;
}) {
  const { c } = useTheme();
  const col = tone === 'ok' ? c.sevLow : tone === 'warn' ? c.sevMod : c.sevCrit;
  return (
    <Row style={{ alignItems: 'flex-start', backgroundColor: col + '22', borderRadius: radius.md, padding: 11 }} gap={10}>
      {icon && <Feather name={icon} size={17} color={col} />}
      <View style={{ flex: 1 }}>
        {!!title && <RNText style={{ color: c.ink, fontWeight: '600', fontSize: 12.5 }}>{title}</RNText>}
        {!!children && <RNText style={{ color: c.muted, fontSize: 12, marginTop: title ? 2 : 0 }}>{children}</RNText>}
      </View>
    </Row>
  );
}

export function StatCard({ value, label, big }: { value: React.ReactNode; label: string; big?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 10 }}>
      <RNText style={{ color: c.ink, fontSize: big ? 26 : 20, fontWeight: '600', letterSpacing: -0.4 }}>{value}</RNText>
      <RNText style={{ color: c.muted, fontSize: 10.5, marginTop: 5 }}>{label}</RNText>
    </View>
  );
}

export function Meter({ filled, total }: { filled: number; total: number }) {
  const { c } = useTheme();
  return (
    <Row gap={3} style={{ marginVertical: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < filled ? c.accent : c.line }} />
      ))}
    </Row>
  );
}

export function Loading() {
  const { c } = useTheme();
  return <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator color={c.accent} /></View>;
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { c } = useTheme();
  return (
    <Card style={{ borderColor: c.sevCrit + '55' }}>
      <Row gap={9}><Feather name="alert-triangle" size={16} color={c.sevCrit} /><Text weight="600">Couldn't load</Text></Row>
      <Text muted size={12.5} style={{ marginTop: 6 }}>{message}</Text>
      {onRetry && <Pressable onPress={onRetry} style={{ marginTop: 10 }}><Text color={c.accent} weight="600">Try again</Text></Pressable>}
    </Card>
  );
}

export function Empty({ icon = 'check-circle', title }: { icon?: FeatherName; title: string }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 44, gap: 10 }}>
      <Feather name={icon} size={30} color={c.faint} />
      <Text muted size={13.5}>{title}</Text>
    </View>
  );
}

export { Feather };
export const styles = StyleSheet.create({});
export type { Palette };
