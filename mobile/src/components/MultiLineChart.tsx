/**
 * components/MultiLineChart.tsx
 * Lightweight multi-series line chart drawn with react-native-svg.
 * Used for the Director "Organisation risk trajectory" chart and any
 * other deteriorating/improving trend line across roles.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

export type ChartSeries = {
  label: string;
  color: string;
  points: number[]; // y-values, same length as `xLabels`
};

export function MultiLineChart({
  series,
  xLabels,
  height = 160,
  width,
  yMin = 0,
  yMax = 100,
  yTicks = ['Low', 'Medium', 'High'],
}: {
  series: ChartSeries[];
  xLabels: string[];
  height?: number;
  width?: number;
  yMin?: number;
  yMax?: number;
  yTicks?: string[];
}) {
  const { colors, fontSize } = useTheme();
  const [containerWidth, setContainerWidth] = React.useState(width ?? 300);
  const padding = { top: 10, right: 10, bottom: 24, left: 48 };
  const chartW = containerWidth - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xStep = xLabels.length > 1 ? chartW / (xLabels.length - 1) : 0;
  const yScale = (v: number) => padding.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  const xScale = (i: number) => padding.left + i * xStep;

  return (
    <View
      style={{ width: '100%' }}
      onLayout={(e) => {
        if (!width) setContainerWidth(e.nativeEvent.layout.width);
      }}
    >
      <Svg width={containerWidth} height={height}>
        {/* y-axis gridlines + labels */}
        {yTicks.map((tick, i) => {
          const y = padding.top + (chartH / (yTicks.length - 1)) * i;
          return (
            <React.Fragment key={tick}>
              <Line
                x1={padding.left}
                y1={y}
                x2={containerWidth - padding.right}
                y2={y}
                stroke={colors.border}
                strokeWidth={1}
              />
              <SvgText
                x={padding.left - 8}
                y={y + 4}
                fontSize={fontSize.xs}
                fill={colors.textMuted}
                textAnchor="end"
              >
                {tick}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* series lines + points */}
        {series.map((s) => {
          const pts = s.points.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');
          return (
            <React.Fragment key={s.label}>
              <Polyline points={pts} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" />
              {s.points.map((v, i) => (
                <Circle key={i} cx={xScale(i)} cy={yScale(v)} r={3.5} fill={s.color} />
              ))}
            </React.Fragment>
          );
        })}

        {/* x-axis labels */}
        {xLabels.map((label, i) => (
          <SvgText
            key={label + i}
            x={xScale(i)}
            y={height - 4}
            fontSize={fontSize.xs}
            fill={colors.textMuted}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
