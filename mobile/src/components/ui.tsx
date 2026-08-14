/**
 * components/ui.tsx
 * Base primitives used across every role. Plain RN StyleSheet + inline
 * styles, themed via useTheme(). No third-party UI kit.
 */
import React from 'react';
import {
  View,
  Text as RNText,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import type { SeverityLevel } from '@/theme/tokens';

/* ---------------------------------- Screen --------------------------------- */

export function Screen({
  children,
  style,
  scroll = false,
  padded = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  scroll?: boolean;
  padded?: boolean;
}) {
  const { colors, spacing } = useTheme();
  const Container = scroll ? require('react-native').ScrollView : View;
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]} edges={['top']}>
      <Container
        style={[styles.flex, padded && { paddingHorizontal: spacing.lg }, style]}
        contentContainerStyle={scroll ? { paddingBottom: spacing.xxl } : undefined}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}

/* ----------------------------------- Text ----------------------------------- */

type TextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'label';

export function Text({
  variant = 'body',
  muted = false,
  weight,
  style,
  children,
  numberOfLines,
}: {
  variant?: TextVariant;
  muted?: boolean;
  weight?: TextStyle['fontWeight'];
  style?: TextStyle;
  children: React.ReactNode;
  numberOfLines?: number;
}) {
  const { colors, fontSize } = useTheme();
  const variantStyle: Record<TextVariant, TextStyle> = {
    title: { fontSize: fontSize.xxl, fontWeight: '700' },
    subtitle: { fontSize: fontSize.lg, fontWeight: '700' },
    body: { fontSize: fontSize.md, fontWeight: '400' },
    caption: { fontSize: fontSize.sm, fontWeight: '400' },
    label: { fontSize: fontSize.xs, fontWeight: '600', letterSpacing: 0.3 },
  };
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        { color: muted ? colors.textMuted : colors.text },
        variantStyle[variant],
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

/* ----------------------------------- Row ------------------------------------ */

export function Row({
  children,
  style,
  align = 'center',
  justify = 'flex-start',
  gap = 0,
  wrap = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  gap?: number;
  wrap?: boolean;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ----------------------------------- Chip ------------------------------------ */

export function Chip({
  label,
  tone = 'neutral',
  icon,
  size = 'md',
}: {
  label: string;
  tone?: SeverityLevel;
  icon?: keyof typeof Feather.glyphMap;
  size?: 'sm' | 'md';
}) {
  const { colors, radius, severityColor, mode, fontSize } = useTheme();
  const t = severityColor(mode, tone);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: t.bg,
        borderRadius: radius.pill,
        paddingHorizontal: size === 'sm' ? 8 : 10,
        paddingVertical: size === 'sm' ? 3 : 5,
      }}
    >
      {icon ? <Feather name={icon} size={size === 'sm' ? 10 : 12} color={t.fg} /> : null}
      <RNText
        style={{
          color: t.fg,
          fontSize: size === 'sm' ? fontSize.xs : fontSize.sm,
          fontWeight: '600',
        }}
      >
        {label}
      </RNText>
    </View>
  );
}

/* ----------------------------------- Field ----------------------------------- */

export function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Row justify="space-between" style={{ marginBottom: spacing.sm }}>
        <Text variant="subtitle" style={{ fontSize: 15 }}>
          {label}
        </Text>
        {optional ? (
          <Text variant="caption" muted>
            optional
          </Text>
        ) : null}
      </Row>
      {children}
    </View>
  );
}

/* --------------------------------- TextArea ---------------------------------- */

export function TextArea({
  value,
  onChangeText,
  placeholder,
  maxLength,
  ...rest
}: TextInputProps & { maxLength?: number }) {
  const { colors, radius, spacing, fontSize } = useTheme();
  return (
    <View>
      <TextInput
        multiline
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        maxLength={maxLength}
        style={{
          minHeight: 90,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
          fontSize: fontSize.md,
          color: colors.text,
          textAlignVertical: 'top',
          backgroundColor: colors.surface,
        }}
        {...rest}
      />
      {maxLength ? (
        <Text
          variant="caption"
          muted
          style={{ alignSelf: 'flex-end', marginTop: 4 }}
        >
          {(value?.length ?? 0)}/{maxLength}
        </Text>
      ) : null}
    </View>
  );
}

/* ----------------------------------- Button ----------------------------------- */

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  fullWidth = true,
  loading = false,
  accentColor,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  /** Per-role brand override (e.g. Care Worker's green) without touching global theme tokens. */
  accentColor?: string;
}) {
  const { colors, radius, spacing, fontSize } = useTheme();
  const brand = accentColor ?? colors.primary;

  const variants: Record<string, { bg: string; fg: string; border?: string }> = {
    primary: { bg: brand, fg: colors.textInverse },
    secondary: { bg: colors.surfaceAlt, fg: colors.text },
    outline: { bg: 'transparent', fg: brand, border: brand },
    ghost: { bg: 'transparent', fg: brand },
    danger: { bg: colors.danger, fg: colors.textInverse },
  };
  const v = variants[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: v.bg,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={16} color={v.fg} /> : null}
          <RNText style={{ color: v.fg, fontSize: fontSize.md, fontWeight: '700' }}>
            {label}
          </RNText>
        </>
      )}
    </Pressable>
  );
}

/* ----------------------------------- Card ------------------------------------- */

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const { colors, radius, spacing } = useTheme();
  const content = (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      {content}
    </Pressable>
  );
}

/* --------------------------------- ListItem ------------------------------------ */

export function ListItem({
  title,
  subtitle,
  leadingIcon,
  leadingColor,
  trailing,
  onPress,
  divider = true,
}: {
  title: string;
  subtitle?: string;
  leadingIcon?: keyof typeof Feather.glyphMap;
  leadingColor?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  divider?: boolean;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.7 : 1,
          gap: spacing.md,
        },
      ]}
    >
      {leadingIcon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.sm,
            backgroundColor: (leadingColor ?? colors.primary) + '22',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name={leadingIcon} size={17} color={leadingColor ?? colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="600">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" muted style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? (onPress ? <Feather name="chevron-right" size={18} color={colors.textMuted} /> : null)}
    </Pressable>
  );
}

/* ----------------------------------- Avatar ------------------------------------ */

export function Avatar({
  initials,
  size = 40,
  uri,
}: {
  initials?: string;
  size?: number;
  uri?: string;
}) {
  const { colors } = useTheme();
  if (uri) {
    const { Image } = require('react-native');
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <RNText style={{ color: colors.text, fontWeight: '700', fontSize: size * 0.38 }}>
        {initials}
      </RNText>
    </View>
  );
}

/* ----------------------------------- Loading ------------------------------------ */

export function Loading({ label }: { label?: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm }}>
      <ActivityIndicator color={colors.primary} />
      {label ? <Text muted>{label}</Text> : null}
    </View>
  );
}

/* ------------------------------------ Empty ------------------------------------- */

export function Empty({
  icon = 'inbox',
  title,
  message,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message?: string;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm }}>
      <Feather name={icon} size={28} color={colors.textMuted} />
      <Text variant="subtitle">{title}</Text>
      {message ? (
        <Text muted style={{ textAlign: 'center' }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

/* ------------------------------- SegmentedControl --------------------------------- */

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { colors, radius, spacing, fontSize } = useTheme();
  return (
    <Row gap={spacing.lg} style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={{
              paddingBottom: spacing.sm,
              borderBottomWidth: 2,
              borderBottomColor: active ? colors.primary : 'transparent',
              marginBottom: -1,
            }}
          >
            <RNText
              style={{
                color: active ? colors.primary : colors.textMuted,
                fontWeight: active ? '700' : '500',
                fontSize: fontSize.sm,
              }}
            >
              {opt}
            </RNText>
          </Pressable>
        );
      })}
    </Row>
  );
}

/** Pill-style variant used for compact filter bars (e.g. "All Sites", "Open"). */
export function FilterPill({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  const { colors, radius, spacing, fontSize } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
      }}
    >
      <RNText style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '600' }}>{label}</RNText>
      <Feather name="chevron-down" size={13} color={colors.textMuted} />
    </Pressable>
  );
}

/* ---------------------------------- ErrorNote ------------------------------------ */

export function ErrorNote({ message }: { message: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Row
      gap={spacing.sm}
      style={{
        backgroundColor: colors.danger + '15',
        borderRadius: radius.sm,
        padding: spacing.md,
      }}
    >
      <Feather name="alert-circle" size={16} color={colors.danger} />
      <Text style={{ color: colors.danger, flex: 1 }} variant="caption">
        {message}
      </Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
