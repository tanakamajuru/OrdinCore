/**
 * components/board.tsx
 * The dashboard/card kit reused across every role: metric tiles, tappable
 * status rows, checklists, donut summaries. Built on top of ui.tsx.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import type { SeverityLevel } from '@/theme/tokens';
import { Text, Row, Card } from './ui';

/** Shared severity/status vocabulary used by StatusList, BoardItem, Chip. */
export type Tone = SeverityLevel | 'deteriorating' | 'stable' | 'improving';

function toneToSeverity(tone: Tone): SeverityLevel {
  if (tone === 'deteriorating') return 'high';
  if (tone === 'improving') return 'success';
  if (tone === 'stable') return 'info';
  return tone;
}

const trendIcon: Record<string, keyof typeof Feather.glyphMap> = {
  deteriorating: 'trending-up',
  improving: 'trending-down',
  stable: 'arrow-right',
};

/* --------------------------------- BoardHeader ----------------------------------- */

export function BoardHeader({
  title,
  subtitle,
  onMenuPress,
  onBellPress,
  badge,
  right,
}: {
  title: string;
  subtitle?: string;
  onMenuPress?: () => void;
  onBellPress?: () => void;
  badge?: number;
  right?: React.ReactNode;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ paddingTop: spacing.sm, paddingBottom: spacing.lg }}>
      <Row justify="space-between" align="flex-start">
        <Row gap={spacing.md} align="center">
          {onMenuPress ? (
            <Pressable onPress={onMenuPress} hitSlop={10}>
              <Feather name="menu" size={22} color={colors.text} />
            </Pressable>
          ) : null}
          <View>
            <Text variant="subtitle">{title}</Text>
            {subtitle ? (
              <Text variant="caption" muted style={{ marginTop: 2 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </Row>
        {right ??
          (onBellPress ? (
            <Pressable onPress={onBellPress} hitSlop={10} style={{ position: 'relative' }}>
              <Feather name="bell" size={20} color={colors.text} />
              {badge ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.danger,
                  }}
                />
              ) : null}
            </Pressable>
          ) : null)}
      </Row>
    </View>
  );
}

/* ----------------------------------- Metrics -------------------------------------- */

export type Metric = {
  label: string;
  value: string | number;
  icon?: keyof typeof Feather.glyphMap;
  tone?: Tone;
  sublabel?: string;
};

export function Metrics({ items, columns = 2 }: { items: Metric[]; columns?: 2 | 4 }) {
  const { colors, radius, spacing, severityColor, mode } = useTheme();
  const widthPct = columns === 2 ? '48%' : '23.5%';
  return (
    <Row wrap gap={spacing.md} style={{ marginBottom: spacing.md }}>
      {items.map((m, i) => {
        const t = severityColor(mode, toneToSeverity(m.tone ?? 'neutral'));
        return (
          <View
            key={i}
            style={{
              width: widthPct as any,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
            }}
          >
            {m.icon ? (
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: radius.sm,
                  backgroundColor: t.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.sm,
                }}
              >
                <Feather name={m.icon} size={15} color={t.fg} />
              </View>
            ) : null}
            <Text variant="title" style={{ fontSize: 24 }}>
              {m.value}
            </Text>
            <Text variant="body" weight="600" style={{ marginTop: 2 }}>
              {m.label}
            </Text>
            {m.sublabel ? (
              <Text variant="caption" muted style={{ marginTop: 1 }}>
                {m.sublabel}
              </Text>
            ) : null}
          </View>
        );
      })}
    </Row>
  );
}

/* --------------------------------- SectionTitle ------------------------------------ */

export function SectionTitle({
  title,
  action,
  onActionPress,
}: {
  title: string;
  action?: string;
  onActionPress?: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Row justify="space-between" style={{ marginBottom: spacing.sm, marginTop: spacing.md }}>
      <Text variant="subtitle" style={{ fontSize: 16 }}>
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onActionPress}>
          <Text style={{ color: colors.primary }} weight="600" variant="caption">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </Row>
  );
}

/* ---------------------------------- StatusList -------------------------------------- */

export type StatusRow = {
  id: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
  badge?: number | string;
  trailingText?: string;
};

export function StatusList({
  rows,
  onPressRow,
}: {
  rows: StatusRow[];
  onPressRow?: (row: StatusRow) => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Card style={{ padding: spacing.sm }}>
      {rows.map((row, i) => (
        <BoardItem
          key={row.id}
          row={row}
          divider={i < rows.length - 1}
          onPress={onPressRow ? () => onPressRow(row) : undefined}
        />
      ))}
    </Card>
  );
}

/** A single tappable row inside StatusList, also usable standalone. */
export function BoardItem({
  row,
  divider = true,
  onPress,
}: {
  row: StatusRow;
  divider?: boolean;
  onPress?: () => void;
}) {
  const { colors, spacing, severityColor, mode } = useTheme();
  const t = row.tone ? severityColor(mode, toneToSeverity(row.tone)) : null;
  const icon = row.tone && trendIcon[row.tone] ? trendIcon[row.tone] : 'circle';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="600">
          {row.title}
        </Text>
        {row.subtitle ? (
          <Text variant="caption" muted style={{ marginTop: 2 }}>
            {row.subtitle}
          </Text>
        ) : null}
      </View>
      <Row gap={6}>
        {row.trailingText ? (
          <Row gap={4}>
            {t ? <Feather name={icon} size={13} color={t.fg} /> : null}
            <Text variant="caption" style={{ color: t?.fg }} weight="600">
              {row.trailingText}
            </Text>
          </Row>
        ) : row.badge !== undefined ? (
          <View
            style={{
              minWidth: 22,
              height: 22,
              paddingHorizontal: 6,
              borderRadius: 11,
              backgroundColor: t?.dot ?? colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12 }} weight="700">
              {row.badge}
            </Text>
          </View>
        ) : null}
        {onPress ? <Feather name="chevron-right" size={16} color={colors.textMuted} /> : null}
      </Row>
    </Pressable>
  );
}

/* ---------------------------------- Checklist -------------------------------------- */

export type ChecklistItem = { id: string; label: string; done?: boolean };

export function Checklist({
  items,
  onToggle,
}: {
  items: ChecklistItem[];
  onToggle?: (id: string) => void;
}) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onToggle?.(item.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: radius.xs,
              borderWidth: 2,
              borderColor: item.done ? colors.primary : colors.border,
              backgroundColor: item.done ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.done ? <Feather name="check" size={13} color="#fff" /> : null}
          </View>
          <Text
            style={item.done ? { textDecorationLine: 'line-through', color: colors.textMuted } : undefined}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* --------------------------------- PercentDonut -------------------------------------- */

export function PercentDonut({
  percent,
  size = 96,
  strokeWidth = 12,
  label,
  segments,
}: {
  percent?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  /** Optional multi-segment mode: [{ value, color }], values should sum ~100 */
  segments?: { value: number; color: string }[];
}) {
  const { colors } = useTheme();
  const radiusPx = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  const center = size / 2;

  if (segments && segments.length) {
    let offsetAcc = 0;
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radiusPx}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {segments.map((seg, i) => {
            const dash = (seg.value / 100) * circumference;
            const circle = (
              <Circle
                key={i}
                cx={center}
                cy={center}
                r={radiusPx}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offsetAcc}
                strokeLinecap="butt"
                rotation={-90}
                origin={`${center}, ${center}`}
              />
            );
            offsetAcc += dash;
            return circle;
          })}
        </Svg>
        {label ? (
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="subtitle" style={{ fontSize: size * 0.2 }}>
              {label}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  const p = Math.max(0, Math.min(100, percent ?? 0));
  const dash = (p / 100) * circumference;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radiusPx} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radiusPx}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="subtitle" style={{ fontSize: size * 0.22 }}>
          {label ?? `${p}%`}
        </Text>
      </View>
    </View>
  );
}

/* ---------------------------------- BoardButton -------------------------------------- */

export function BoardButton({
  label,
  icon,
  onPress,
  tone = 'neutral',
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  tone?: Tone;
}) {
  const { severityColor, mode, radius, spacing } = useTheme();
  const t = severityColor(mode, toneToSeverity(tone));
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: t.bg,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {icon ? <Feather name={icon} size={16} color={t.fg} /> : null}
      <Text style={{ color: t.fg }} weight="700">
        {label}
      </Text>
    </Pressable>
  );
}
