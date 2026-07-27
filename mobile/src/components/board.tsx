import React from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Polyline, Line } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useDrawer } from './AppDrawer';
import { SidebarIcon } from './SidebarIcon';
import { radius, Palette } from '@/theme/tokens';
import { Text, Row } from './ui';

// Primitives that mirror the ordin-core reference board (Metrics / StatusList / Donut / Checklist /
// DetailCard / Timeline / Sparkline). Tone colours are fixed to the OrdinCore severity palette; the
// per-role accent (from AccentProvider) drives primary buttons, active tabs and "view all" links.
export type Tone = 'blue' | 'red' | 'amber' | 'green' | 'purple' | 'neutral';
export type BoardItem = { title: string; meta?: string; value?: string; tone?: Tone; onPress?: () => void };

export function toneColor(c: Palette, tone: Tone = 'blue'): string {
  const map: Record<Tone, string> = { red: c.sevCrit, amber: c.sevHigh, green: c.sevLow, blue: '#2f6cb5', purple: '#7c45ad', neutral: c.muted };
  return map[tone];
}

type FeatherName = React.ComponentProps<typeof Feather>['name'];

/* Screen heading — small subtitle above a bold title (reference .screen-heading), with an avatar
   button on the right that opens the app drawer (profile · theme · menu). `menu={false}` hides it
   on pushed hub screens that already have a back-bar. */
export function BoardHeader({ title, subtitle, menu = true }: { title: string; subtitle?: string; menu?: boolean }) {
  const { c } = useTheme();
  const { open } = useDrawer();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
      <View style={{ flex: 1 }}>
        {!!subtitle && <Text size={12} muted style={{ marginBottom: 2 }}>{subtitle}</Text>}
        <Text size={22} weight="700" style={{ letterSpacing: -0.3 }}>{title}</Text>
      </View>
      {menu && (
        <Pressable onPress={open} hitSlop={8}
          style={{ width: 38, height: 38, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
          <SidebarIcon size={20} color={c.ink} />
        </Pressable>
      )}
    </View>
  );
}

/* 2-column metric tiles: big tone-coloured value + small label. */
export function Metrics({ items }: { items: { value: React.ReactNode; label: string; tone?: Tone }[] }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {items.map((m, i) => (
        <View key={i} style={{ width: '47.7%', flexGrow: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 13 }}>
          <Text size={26} weight="700" color={toneColor(c, m.tone)} style={{ letterSpacing: -0.5 }}>{m.value}</Text>
          <Text size={11.5} muted style={{ marginTop: 4 }}>{m.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function SectionTitle({ children, action, onAction }: { children: React.ReactNode; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 4, marginBottom: 2 }}>
      <Text size={14} weight="600">{children}</Text>
      {action ? (
        <Pressable onPress={onAction}><Text size={12} color={c.accent} weight="600">{action}</Text></Pressable>
      ) : null}
    </Row>
  );
}

/* Card of rows: tone dot · title/meta · optional right value · chevron; optional footer button.
   Paginated: when there are more than `pageSize` rows a Prev/Next footer appears and only one
   page renders at a time — so every list/table in the app is paged, not an endless scroll. */
export function StatusList({ items, button, onButton, empty, pageSize = 8 }: {
  items: BoardItem[]; button?: string; onButton?: () => void; empty?: string; pageSize?: number;
}) {
  const { c } = useTheme();
  const [page, setPage] = React.useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const safe = Math.min(page, pages - 1);
  // Reset to the first page whenever the underlying list shrinks past the current page.
  React.useEffect(() => { if (page > pages - 1) setPage(0); }, [pages]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = safe * pageSize;
  const shown = items.slice(start, start + pageSize);

  return (
    <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, paddingHorizontal: 13 }}>
      {items.length === 0 && <Text size={12.5} muted style={{ paddingVertical: 16, textAlign: 'center' }}>{empty || 'Nothing here.'}</Text>}
      {shown.map((it, i) => {
        const body = (
          <Row style={{ paddingVertical: 11, borderBottomWidth: i < shown.length - 1 ? 1 : 0, borderBottomColor: c.lineSoft }} gap={10}>
            <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: toneColor(c, it.tone) }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size={13.5} weight="600" numberOfLines={1}>{it.title}</Text>
              {!!it.meta && <Text size={11.5} muted numberOfLines={1} style={{ marginTop: 2 }}>{it.meta}</Text>}
            </View>
            {!!it.value && <Text size={13.5} weight="700">{it.value}</Text>}
            {it.onPress && <Feather name="chevron-right" size={16} color={c.faint} />}
          </Row>
        );
        return it.onPress
          ? <Pressable key={start + i} onPress={it.onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>{body}</Pressable>
          : <View key={start + i}>{body}</View>;
      })}

      {pages > 1 && (
        <Row style={{ justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.lineSoft }}>
          <Pressable onPress={() => setPage((p) => Math.max(0, p - 1))} disabled={safe === 0} hitSlop={8} style={{ opacity: safe === 0 ? 0.35 : 1, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Feather name="chevron-left" size={16} color={c.accent} /><Text size={12.5} weight="600" color={c.accent}>Prev</Text>
          </Pressable>
          <Text size={11.5} muted>Page {safe + 1} of {pages} · {items.length}</Text>
          <Pressable onPress={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={safe >= pages - 1} hitSlop={8} style={{ opacity: safe >= pages - 1 ? 0.35 : 1, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text size={12.5} weight="600" color={c.accent}>Next</Text><Feather name="chevron-right" size={16} color={c.accent} />
          </Pressable>
        </Row>
      )}

      {!!button && (
        <Pressable onPress={onButton} style={{ backgroundColor: c.accent, borderRadius: radius.md, paddingVertical: 11, alignItems: 'center', marginVertical: 10 }}>
          <Text size={13} weight="700" color={c.accentInk}>{button}</Text>
        </Pressable>
      )}
    </View>
  );
}

/* Single-value ring (reference .donut). */
export function PercentDonut({ value, label, tone = 'green', size = 132 }: { value: number; label: string; tone?: Tone; size?: number }) {
  const { c } = useTheme();
  const stroke = 15;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const col = toneColor(c, tone);
  return (
    <View style={{ alignItems: 'center', marginVertical: 6 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cx} r={r} stroke={c.lineSoft} strokeWidth={stroke} fill="none" />
          <Circle cx={cx} cy={cx} r={r} stroke={col} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * C} ${C}`} transform={`rotate(-90 ${cx} ${cx})`} />
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text size={28} weight="700">{value}%</Text>
          <Text size={11} muted>{label}</Text>
        </View>
      </View>
    </View>
  );
}

/* Checklist rows: optional check icon, label, right value. */
export function Checklist({ items }: { items: { label: string; value?: React.ReactNode; checked?: boolean; showCheck?: boolean }[] }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, paddingHorizontal: 13 }}>
      {items.map((it, i) => (
        <Row key={i} style={{ paddingVertical: 12, borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: c.lineSoft }} gap={10}>
          {it.showCheck && <Feather name="check-circle" size={17} color={c.sevLow} />}
          <Text size={13.5} style={{ flex: 1 }}>{it.label}</Text>
          {it.value !== undefined && <Text size={13} weight="700">{it.value}</Text>}
        </Row>
      ))}
    </View>
  );
}

export function DetailCard({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, paddingHorizontal: 13 }}>
      {items.map((it, i) => (
        <View key={i} style={{ paddingVertical: 11, borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: c.lineSoft }}>
          <Text size={11} weight="600" color={c.faint} style={{ letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>{it.label}</Text>
          <Text size={14} style={{ lineHeight: 20 }}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

/* Primary full-width button (reference .primary) — uses the role accent. */
export function BoardButton({ label, icon, onPress, disabled, style }: { label: string; icon?: FeatherName; onPress?: () => void; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => [{
      backgroundColor: c.accent, borderRadius: radius.md, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
    }, style]}>
      {icon && <Feather name={icon} size={16} color={c.accentInk} />}
      <Text size={14} weight="700" color={c.accentInk}>{label}</Text>
    </Pressable>
  );
}

/* Reference timeline — numbered/checked nodes on a rail. */
export function Timeline({ steps }: { steps: { title: string; meta?: string; tone?: Tone; done?: boolean }[] }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingLeft: 2 }}>
      {steps.map((st, i) => {
        const last = i === steps.length - 1;
        const col = toneColor(c, st.tone || 'blue');
        return (
          <Row key={i} style={{ alignItems: 'flex-start' }} gap={12}>
            <View style={{ alignItems: 'center', width: 22 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: col, alignItems: 'center', justifyContent: 'center' }}>
                {st.done ? <Feather name="check" size={13} color="#fff" /> : <Text size={11} weight="700" color="#fff">{i + 1}</Text>}
              </View>
              {!last && <View style={{ flex: 1, width: 2, backgroundColor: c.line, minHeight: 30, marginVertical: 2 }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : 16 }}>
              <Text size={14} weight="600">{st.title}</Text>
              {!!st.meta && <Text size={11.5} muted style={{ marginTop: 2 }}>{st.meta}</Text>}
            </View>
          </Row>
        );
      })}
    </View>
  );
}

/* Reference sparkline in a chart card. */
export function SparkCard({ points }: { points?: number[] }) {
  const { c } = useTheme();
  const pts = points && points.length > 1 ? points : [77, 50, 64, 29, 54, 40, 18, 27];
  const max = Math.max(...pts, 1), min = Math.min(...pts, 0);
  const span = max - min || 1;
  const coords = pts.map((p, i) => `${(i / (pts.length - 1)) * 260},${88 - ((p - min) / span) * 70}`).join(' ');
  return (
    <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 14, height: 150 }}>
      <Svg width="100%" height="100%" viewBox="0 0 260 100" preserveAspectRatio="none">
        <Line x1="0" y1="88" x2="260" y2="88" stroke={c.line} strokeWidth={1} />
        <Polyline points={coords} fill="none" stroke={c.accent} strokeWidth={3} />
      </Svg>
    </View>
  );
}
