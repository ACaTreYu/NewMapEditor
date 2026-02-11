/**
 * Selection transformation algorithms for in-place rotation and mirroring
 * Pure functions that operate on tile arrays without side effects
 */

export interface RotationResult {
  tiles: Uint16Array;
  width: number;
  height: number;
}

/**
 * Rotate selection 90° clockwise
 * Algorithm: Transpose then reverse rows
 * Result: 3x5 becomes 5x3, tiles rotated 90° CW
 *
 * Example:
 *   [1 2 3]       [7 4 1]
 *   [4 5 6]  -->  [8 5 2]
 *   [7 8 9]       [9 6 3]
 *
 * @param tiles - Source tile array (row-major order)
 * @param width - Source width
 * @param height - Source height
 * @returns Rotated tiles with new dimensions (height×width)
 */
export function rotate90Clockwise(
  tiles: Uint16Array,
  width: number,
  height: number
): RotationResult {
  const result = new Uint16Array(width * height);

  // Transpose then reverse rows = 90° clockwise
  // New dimensions: height×width
  // New[y][x] = Old[x][height-1-y]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const oldIndex = y * width + x;
      const newX = y;
      const newY = width - 1 - x;
      const newIndex = newY * height + newX;
      result[newIndex] = tiles[oldIndex];
    }
  }

  return {
    tiles: result,
    width: height,
    height: width
  };
}

/**
 * Rotate selection 90° counter-clockwise
 * Algorithm: Transpose then reverse columns
 * Result: 3x5 becomes 5x3, tiles rotated 90° CCW
 *
 * Example:
 *   [1 2 3]       [3 6 9]
 *   [4 5 6]  -->  [2 5 8]
 *   [7 8 9]       [1 4 7]
 *
 * @param tiles - Source tile array (row-major order)
 * @param width - Source width
 * @param height - Source height
 * @returns Rotated tiles with new dimensions (height×width)
 */
export function rotate90CounterClockwise(
  tiles: Uint16Array,
  width: number,
  height: number
): RotationResult {
  const result = new Uint16Array(width * height);

  // Transpose then reverse columns = 90° counter-clockwise
  // New dimensions: height×width
  // New[y][x] = Old[width-1-x][y]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const oldIndex = y * width + x;
      const newX = height - 1 - y;
      const newY = x;
      const newIndex = newY * height + newX;
      result[newIndex] = tiles[oldIndex];
    }
  }

  return {
    tiles: result,
    width: height,
    height: width
  };
}

/**
 * Rotate selection 180°
 * Algorithm: Reverse array order
 * Result: Dimensions unchanged, tiles reversed
 *
 * Example:
 *   [1 2 3]       [9 8 7]
 *   [4 5 6]  -->  [6 5 4]
 *   [7 8 9]       [3 2 1]
 *
 * @param tiles - Source tile array (row-major order)
 * @param width - Source width
 * @param height - Source height
 * @returns Rotated tiles with same dimensions
 */
export function rotate180(
  tiles: Uint16Array,
  width: number,
  height: number
): RotationResult {
  const result = new Uint16Array(tiles.length);

  // Simple reversal for 180° rotation
  for (let i = 0; i < tiles.length; i++) {
    result[i] = tiles[tiles.length - 1 - i];
  }

  return {
    tiles: result,
    width,
    height
  };
}

/**
 * Rotate selection by specified angle
 * Dispatcher function that calls appropriate rotation algorithm
 *
 * @param tiles - Source tile array (row-major order)
 * @param width - Source width
 * @param height - Source height
 * @param angle - Rotation angle (90, -90, 180, -180)
 * @returns Rotated tiles with new dimensions
 */
export function rotate(
  tiles: Uint16Array,
  width: number,
  height: number,
  angle: 90 | -90 | 180 | -180
): RotationResult {
  switch (angle) {
    case 90:
      return rotate90Clockwise(tiles, width, height);
    case -90:
      return rotate90CounterClockwise(tiles, width, height);
    case 180:
    case -180: // -180° is mathematically identical to 180°
      return rotate180(tiles, width, height);
    default:
      // TypeScript should prevent this, but handle gracefully
      throw new Error(`Invalid rotation angle: ${angle}`);
  }
}

// Mirror direction types
export type MirrorDirection = 'right' | 'left' | 'up' | 'down';

/**
 * Mirror selection horizontally (left-to-right flip)
 * Algorithm: Reverse each row independently
 * Result: Dimensions unchanged, tiles reversed horizontally
 *
 * Example:
 *   [1 2 3]       [3 2 1]
 *   [4 5 6]  -->  [6 5 4]
 *   [7 8 9]       [9 8 7]
 *
 * @param tiles - Source tile array (row-major order)
 * @param width - Source width
 * @param height - Source height
 * @returns Mirrored tiles with same dimensions
 */
export function mirrorHorizontal(
  tiles: Uint16Array,
  width: number,
  height: number
): RotationResult {
  const result = new Uint16Array(width * height);

  // Reverse each row independently
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const oldIndex = y * width + x;
      const newX = width - 1 - x;
      const newIndex = y * width + newX;
      result[newIndex] = tiles[oldIndex];
    }
  }

  return {
    tiles: result,
    width,
    height
  };
}

/**
 * Mirror selection vertically (top-to-bottom flip)
 * Algorithm: Reverse row order
 * Result: Dimensions unchanged, rows reversed
 *
 * Example:
 *   [1 2 3]       [7 8 9]
 *   [4 5 6]  -->  [4 5 6]
 *   [7 8 9]       [1 2 3]
 *
 * @param tiles - Source tile array (row-major order)
 * @param width - Source width
 * @param height - Source height
 * @returns Mirrored tiles with same dimensions
 */
export function mirrorVertical(
  tiles: Uint16Array,
  width: number,
  height: number
): RotationResult {
  const result = new Uint16Array(width * height);

  // Reverse row order
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const oldIndex = y * width + x;
      const newY = height - 1 - y;
      const newIndex = newY * width + x;
      result[newIndex] = tiles[oldIndex];
    }
  }

  return {
    tiles: result,
    width,
    height
  };
}

/**
 * Mirror selection in specified direction
 * Dispatcher function that calls appropriate mirror algorithm
 *
 * Note: The algorithm is based on the flip direction, not the placement direction.
 * - 'right' and 'left' both use horizontal flip (placement differs)
 * - 'up' and 'down' both use vertical flip (placement differs)
 *
 * @param tiles - Source tile array (row-major order)
 * @param width - Source width
 * @param height - Source height
 * @param direction - Mirror direction ('right', 'left', 'up', 'down')
 * @returns Mirrored tiles with same dimensions
 */
export function mirror(
  tiles: Uint16Array,
  width: number,
  height: number,
  direction: MirrorDirection
): RotationResult {
  switch (direction) {
    case 'right':
    case 'left':
      // Both use horizontal flip (placement logic differs in caller)
      return mirrorHorizontal(tiles, width, height);
    case 'up':
    case 'down':
      // Both use vertical flip (placement logic differs in caller)
      return mirrorVertical(tiles, width, height);
    default:
      // TypeScript should prevent this, but handle gracefully
      throw new Error(`Invalid mirror direction: ${direction}`);
  }
}
