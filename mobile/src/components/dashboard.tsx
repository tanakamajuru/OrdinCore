import React from 'react';
import { View, Pressable } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Text, Row } from './ui';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

// Mirrors the web StatCard: label + big value, tinted icon, delta line, optional "view →" link.
export function StatCard({ icon, tint, label, value, delta, deltaColor, footer, viewLabel, onView, onPress }: {
  icon: FeatherName; tint: string; label: string; value: React.ReactNode;
  delta?: string; deltaColor?: string; footer?: React.ReactNode; viewLabel?: string; onView?: () => void; onPress?: () => void;
}) {
  const { c } = useTheme();
  const Wrap: any = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress} style={{ flex: 1, minWidth: 150, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 12 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text muted size={11}>{label}</Text>
          <Text size={24} weight="600" style={{ marginTop: 2, letterSpacing: -0.5 }}>{value}</Text>
        </View>
        <View style={{ width: 34, height: 34, borderRadius: radius.md, backgroundColor: tint + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={17} color={tint} />
        </View>
      </Row>
      {!!delta && <Text size={11} color={deltaColor || c.muted} style={{ marginTop: 8 }}>{delta}</Text>}
      {!!footer && <Row gap={10} style={{ marginTop: 8, flexWrap: 'wrap' }}>{footer}</Row>}
      {!!viewLabel && (
        <Pressable onPress={onView} style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.lineSoft }}>
          <Row gap={4}><Text size={11} color={c.accent}>{viewLabel}</Text><Feather name="arrow-right" size={11} color={c.accent} /></Row>
        </Pressable>
      )}
    </Wrap>
  );
}

// Titled card panel with an optional "view all →" footer — the web's dashboard panel.
export function Section({ title, note, children, viewLabel, onView }: {
  title: string; note?: string; children: React.ReactNode; viewLabel?: string; onView?: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 14 }}>
      <Row style={{ marginBottom: 10, alignItems: 'baseline' }} gap={6}>
        <Text weight="600" size={15}>{title}</Text>
        {!!note && <Text muted size={11}>{note}</Text>}
      </Row>
      {children}
      {!!viewLabel && (
        <Pressable onPress={onView} style={{ marginTop: 12, alignItems: 'center' }}>
          <Row gap={4}><Text size={11.5} color={c.accent}>{viewLabel}</Text><Feather name="arrow-right" size={12} color={c.accent} /></Row>
        </Pressable>
      )}
    </View>
  );
}

// A multi-segment donut (react-native-svg) with a total in the centre — the web's
// "Signals by Theme" chart, adapted for mobile.
export function Donut({ data, total, size = 128, stroke = 18, centerLabel = 'Total', center }: {
  data: { value: number; color: string }[]; total: number; size?: number; stroke?: number; centerLabel?: string; center?: string;
}) {
  const { c } = useTheme();
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  const segs = total > 0 ? data : [{ value: 1, color: c.line }];
  const denom = total > 0 ? total : 1;
  let acc = 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          {segs.map((d, i) => {
            const dash = (d.value / denom) * C;
            const el = (
              <Circle key={i} cx={cx} cy={cy} r={r} stroke={d.color} strokeWidth={stroke} fill="none"
                strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc} />
            );
            acc += dash;
            return el;
          })}
        </G>
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text size={center ? 18 : 20} weight="600">{center ?? total}</Text>
        <Text faint size={9.5}>{centerLabel}</Text>
      </View>
    </View>
  );
}

// Small horizontal bar (for effectiveness / status breakdowns).
export function MiniBar({ segments }: { segments: { value: number; color: string }[] }) {
  const { c } = useTheme();
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <Row gap={0} style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: c.lineSoft }}>
      {segments.map((s, i) => (
        <View key={i} style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }} />
      ))}
    </Row>
  );
}

export const THEME_COLORS = ['#2F6CB5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#ec4899', '#14b8a6'];
