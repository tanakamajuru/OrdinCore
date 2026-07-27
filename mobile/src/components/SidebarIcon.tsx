import React from 'react';
import Svg, { Rect, Line, Path } from 'react-native-svg';

/**
 * Sidebar toggle icon — a rounded panel with a filled left rail.
 *  - closed: just the panel (shown top-right to OPEN the drawer)
 *  - open:   panel + a right-pointing arrow (shown in the drawer to CLOSE it)
 */
export function SidebarIcon({ size = 22, color = '#111', open = false }: { size?: number; color?: string; open?: boolean }) {
  const s = size;
  const railX = s * 0.34; // divider position
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4.5} width={18} height={15} rx={3} stroke={color} strokeWidth={1.8} />
      <Line x1={railX * (24 / s) + 1.2} y1={4.5} x2={railX * (24 / s) + 1.2} y2={19.5} stroke={color} strokeWidth={1.8} />
      {/* filled left rail */}
      <Rect x={4.4} y={6} width={2.4} height={12} rx={1} fill={color} />
      {open && (
        // arrow pointing right, in the main panel area
        <Path d="M11.5 12 h5 M14.5 9.6 l2.4 2.4 l-2.4 2.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </Svg>
  );
}
