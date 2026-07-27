import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { light, dark, withAccent, RoleAccent, Palette } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'ordin.theme.mode';

type ThemeValue = {
  c: Palette;
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeValue>({ c: light, scheme: 'light', mode: 'system', setMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Restore the saved preference once on mount.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => { if (v === 'light' || v === 'dark' || v === 'system') setModeState(v); })
      .catch(() => {});
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  };

  // The user's explicit choice wins; 'system' follows the OS.
  const scheme: 'light' | 'dark' = mode === 'system' ? systemScheme : mode;
  const c = scheme === 'dark' ? dark : light;

  return <ThemeContext.Provider value={{ c, scheme, mode, setMode }}>{children}</ThemeContext.Provider>;
}

// Re-themes a subtree with a role accent (e.g. green for Support Worker). Every useTheme()
// below it sees the swapped accent, so buttons, tabs and pills pick it up automatically.
// Mode/setMode are passed straight through so the theme switcher works from any accented screen.
export function AccentProvider({ role, children }: { role: RoleAccent; children: React.ReactNode }) {
  const { c, scheme, mode, setMode } = useTheme();
  return <ThemeContext.Provider value={{ c: withAccent(c, scheme, role), scheme, mode, setMode }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
