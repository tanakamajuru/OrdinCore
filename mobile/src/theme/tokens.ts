/**
 * theme/tokens.ts
 * Single source of truth for colour, spacing, radius and severity styling.
 * No external design-system dependency — every screen and component in
 * mobile/src/components/* consumes these tokens via ThemeProvider.
 */

export type ThemeMode = 'light' | 'dark';

export type SeverityLevel =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info'
  | 'success'
  | 'neutral';

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
};

const palette = {
  navy900: '#0B1E33',
  navy800: '#0F2A45',
  navy700: '#15374F',
  teal600: '#0E7C7B',
  teal500: '#14A19E',
  green600: '#1B8A3E',
  green100: '#E4F6E9',
  red600: '#D64545',
  red100: '#FCE9E9',
  orange600: '#E08A2B',
  orange100: '#FDF1E1',
  blue600: '#2E6FE0',
  blue100: '#E7EEFD',
  purple600: '#7B5CE0',
  purple100: '#EFEAFC',
  slate900: '#101828',
  slate700: '#344054',
  slate500: '#667085',
  slate300: '#D0D5DD',
  slate200: '#E4E7EC',
  slate100: '#F2F4F7',
  slate50: '#F9FAFB',
  white: '#FFFFFF',
};

/** Maps a semantic severity to a { bg, fg, dot } triplet used by Chip / StatusList / BoardItem. */
export function severityColor(mode: ThemeMode, level: SeverityLevel) {
  const map: Record<SeverityLevel, { bg: string; fg: string; dot: string }> = {
    critical: { bg: palette.red100, fg: palette.red600, dot: palette.red600 },
    high: { bg: palette.red100, fg: palette.red600, dot: palette.red600 },
    medium: { bg: palette.orange100, fg: palette.orange600, dot: palette.orange600 },
    low: { bg: palette.green100, fg: palette.green600, dot: palette.green600 },
    info: { bg: palette.blue100, fg: palette.blue600, dot: palette.blue600 },
    success: { bg: palette.green100, fg: palette.green600, dot: palette.green600 },
    neutral: {
      bg: mode === 'dark' ? palette.navy700 : palette.slate100,
      fg: mode === 'dark' ? palette.slate300 : palette.slate700,
      dot: palette.slate500,
    },
  };
  return map[level];
}

export function makeColors(mode: ThemeMode) {
  const isDark = mode === 'dark';
  return {
    mode,
    bg: isDark ? palette.navy900 : palette.slate50,
    surface: isDark ? palette.navy800 : palette.white,
    surfaceAlt: isDark ? palette.navy700 : palette.slate100,
    border: isDark ? palette.navy700 : palette.slate200,
    text: isDark ? palette.white : palette.slate900,
    textMuted: isDark ? palette.slate300 : palette.slate500,
    textInverse: isDark ? palette.slate900 : palette.white,
    primary: palette.teal600,
    primaryAlt: palette.teal500,
    accent: palette.blue600,
    danger: palette.red600,
    warning: palette.orange600,
    success: palette.green600,
    tabActive: palette.teal500,
    tabInactive: isDark ? palette.slate500 : palette.slate500,
    shadow: 'rgba(16, 24, 40, 0.08)',
  };
}

export const c = {
  light: makeColors('light'),
  dark: makeColors('dark'),
};

export type Colors = ReturnType<typeof makeColors>;
