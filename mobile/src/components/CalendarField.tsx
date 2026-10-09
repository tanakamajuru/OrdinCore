import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, Row } from '@/components/ui';

// A lightweight month calendar for picking an exact date — no native dependency, works in the
// release APK. Value/onChange use 'YYYY-MM-DD'. Past dates are disabled by default.
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function CalendarField({ value, onChange, minDate, maxDate, allowPast = false }: { value: string; onChange: (v: string) => void; minDate?: string; maxDate?: string; allowPast?: boolean }) {
  const { c } = useTheme();
  const today = ymd(new Date());
  const min = minDate || (allowPast ? '' : today);
  const initial = value ? new Date(`${value}T12:00:00`) : new Date();
  const [view, setView] = useState({ y: initial.getFullYear(), m: initial.getMonth() });

  const first = new Date(view.y, view.m, 1);
  const startPad = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(ymd(new Date(view.y, view.m, d)));
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const step = (delta: number) => setView((v) => { const nm = v.m + delta; return { y: v.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 }; });

  return (
    <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 10, backgroundColor: c.card }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Pressable onPress={() => step(-1)} hitSlop={10} style={{ padding: 6 }}><Text size={18} weight="700" color={c.accent}>‹</Text></Pressable>
        <Text size={13} weight="600">{monthLabel}</Text>
        <Pressable onPress={() => step(1)} hitSlop={10} style={{ padding: 6 }}><Text size={18} weight="700" color={c.accent}>›</Text></Pressable>
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        {WEEK.map((w) => <View key={w} style={{ flex: 1, alignItems: 'center' }}><Text size={10} color={c.muted}>{w}</Text></View>)}
      </Row>
      {Array.from({ length: cells.length / 7 }).map((_, r) => (
        <Row key={r} style={{ justifyContent: 'space-between', marginTop: 4 }}>
          {cells.slice(r * 7, r * 7 + 7).map((iso, i) => {
            if (!iso) return <View key={i} style={{ flex: 1, height: 34 }} />;
            const disabled = (!!min && iso < min) || (!!maxDate && iso > maxDate);
            const selected = iso === value;
            const day = Number(iso.slice(8, 10));
            return (
              <Pressable key={i} disabled={disabled} onPress={() => onChange(iso)}
                style={{ flex: 1, height: 34, alignItems: 'center', justifyContent: 'center', marginHorizontal: 1, borderRadius: 8, backgroundColor: selected ? c.accent : 'transparent' }}>
                <Text size={13} weight={selected ? '700' : '400'} color={selected ? '#fff' : disabled ? c.faint : c.ink}>{day}</Text>
              </Pressable>
            );
          })}
        </Row>
      ))}
    </View>
  );
}

export default CalendarField;
