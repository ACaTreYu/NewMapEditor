/**
 * Tile encoding/decoding utilities
 * Based on SEDIT v2.02.00 tile data format
 */

import {
  ANIMATED_FLAG,
  ANIMATION_ID_MASK,
  FRAME_OFFSET_MASK,
  FRAME_OFFSET_SHIFT,
  TileInfo,
  MAP_WIDTH
} from './types';

// Check if a tile value represents an animated tile
export function isAnimatedTile(tile: number): boolean {
  return (tile & ANIMATED_FLAG) !== 0;
}

// Check if a tile is a static tile
export function isStaticTile(tile: number): boolean {
  return (tile & ANIMATED_FLAG) === 0;
}

// Get the animation ID from an animated tile value
export function getAnimationId(tile: number): number {
  return tile & ANIMATION_ID_MASK;
}

// Get the frame offset from an animated tile value
export function getFrameOffset(tile: number): number {
  return (tile >> FRAME_OFFSET_SHIFT) & FRAME_OFFSET_MASK;
}

// Create a static tile value
export function makeStaticTile(tileId: number): number {
  return tileId & 0x7FFF;
}

// Create an animated tile value
export function makeAnimatedTile(animId: number, frameOffset: number = 0): number {
  return ANIMATED_FLAG | ((frameOffset & FRAME_OFFSET_MASK) << FRAME_OFFSET_SHIFT) | (animId & ANIMATION_ID_MASK);
}

// Create a warp tile value
// Warp encoding: 0x8000 | ((destWarp * 10 + srcWarp) << 8) | 0xFA
// Only animation 0xFA works as a functional warp in-game
export function makeWarpTile(srcWarp: number, destWarp: number): number {
  return ANIMATED_FLAG | ((destWarp * 10 + srcWarp) << 8) | 0xFA;
}

// Get tile info for display/debugging
export function getTileInfo(tile: number, x: number, y: number): TileInfo {
  const isAnimated = isAnimatedTile(tile);

  return {
    value: tile,
    isAnimated,
    tileId: isAnimated ? getAnimationId(tile) : tile,
    frameOffset: isAnimated ? getFrameOffset(tile) : undefined,
    x,
    y
  };
}

// Convert x,y coordinates to tile array index
export function coordsToIndex(x: number, y: number): number {
  return y * MAP_WIDTH + x;
}

// Convert tile array index to x,y coordinates
export function indexToCoords(index: number): { x: number; y: number } {
  return {
    x: index % MAP_WIDTH,
    y: Math.floor(index / MAP_WIDTH)
  };
}

// Warp animation IDs for detection
export const WARP_ANIM_IDS = [0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0x9E];

// Check if a tile is a warp
export function isWarpTile(tile: number): boolean {
  if (!isAnimatedTile(tile)) return false;
  const animId = getAnimationId(tile);
  return WARP_ANIM_IDS.includes(animId);
}

// Flag pole animation IDs by team
export const FLAG_POLE_IDS: Record<number, number[]> = {
  0: [0x1C, 0x19, 0x1A, 0x1B, 0x80], // Green
  1: [0x20, 0x25, 0x22, 0x23, 0x81], // Red
  2: [0x28, 0x29, 0x2E, 0x2B, 0x82], // Blue
  3: [0x3A, 0x3B, 0x3C, 0x41, 0x83]  // Yellow
};

// Switch animation ID
export const SWITCH_ANIM_ID = 0x7B;

// Neutral flag animation ID
export const NEUTRAL_FLAG_ANIM_ID = 0x8C;

// Powerup position tiles
export const POWERUP_TILES = [36, 37, 38, 39, 76, 77, 78, 79];

// Check if a tile is a powerup position
export function isPowerupTile(tile: number): boolean {
  if (isAnimatedTile(tile)) return false;
  return POWERUP_TILES.includes(tile);
}

// Check if a tile is a switch
export function isSwitchTile(tile: number): boolean {
  if (!isAnimatedTile(tile)) return false;
  return getAnimationId(tile) === SWITCH_ANIM_ID;
}

// Check if a tile is a neutral flag
export function isNeutralFlagTile(tile: number): boolean {
  if (!isAnimatedTile(tile)) return false;
  return getAnimationId(tile) === NEUTRAL_FLAG_ANIM_ID;
}

// Get team from flag pole tile
export function getFlagPoleTeam(tile: number): number | null {
  if (!isAnimatedTile(tile)) return null;
  const animId = getAnimationId(tile);

  for (const [team, ids] of Object.entries(FLAG_POLE_IDS)) {
    if (ids.includes(animId)) {
      return parseInt(team);
    }
  }
  return null;
}
