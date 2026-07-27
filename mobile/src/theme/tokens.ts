// Design tokens — matched to the OrdinCore WEB design system (frontend/src/styles/theme.css)
// so the app reads as the same product: cobalt-blue primary, light-blue borders, a flat
// (near-shadowless) surface treatment, and the web's semantic success/warning/destructive.

export type Palette = {
  paper: string; card: string; screen: string;
  ink: string; muted: string; faint: string;
  line: string; lineSoft: string;
  accent: string; accent2: string; accentInk: string; accentTint: string;
  sevCrit: string; sevHigh: string; sevMod: string; sevLow: string;
  overlay: string;
};

// Light — web: --background #F7F9FB · --card #fff · --primary (cobalt) #2F6CB5 · --border #B8D3EA
export const light: Palette = {
  paper: '#f7f9fb', card: '#ffffff', screen: '#f7f9fb',
  ink: '#171717', muted: '#5b6470', faint: '#8a94a0',
  line: '#b8d3ea', lineSoft: '#dce8f0',
  accent: '#2f6cb5', accent2: '#255c9c', accentInk: '#ffffff', accentTint: 'rgba(47,108,181,0.10)',
  sevCrit: '#d32f2f', sevHigh: '#ed6c02', sevMod: '#c77700', sevLow: '#2e7d32',
  overlay: 'rgba(11,22,40,0.45)',
};

// Dark — web: --background #0B1628 (navy) · --card #1A3259 (steel) · --border #2A4A6B
export const dark: Palette = {
  paper: '#0b1628', card: '#1a3259', screen: '#0b1628',
  ink: '#dce8f0', muted: '#a8cde8', faint: '#7e93ab',
  line: '#2a4a6b', lineSoft: '#223b57',
  accent: '#3f82cf', accent2: '#2f6cb5', accentInk: '#ffffff', accentTint: 'rgba(91,159,212,0.16)',
  sevCrit: '#ef5350', sevHigh: '#ffb74d', sevMod: '#fbc02d', sevLow: '#66bb6a',
  overlay: 'rgba(0,0,0,0.55)',
};

// Per-role accents. The web system is cobalt-blue throughout, but the mobile comp gives each
// role its own accent so a Support Worker's capture flow reads green, a Team Leader's purple, etc.
// Only the accent family is swapped — surfaces, ink and severity colours stay shared.
type Accent = Pick<Palette, 'accent' | 'accent2' | 'accentInk' | 'accentTint'>;
export type RoleAccent = 'blue' | 'green' | 'purple' | 'orange' | 'violet';

export const accents: Record<'light' | 'dark', Record<RoleAccent, Accent>> = {
  light: {
    blue:   { accent: '#2f6cb5', accent2: '#255c9c', accentInk: '#ffffff', accentTint: 'rgba(47,108,181,0.10)' },
    green:  { accent: '#17a05a', accent2: '#128049', accentInk: '#ffffff', accentTint: 'rgba(23,160,90,0.10)' },
    purple: { accent: '#6d3fcf', accent2: '#5a2fb5', accentInk: '#ffffff', accentTint: 'rgba(109,63,207,0.10)' },
    orange: { accent: '#e07a1f', accent2: '#c26514', accentInk: '#ffffff', accentTint: 'rgba(224,122,31,0.10)' },
    violet: { accent: '#7c4dff', accent2: '#6633e6', accentInk: '#ffffff', accentTint: 'rgba(124,77,255,0.10)' },
  },
  dark: {
    blue:   { accent: '#3f82cf', accent2: '#2f6cb5', accentInk: '#ffffff', accentTint: 'rgba(91,159,212,0.16)' },
    green:  { accent: '#34c27a', accent2: '#17a05a', accentInk: '#04140b', accentTint: 'rgba(52,194,122,0.16)' },
    purple: { accent: '#9a72e6', accent2: '#7c4dff', accentInk: '#ffffff', accentTint: 'rgba(154,114,230,0.18)' },
    orange: { accent: '#f0964a', accent2: '#e07a1f', accentInk: '#1a0e02', accentTint: 'rgba(240,150,74,0.18)' },
    violet: { accent: '#a98bff', accent2: '#7c4dff', accentInk: '#ffffff', accentTint: 'rgba(169,139,255,0.18)' },
  },
};

// Returns a palette with the given role accent swapped in. Used by AccentProvider to re-theme a subtree.
export const withAccent = (p: Palette, scheme: 'light' | 'dark', role: RoleAccent): Palette =>
  ({ ...p, ...accents[scheme][role] });

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
// Web radii: --radius 6px, --radius-card 12px. Tighter, more "enterprise" than the old app.
export const radius = { sm: 6, md: 8, lg: 12, xl: 14, pill: 999 };

export const severityColor = (p: Palette, sev?: string) => {
  switch (String(sev || '').toLowerCase()) {
    case 'critical': return p.sevCrit;
    case 'high': return p.sevHigh;
    case 'moderate':
    case 'medium': return p.sevMod;
    case 'low': return p.sevLow;
    default: return p.muted;
  }
};

export const trajectoryColor = (p: Palette, dir?: string) => {
  switch (String(dir || '').toLowerCase()) {
    case 'deteriorating': return p.sevHigh;
    case 'improving': return p.sevLow;
    default: return p.muted;
  }
};
