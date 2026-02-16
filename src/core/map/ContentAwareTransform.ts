/**
 * Content-aware tile transforms for rotation & mirroring.
 * Remaps wall connections, 3x3 object positions, bunker directions,
 * and conveyor/bridge orientations so objects look correct after transforms.
 */

import { WALL_INDEX_DATA, DEFAULT_WALL_TYPES } from './WallSystem';
import {
  FLAG_DATA, POLE_DATA, SPAWN_DATA, ANIMATED_WARP_PATTERN,
  BUNKER_DATA,
  switchData, bridgeLrData, bridgeUdData, convLrData, convUdData
} from './GameObjectData';
import type { MirrorDirection } from './SelectionTransforms';

// ============================================================
// Wall bitmask remapping
// ============================================================

const INDEX_TO_BITMASK: number[] = new Array(16);
for (let bitmask = 0; bitmask < 16; bitmask++) {
  INDEX_TO_BITMASK[WALL_INDEX_DATA[bitmask]] = bitmask;
}

const TILE_TO_WALL = new Map<number, { wallType: number; bitmask: number }>();
for (let wt = 0; wt < DEFAULT_WALL_TYPES.length; wt++) {
  const tiles = DEFAULT_WALL_TYPES[wt];
  for (let arrIdx = 0; arrIdx < tiles.length; arrIdx++) {
    TILE_TO_WALL.set(tiles[arrIdx], { wallType: wt, bitmask: INDEX_TO_BITMASK[arrIdx] });
  }
}

function rotateBitmaskCW(b: number): number {
  return ((b << 1) | (b >> 3)) & 0xF;
}
function rotateBitmaskCCW(b: number): number {
  return ((b >> 1) | (b << 3)) & 0xF;
}
function mirrorBitmaskH(b: number): number {
  return (b & 0xA) | ((b & 1) << 2) | ((b & 4) >> 2);
}
function mirrorBitmaskV(b: number): number {
  return (b & 0x5) | ((b & 2) << 2) | ((b & 8) >> 2);
}

// ============================================================
// 3x3 object position remapping (flags, poles, spawns, warps)
// ============================================================

// After spatial transform, tile originally at position X should display as position REMAP[X]
const REMAP_3x3_CW:      number[] = [2, 5, 8, 1, 4, 7, 0, 3, 6];
const REMAP_3x3_CCW:     number[] = [6, 3, 0, 7, 4, 1, 8, 5, 2];
const REMAP_3x3_HMIRROR: number[] = [2, 1, 0, 5, 4, 3, 8, 7, 6];
const REMAP_3x3_VMIRROR: number[] = [6, 7, 8, 3, 4, 5, 0, 1, 2];

interface Entry3x3 { tiles: number[]; position: number }
const TILE_TO_3x3 = new Map<number, Entry3x3>();

function register3x3(variants: number[][]): void {
  for (const variant of variants) {
    const tiles9 = variant.slice(0, 9);
    for (let pos = 0; pos < 9; pos++) {
      if (tiles9[pos] >= 0 && !TILE_TO_3x3.has(tiles9[pos])) {
        TILE_TO_3x3.set(tiles9[pos], { tiles: tiles9, position: pos });
      }
    }
  }
}

register3x3(FLAG_DATA);
register3x3(POLE_DATA);
register3x3(SPAWN_DATA);
// Warp 3x3 border tiles (center has variable routing offset, but pos 4→4 so no remap needed)
const WARP_3x3 = ANIMATED_WARP_PATTERN.slice(0, 9);
for (let pos = 0; pos < 9; pos++) {
  if (!TILE_TO_3x3.has(WARP_3x3[pos])) {
    TILE_TO_3x3.set(WARP_3x3[pos], { tiles: WARP_3x3, position: pos });
  }
}

// ============================================================
// Bunker direction + position remapping
// ============================================================

// Pattern indices used in placement: corners + edges (interior shared across dirs)
const BUNKER_USED_INDICES = [0, 1, 2, 3, 4, 7, 12, 13, 14, 15];

interface BunkerEntry { style: number; direction: number; dataIndex: number }
const TILE_TO_BUNKER = new Map<number, BunkerEntry>();
for (let style = 0; style < 2; style++) {
  for (let dir = 0; dir < 4; dir++) {
    const pattern = BUNKER_DATA[style * 4 + dir];
    for (const idx of BUNKER_USED_INDICES) {
      if (pattern[idx] > 0 && !TILE_TO_BUNKER.has(pattern[idx])) {
        TILE_TO_BUNKER.set(pattern[idx], { style, direction: dir, dataIndex: idx });
      }
    }
  }
}

// Data index remap: after spatial transform, tile at old index should become tile at new index
const BUNKER_IDX_CW:      Record<number, number> = { 0:12, 1:4, 2:4, 3:0, 4:13, 7:1, 12:15, 13:7, 14:7, 15:3 };
const BUNKER_IDX_CCW:     Record<number, number> = { 0:3, 1:7, 2:7, 3:15, 4:1, 7:13, 12:0, 13:4, 14:4, 15:12 };
const BUNKER_IDX_HMIRROR: Record<number, number> = { 0:3, 1:2, 2:1, 3:0, 4:7, 7:4, 12:15, 13:14, 14:13, 15:12 };
const BUNKER_IDX_VMIRROR: Record<number, number> = { 0:12, 1:13, 2:14, 3:15, 4:4, 7:7, 12:0, 13:1, 14:2, 15:3 };

// Direction transforms (N=0, E=1, S=2, W=3)
const DIR_CW      = [1, 2, 3, 0];
const DIR_CCW     = [3, 0, 1, 2];
const DIR_HMIRROR = [0, 3, 2, 1]; // swap E↔W
const DIR_VMIRROR = [2, 1, 0, 3]; // swap N↔S

// ============================================================
// Hardcoded conveyor tile maps
// ============================================================

// Unique tile values from CONV_RIGHT_DATA (LR) and CONV_DOWN_DATA (UD)
// Built from spatial rotation analysis of 4×2 ↔ 2×4 grids

function buildMap(pairs: [number, number][]): Map<number, number> {
  const m = new Map<number, number>();
  for (const [k, v] of pairs) m.set(k, v);
  return m;
}

const CONV_ROT_CW = buildMap([
  [0x80B8, 0x8094], [0x80B7, 0x8095], [0x80BA, 0x8096], [0x80B9, 0x8097], [0x80BC, 0x8098], [0x80BB, 0x8099],
  [0x8098, 0x80B7], [0x8096, 0x80B9], [0x8094, 0x80BB], [0x8099, 0x80B8], [0x8097, 0x80BA], [0x8095, 0x80BC],
]);
const CONV_ROT_CCW = buildMap([
  [0x80BB, 0x8094], [0x80BC, 0x8095], [0x80B9, 0x8096], [0x80BA, 0x8097], [0x80B7, 0x8098], [0x80B8, 0x8099],
  [0x8095, 0x80B7], [0x8097, 0x80B9], [0x8099, 0x80BB], [0x8094, 0x80B8], [0x8096, 0x80BA], [0x8098, 0x80BC],
]);
const CONV_HMIRROR = buildMap([
  [0x80B7, 0x80BB], [0x80BB, 0x80B7], [0x80B8, 0x80BC], [0x80BC, 0x80B8],
  [0x8094, 0x8095], [0x8095, 0x8094], [0x8096, 0x8097], [0x8097, 0x8096], [0x8098, 0x8099], [0x8099, 0x8098],
]);
const CONV_VMIRROR = buildMap([
  [0x80B7, 0x80B8], [0x80B8, 0x80B7], [0x80B9, 0x80BA], [0x80BA, 0x80B9], [0x80BB, 0x80BC], [0x80BC, 0x80BB],
  [0x8094, 0x8098], [0x8098, 0x8094], [0x8095, 0x8099], [0x8099, 0x8095],
]);

// ============================================================
// Dynamic data position mapping tables (bridges + custom conveyors)
// ============================================================

// Bridge LR data[i] → UD data[mapping[i]]  (and vice versa)
const BRIDGE_LR_TO_UD_CW  = [10, 12, 14,  5, 7, 9,  5, 7, 9,  5, 7, 9,  0, 2, 4];
const BRIDGE_UD_TO_LR_CW  = [12, 13, 13, 13, 14,  6, 7, 7, 7, 8,  0, 1, 1, 1, 2];
const BRIDGE_LR_TO_UD_CCW = [ 4,  2,  0,  9, 7, 5,  9, 7, 5,  9, 7, 5, 14, 12, 10];
const BRIDGE_UD_TO_LR_CCW = [ 2,  1,  1,  1, 0,  8, 7, 7, 7, 6, 14, 13, 13, 13, 12];
const BRIDGE_LR_HMIRROR   = [ 2,  1,  0,  5, 4, 3,  8, 7, 6, 11, 10, 9, 14, 13, 12];
const BRIDGE_LR_VMIRROR   = [12, 13, 14,  9, 10, 11, 6, 7, 8,  3, 4, 5,  0, 1, 2];
const BRIDGE_UD_HMIRROR   = [ 4,  3,  2,  1, 0,  9, 8, 7, 6, 5, 14, 13, 12, 11, 10];
const BRIDGE_UD_VMIRROR   = [10, 11, 12, 13, 14,  5, 6, 7, 8, 9,  0, 1, 2, 3, 4];

// Conveyor data[i] → other-direction data[mapping[i]]
const CONV_LR_TO_UD_CW  = [1, 3, 3, 7, 0, 2, 2, 6];
const CONV_UD_TO_LR_CW  = [3, 7, 1, 5, 1, 5, 0, 4];
const CONV_LR_TO_UD_CCW = [6, 2, 2, 0, 7, 3, 3, 1];
const CONV_UD_TO_LR_CCW = [4, 0, 5, 1, 5, 1, 7, 3];
const CONV_LR_HMIRROR   = [3, 2, 1, 0, 7, 6, 5, 4];
const CONV_LR_VMIRROR   = [4, 5, 6, 7, 0, 1, 2, 3];
const CONV_UD_HMIRROR   = [1, 0, 3, 2, 5, 4, 7, 6];
const CONV_UD_VMIRROR   = [6, 7, 4, 5, 2, 3, 0, 1];

// ============================================================
// Dynamic lookup builder (switches, bridges, conveyors from custom.dat)
// ============================================================

type TransformType = 'cw' | 'ccw' | 'hmirror' | 'vmirror';

/** Build a tile→tile remap map from mutable custom.dat data */
function buildDynamicLookup(transform: TransformType): Map<number, number> {
  const lookup = new Map<number, number>();

  // --- Switches (3x3 objects from custom.dat) ---
  const remap3x3 = transform === 'cw' ? REMAP_3x3_CW
    : transform === 'ccw' ? REMAP_3x3_CCW
    : transform === 'hmirror' ? REMAP_3x3_HMIRROR
    : REMAP_3x3_VMIRROR;

  for (const variant of switchData) {
    if (variant[0] === 0) continue; // not loaded
    const tiles9 = variant.slice(0, 9);
    for (let pos = 0; pos < 9; pos++) {
      const tile = tiles9[pos];
      if (tile >= 0 && tile !== 0 && !lookup.has(tile) && !TILE_TO_3x3.has(tile) && !TILE_TO_WALL.has(tile)) {
        lookup.set(tile, tiles9[remap3x3[pos]]);
      }
    }
  }

  // --- Bridges (LR ↔ UD swap for rotation, same-dir remap for mirror) ---
  const isRotation = transform === 'cw' || transform === 'ccw';
  const hasLr = bridgeLrData.length > 0 && bridgeLrData[0][0] !== 0;
  const hasUd = bridgeUdData.length > 0 && bridgeUdData[0][0] !== 0;

  if (isRotation && hasLr && hasUd) {
    const lrToUd = transform === 'cw' ? BRIDGE_LR_TO_UD_CW : BRIDGE_LR_TO_UD_CCW;
    const udToLr = transform === 'cw' ? BRIDGE_UD_TO_LR_CW : BRIDGE_UD_TO_LR_CCW;
    const count = Math.min(bridgeLrData.length, bridgeUdData.length);
    for (let v = 0; v < count; v++) {
      for (let i = 0; i < 15; i++) {
        const lrTile = bridgeLrData[v][i];
        const udTile = bridgeUdData[v][i];
        if (lrTile > 0 && !lookup.has(lrTile)) lookup.set(lrTile, bridgeUdData[v][lrToUd[i]]);
        if (udTile > 0 && !lookup.has(udTile)) lookup.set(udTile, bridgeLrData[v][udToLr[i]]);
      }
    }
  } else {
    // Mirror: remap within same orientation
    const lrMap = transform === 'hmirror' ? BRIDGE_LR_HMIRROR : BRIDGE_LR_VMIRROR;
    const udMap = transform === 'hmirror' ? BRIDGE_UD_HMIRROR : BRIDGE_UD_VMIRROR;
    if (hasLr) {
      for (const variant of bridgeLrData) {
        for (let i = 0; i < 15; i++) {
          if (variant[i] > 0 && !lookup.has(variant[i])) lookup.set(variant[i], variant[lrMap[i]]);
        }
      }
    }
    if (hasUd) {
      for (const variant of bridgeUdData) {
        for (let i = 0; i < 15; i++) {
          if (variant[i] > 0 && !lookup.has(variant[i])) lookup.set(variant[i], variant[udMap[i]]);
        }
      }
    }
  }

  // --- Custom conveyors (same approach as bridges) ---
  const hasConvLr = convLrData.length > 0 && convLrData[0][0] !== 0;
  const hasConvUd = convUdData.length > 0 && convUdData[0][0] !== 0;

  if (isRotation && hasConvLr && hasConvUd) {
    const lrToUd = transform === 'cw' ? CONV_LR_TO_UD_CW : CONV_LR_TO_UD_CCW;
    const udToLr = transform === 'cw' ? CONV_UD_TO_LR_CW : CONV_UD_TO_LR_CCW;
    const count = Math.min(convLrData.length, convUdData.length);
    for (let v = 0; v < count; v++) {
      for (let i = 0; i < 8; i++) {
        const lrTile = convLrData[v][i];
        const udTile = convUdData[v][i];
        if (lrTile > 0 && !lookup.has(lrTile)) lookup.set(lrTile, convUdData[v][lrToUd[i]]);
        if (udTile > 0 && !lookup.has(udTile)) lookup.set(udTile, convLrData[v][udToLr[i]]);
      }
    }
  } else {
    const lrMap = transform === 'hmirror' ? CONV_LR_HMIRROR : CONV_LR_VMIRROR;
    const udMap = transform === 'hmirror' ? CONV_UD_HMIRROR : CONV_UD_VMIRROR;
    if (hasConvLr) {
      for (const variant of convLrData) {
        for (let i = 0; i < 8; i++) {
          if (variant[i] > 0 && !lookup.has(variant[i])) lookup.set(variant[i], variant[lrMap[i]]);
        }
      }
    }
    if (hasConvUd) {
      for (const variant of convUdData) {
        for (let i = 0; i < 8; i++) {
          if (variant[i] > 0 && !lookup.has(variant[i])) lookup.set(variant[i], variant[udMap[i]]);
        }
      }
    }
  }

  return lookup;
}

// ============================================================
// Main remap functions
// ============================================================

/** Remap tile values in-place after rotation. Handles walls, 3x3 objects, bunkers, conveyors, bridges. */
export function remapTilesForRotation(tiles: Uint16Array, angle: 90 | -90): void {
  const isCW = angle === 90;
  const transformType: TransformType = isCW ? 'cw' : 'ccw';

  // Wall bitmask transform
  const wallXform = isCW ? rotateBitmaskCW : rotateBitmaskCCW;

  // 3x3 position remap table
  const remap3x3 = isCW ? REMAP_3x3_CW : REMAP_3x3_CCW;

  // Bunker tables
  const bunkerIdxMap = isCW ? BUNKER_IDX_CW : BUNKER_IDX_CCW;
  const bunkerDirMap = isCW ? DIR_CW : DIR_CCW;

  // Hardcoded conveyor map
  const convMap = isCW ? CONV_ROT_CW : CONV_ROT_CCW;

  // Dynamic lookup for custom.dat objects
  const dynLookup = buildDynamicLookup(transformType);

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];

    // 1. Wall bitmask remap (static tiles only)
    const wallInfo = TILE_TO_WALL.get(tile);
    if (wallInfo) {
      tiles[i] = DEFAULT_WALL_TYPES[wallInfo.wallType][WALL_INDEX_DATA[wallXform(wallInfo.bitmask) & 0xF]];
      continue;
    }

    // 2. Static 3x3 objects (flags, poles, spawns, warps)
    const info3x3 = TILE_TO_3x3.get(tile);
    if (info3x3) {
      tiles[i] = info3x3.tiles[remap3x3[info3x3.position]];
      continue;
    }

    // 3. Bunker corner/edge remap
    const bunkerInfo = TILE_TO_BUNKER.get(tile);
    if (bunkerInfo) {
      const newDir = bunkerDirMap[bunkerInfo.direction];
      const newIdx = bunkerIdxMap[bunkerInfo.dataIndex];
      if (newIdx !== undefined) {
        tiles[i] = BUNKER_DATA[bunkerInfo.style * 4 + newDir][newIdx];
      }
      continue;
    }

    // 4. Hardcoded conveyor remap
    const convResult = convMap.get(tile);
    if (convResult !== undefined) {
      tiles[i] = convResult;
      continue;
    }

    // 5. Dynamic custom.dat objects (switches, bridges, custom conveyors)
    const dynResult = dynLookup.get(tile);
    if (dynResult !== undefined) {
      tiles[i] = dynResult;
    }
  }
}

/** Remap tile values in-place after mirroring. Handles walls, 3x3 objects, bunkers, conveyors, bridges. */
export function remapTilesForMirror(tiles: Uint16Array, direction: MirrorDirection): void {
  const isH = direction === 'left' || direction === 'right';
  const transformType: TransformType = isH ? 'hmirror' : 'vmirror';

  // Wall bitmask transform
  const wallXform = isH ? mirrorBitmaskH : mirrorBitmaskV;

  // 3x3 position remap table
  const remap3x3 = isH ? REMAP_3x3_HMIRROR : REMAP_3x3_VMIRROR;

  // Bunker tables
  const bunkerIdxMap = isH ? BUNKER_IDX_HMIRROR : BUNKER_IDX_VMIRROR;
  const bunkerDirMap = isH ? DIR_HMIRROR : DIR_VMIRROR;

  // Hardcoded conveyor map
  const convMap = isH ? CONV_HMIRROR : CONV_VMIRROR;

  // Dynamic lookup for custom.dat objects
  const dynLookup = buildDynamicLookup(transformType);

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];

    // 1. Wall bitmask remap
    const wallInfo = TILE_TO_WALL.get(tile);
    if (wallInfo) {
      tiles[i] = DEFAULT_WALL_TYPES[wallInfo.wallType][WALL_INDEX_DATA[wallXform(wallInfo.bitmask) & 0xF]];
      continue;
    }

    // 2. Static 3x3 objects
    const info3x3 = TILE_TO_3x3.get(tile);
    if (info3x3) {
      tiles[i] = info3x3.tiles[remap3x3[info3x3.position]];
      continue;
    }

    // 3. Bunker corner/edge remap
    const bunkerInfo = TILE_TO_BUNKER.get(tile);
    if (bunkerInfo) {
      const newDir = bunkerDirMap[bunkerInfo.direction];
      const newIdx = bunkerIdxMap[bunkerInfo.dataIndex];
      if (newIdx !== undefined) {
        tiles[i] = BUNKER_DATA[bunkerInfo.style * 4 + newDir][newIdx];
      }
      continue;
    }

    // 4. Hardcoded conveyor remap
    const convResult = convMap.get(tile);
    if (convResult !== undefined) {
      tiles[i] = convResult;
      continue;
    }

    // 5. Dynamic custom.dat objects
    const dynResult = dynLookup.get(tile);
    if (dynResult !== undefined) {
      tiles[i] = dynResult;
    }
  }
}
