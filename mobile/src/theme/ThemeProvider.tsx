/**
 * theme/ThemeProvider.tsx
 * Wraps the app, resolves light/dark from the OS (with manual override),
 * and hands every screen a single `useTheme()` hook.
 */
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { c, radius, spacing, fontSize, severityColor, type Colors, type ThemeMode } from './tokens';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: Colors;
  radius: typeof radius;
  spacing: typeof spacing;
  fontSize: typeof fontSize;
  severityColor: typeof severityColor;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialMode,
}: {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}) {
  const system = useColorScheme();
  const [override, setOverride] = useState<ThemeMode | null>(initialMode ?? null);
  const mode: ThemeMode = override ?? (system === 'dark' ? 'dark' : 'light');

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: c[mode],
      radius,
      spacing,
      fontSize,
      severityColor,
      setMode: setOverride,
      toggleMode: () => setOverride(mode === 'dark' ? 'light' : 'dark'),
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() must be used within <ThemeProvider>');
  return ctx;
}
