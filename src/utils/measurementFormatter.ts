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
  width?: number;
  height?: number;
  tileCount?: number;
  waypoints?: Array<{ x: number; y: number }>;
  totalDistance?: number;
  centerX?: number;
  centerY?: number;
  radius?: number;
  area?: number;
};

export const formatMeasurement = (m: RulerMeasurement): string => {
  if (m.mode === RulerMode.LINE) {
    const dx = Math.abs(m.endX - m.startX);
    const dy = Math.abs(m.endY - m.startY);
    return `Line: ${dx}×${dy} (${dx + dy} tiles, ${Math.hypot(dx, dy).toFixed(1)} dist)`;
  } else if (m.mode === RulerMode.RECTANGLE) {
    const w = Math.abs(m.endX - m.startX) + 1;
    const h = Math.abs(m.endY - m.startY) + 1;
    return `Rect: ${w}×${h} (${w * h} tiles)`;
  } else if (m.mode === RulerMode.PATH) {
    return `Path: ${m.waypoints?.length ?? 0} pts (${(m.totalDistance ?? 0).toFixed(1)} dist)`;
  } else if (m.mode === RulerMode.RADIUS) {
    return `Radius: ${(m.radius ?? 0).toFixed(1)} (${(m.area ?? 0).toFixed(0)} area)`;
  }
  return '';
};
