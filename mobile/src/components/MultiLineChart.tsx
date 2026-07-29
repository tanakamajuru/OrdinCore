import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Text, Row } from './ui';

// Explicit categorical palette — every series gets a visually distinct line (mirrors the web fix
// where two houses shared a near-black theme colour).
const PALETTE = ['#2563EB', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#0891B2', '#65A30D'];

type Row = Record<string, any> & { date?: string; week?: string };

/**
 * A labelled multi-series line chart — the mobile mirror of the web cross-service trajectory:
 * one coloured line per series, a legend, x-axis date labels and a y grid. Handles the empty case.
 */
export function MultiLineChart({ data, series, xKey = 'date', title, height = 200, empty }: {
  data: Row[]; series: string[]; xKey?: string; title?: string; height?: number; empty?: string;
}) {
  const { c } = useTheme();
  const W = 320, H = height, padL = 30, padR = 10, padT = 12, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  const clean = Array.isArray(data) ? data : [];
  // Show EVERY site, not only the ones with a non-zero value — a site with no risks plots a
  // flat line at zero (honest, and keeps domiciliary services on the chart instead of dropping
  // them). Only fall back to the empty state when there are no series/points at all.
  const cols = series.filter((s, i) => series.indexOf(s) === i);
  const hasData = clean.length > 1 && cols.length > 0;

  if (!hasData) {
    return (
      <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 14 }}>
        {!!title && <Text size={13} weight="700" style={{ marginBottom: 8 }}>{title}</Text>}
        <Text size={12.5} muted style={{ paddingVertical: 24, textAlign: 'center' }}>{empty || 'Not enough data to chart yet.'}</Text>
      </View>
    );
  }

  const max = Math.max(1, ...clean.flatMap((d) => cols.map((s) => Number(d[s]) || 0)));
  const n = clean.length;
  const x = (i: number) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / max) * plotH;

  // Show at most ~6 x labels to avoid crowding.
  const labelEvery = Math.ceil(n / 6);

  return (
    <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 14 }}>
      {!!title && <Text size={13} weight="700" style={{ marginBottom: 8 }}>{title}</Text>}
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* y grid + labels */}
        {[0, 0.5, 1].map((f, i) => {
          const gy = padT + plotH - f * plotH;
          return (
            <React.Fragment key={i}>
              <Line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke={c.lineSoft} strokeWidth={1} />
              <SvgText x={padL - 5} y={gy + 3} fontSize={8} fill={c.faint} textAnchor="end">{Math.round(max * f)}</SvgText>
            </React.Fragment>
          );
        })}
        {/* x labels */}
        {clean.map((d, i) => (i % labelEvery === 0 || i === n - 1) ? (
          <SvgText key={`x${i}`} x={x(i)} y={H - 8} fontSize={8} fill={c.faint} textAnchor="middle">{String(d[xKey] ?? '')}</SvgText>
        ) : null)}
        {/* series lines + end dots */}
        {cols.map((s, si) => {
          const col = PALETTE[si % PALETTE.length];
          const pts = clean.map((d, i) => `${x(i)},${y(Number(d[s]) || 0)}`).join(' ');
          return (
            <React.Fragment key={s}>
              <Polyline points={pts} fill="none" stroke={col} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
              <Circle cx={x(n - 1)} cy={y(Number(clean[n - 1][s]) || 0)} r={2.6} fill={col} />
            </React.Fragment>
          );
        })}
      </Svg>
      {/* legend */}
      <Row style={{ flexWrap: 'wrap', marginTop: 8 }} gap={12}>
        {cols.map((s, si) => (
          <Row key={s} gap={5}>
            <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: PALETTE[si % PALETTE.length] }} />
            <Text size={11} muted>{s}</Text>
          </Row>
        ))}
      </Row>
    </View>
  );
}
