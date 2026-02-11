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

  // Separate minimized windows from arrangeable windows
  const minimized: [string, WindowState][] = [];
  const arrangeable: [string, WindowState][] = [];

  for (const [id, state] of windowStates) {
    if (state.isMinimized) {
      minimized.push([id, state]);
    } else {
      // If maximized, restore to saved bounds first
      const restored = state.isMaximized && state.savedBounds
        ? { ...state, ...state.savedBounds, isMaximized: false, savedBounds: null }
        : state;
      arrangeable.push([id, restored]);
    }
  }

  const result = new Map<string, WindowState>();
  let zIndex = BASE_Z_INDEX;
  let cascadeIndex = 0;

  // Arrange non-minimized windows
  for (const [id, state] of arrangeable) {
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

  // Add minimized windows back unchanged
  for (const [id, state] of minimized) {
    result.set(id, state);
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

  // Separate minimized windows from arrangeable windows
  const minimized: [string, WindowState][] = [];
  const arrangeable: [string, WindowState][] = [];

  for (const [id, state] of windowStates) {
    if (state.isMinimized) {
      minimized.push([id, state]);
    } else {
      // If maximized, restore to saved bounds first
      const restored = state.isMaximized && state.savedBounds
        ? { ...state, ...state.savedBounds, isMaximized: false, savedBounds: null }
        : state;
      arrangeable.push([id, restored]);
    }
  }

  const result = new Map<string, WindowState>();
  const count = arrangeable.length;
  const height = count > 0 ? Math.floor(workspaceHeight / count) : workspaceHeight;
  let zIndex = BASE_Z_INDEX;
  let yOffset = 0;

  // Arrange non-minimized windows
  for (const [id, state] of arrangeable) {
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

  // Add minimized windows back unchanged
  for (const [id, state] of minimized) {
    result.set(id, state);
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

  // Separate minimized windows from arrangeable windows
  const minimized: [string, WindowState][] = [];
  const arrangeable: [string, WindowState][] = [];

  for (const [id, state] of windowStates) {
    if (state.isMinimized) {
      minimized.push([id, state]);
    } else {
      // If maximized, restore to saved bounds first
      const restored = state.isMaximized && state.savedBounds
        ? { ...state, ...state.savedBounds, isMaximized: false, savedBounds: null }
        : state;
      arrangeable.push([id, restored]);
    }
  }

  const result = new Map<string, WindowState>();
  const count = arrangeable.length;
  const width = count > 0 ? Math.floor(workspaceWidth / count) : workspaceWidth;
  let zIndex = BASE_Z_INDEX;
  let xOffset = 0;

  // Arrange non-minimized windows
  for (const [id, state] of arrangeable) {
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

  // Add minimized windows back unchanged
  for (const [id, state] of minimized) {
    result.set(id, state);
  }

  return result;
}
