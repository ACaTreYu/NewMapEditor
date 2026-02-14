/**
 * Shared measurement formatting utilities for ruler tool
 */

import { RulerMode } from '@core/editor/slices/globalSlice';

type RulerMeasurement = {
  mode: RulerMode;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  dx?: number;
  dy?: number;
  manhattan?: number;
  euclidean?: number;
  angle?: number;
  width?: number;
  height?: number;
  tileCount?: number;
  waypoints?: Array<{ x: number; y: number }>;
  totalDistance?: number;
  segmentAngles?: number[];
  centerX?: number;
  centerY?: number;
  radius?: number;
  area?: number;
};

export const formatMeasurement = (m: RulerMeasurement): string => {
  if (m.mode === RulerMode.LINE) {
    const dx = Math.abs(m.endX - m.startX);
    const dy = Math.abs(m.endY - m.startY);
    const angleStr = m.angle !== undefined ? `, ${m.angle.toFixed(1)}°` : '';
    return `Line: ${dx}×${dy} (${dx + dy} tiles, ${Math.hypot(dx, dy).toFixed(1)} dist${angleStr})`;
  } else if (m.mode === RulerMode.RECTANGLE) {
    const w = Math.abs(m.endX - m.startX) + 1;
    const h = Math.abs(m.endY - m.startY) + 1;
    return `Rect: ${w}×${h} (${w * h} tiles)`;
  } else if (m.mode === RulerMode.PATH) {
    const segCount = m.segmentAngles?.length ?? 0;
    const segInfo = segCount > 0 ? `, ${segCount} segs` : '';
    return `Path: ${m.waypoints?.length ?? 0} pts (${(m.totalDistance ?? 0).toFixed(1)} dist${segInfo})`;
  } else if (m.mode === RulerMode.RADIUS) {
    return `Radius: ${(m.radius ?? 0).toFixed(1)} (${(m.area ?? 0).toFixed(0)} area)`;
  }
  return '';
};
