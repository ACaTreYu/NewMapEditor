/**
 * Pure functions for window arrangement algorithms (cascade, tile horizontal, tile vertical)
 */

import { WindowState } from './types';

const DEFAULT_WINDOW_WIDTH = 800;
const DEFAULT_WINDOW_HEIGHT = 600;
const CASCADE_OFFSET = 40;
const BASE_Z_INDEX = 1000;

/**
 * Cascade windows with 40px offset from (0,0)
 * Wraps back to (0,0) when window would exceed workspace bounds
 */
export function cascadeWindows(
  windowStates: Map<string, WindowState>,
  workspaceWidth: number,
  workspaceHeight: number
): Map<string, WindowState> {
  if (windowStates.size === 0) return new Map();

  const result = new Map<string, WindowState>();
  let zIndex = BASE_Z_INDEX;
  let cascadeIndex = 0;

  for (const [id, state] of windowStates) {
    let x = cascadeIndex * CASCADE_OFFSET;
    let y = cascadeIndex * CASCADE_OFFSET;

    // Wrap if window would exceed workspace bounds
    if (x + DEFAULT_WINDOW_WIDTH > workspaceWidth || y + DEFAULT_WINDOW_HEIGHT > workspaceHeight) {
      cascadeIndex = 0;
      x = 0;
      y = 0;
    }

    result.set(id, {
      ...state,
      x,
      y,
      width: DEFAULT_WINDOW_WIDTH,
      height: DEFAULT_WINDOW_HEIGHT,
      zIndex: zIndex++
    });

    cascadeIndex++;
  }

  return result;
}

/**
 * Tile windows horizontally (stack vertically, each spanning full width)
 */
export function tileWindowsHorizontal(
  windowStates: Map<string, WindowState>,
  workspaceWidth: number,
  workspaceHeight: number
): Map<string, WindowState> {
  if (windowStates.size === 0) return new Map();

  const result = new Map<string, WindowState>();
  const count = windowStates.size;
  const height = Math.floor(workspaceHeight / count);
  let zIndex = BASE_Z_INDEX;
  let yOffset = 0;

  for (const [id, state] of windowStates) {
    result.set(id, {
      ...state,
      x: 0,
      y: yOffset,
      width: workspaceWidth,
      height,
      zIndex: zIndex++
    });
    yOffset += height;
  }

  return result;
}

/**
 * Tile windows vertically (stack side by side, each spanning full height)
 */
export function tileWindowsVertical(
  windowStates: Map<string, WindowState>,
  workspaceWidth: number,
  workspaceHeight: number
): Map<string, WindowState> {
  if (windowStates.size === 0) return new Map();

  const result = new Map<string, WindowState>();
  const count = windowStates.size;
  const width = Math.floor(workspaceWidth / count);
  let zIndex = BASE_Z_INDEX;
  let xOffset = 0;

  for (const [id, state] of windowStates) {
    result.set(id, {
      ...state,
      x: xOffset,
      y: 0,
      width,
      height: workspaceHeight,
      zIndex: zIndex++
    });
    xOffset += width;
  }

  return result;
}
