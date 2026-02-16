/**
 * Game object tile data arrays
 * Exact data from SEdit customize.cpp static arrays
 * ANIM(a) = (a | 0x8000)
 */

// Flag data: 5 teams, 9 tiles each (3x3 grid)
// From static_flag_data[][] in customize.cpp:101-106
// Each tile is a unique animated tile ID
export const FLAG_DATA: number[][] = [
  // Green (team 0) - hFlagType=0
  [0x8042, 0x8043, 0x8044, 0x8045, 0x801C, 0x8047, 0x8048, 0x8049, 0x804A],
  // Red (team 1) - hFlagType=1
  [0x804B, 0x804C, 0x804D, 0x804E, 0x8025, 0x8050, 0x8051, 0x8052, 0x8053],
  // Blue (team 2) - hFlagType=2
  [0x8054, 0x8055, 0x8056, 0x8057, 0x802E, 0x8059, 0x805A, 0x805B, 0x805C],
  // Yellow (team 3) - hFlagType=3
  [0x805D, 0x805E, 0x805F, 0x8060, 0x8041, 0x8062, 0x8063, 0x8064, 0x8065],
  // Neutral (team 4) - hFlagType=4
  [0x8066, 0x8067, 0x8068, 0x8069, 0x808C, 0x806B, 0x806C, 0x806D, 0x806E],
];

// Pole data: 5 teams, 14 entries each
// First 9 = surround grid (3x3), entry 4 = -2 (center placeholder)
// Entries 9-13 = team center tiles (green, red, blue, yellow, neutral)
// From static_pole_data[][] in customize.cpp:109-114
export const POLE_DATA: number[][] = [
  // Green (team 0) - hPoleType=0
  [0x8042, 0x8043, 0x8044, 0x8045, -2, 0x8047, 0x8048, 0x8049, 0x804A, 0x801C, 0x8019, 0x801A, 0x801B, 0x8080],
  // Red (team 1) - hPoleType=1
  [0x804B, 0x804C, 0x804D, 0x804E, -2, 0x8050, 0x8051, 0x8052, 0x8053, 0x8020, 0x8025, 0x8022, 0x8023, 0x8081],
  // Blue (team 2) - hPoleType=2
  [0x8054, 0x8055, 0x8056, 0x8057, -2, 0x8059, 0x805A, 0x805B, 0x805C, 0x8028, 0x8029, 0x802E, 0x802B, 0x8082],
  // Yellow (team 3) - hPoleType=3
  [0x805D, 0x805E, 0x805F, 0x8060, -2, 0x8062, 0x8063, 0x8064, 0x8065, 0x803A, 0x803B, 0x803C, 0x8041, 0x8083],
  // Neutral (team 4) - hPoleType=4
  [0x8066, 0x8067, 0x8068, 0x8069, -2, 0x806B, 0x806C, 0x806D, 0x806E, 0x808C, 0x808C, 0x808C, 0x808C, 0x808C],
];

// Bunker data: 8 types (2 styles x 4 directions), 16 tiles each
// Index = style * 4 + direction (0=N, 1=E, 2=S, 3=W)
// From static_bunker_data[][] in customize.cpp:118-127
export const BUNKER_DATA: number[][] = [
  // Style 0 (Standard), Dir N
  [301, 302, 302, 303, 341, 337, 338, 343, 341, 377, 378, 343, 381, 417, 418, 383],
  // Style 0, Dir E
  [306, 307, 307, 308, 336, 337, 338, 348, 376, 377, 378, 348, 386, 387, 387, 388],
  // Style 0, Dir S
  [342, 297, 298, 344, 382, 337, 338, 384, 382, 377, 378, 384, 422, 423, 423, 424],
  // Style 0, Dir W
  [345, 346, 346, 347, 385, 337, 338, 339, 385, 377, 378, 379, 425, 426, 426, 427],
  // Style 1 (Industrial), Dir N
  [3085, 3086, 3086, 3087, 3125, 2885, 2886, 3127, 3125, 2925, 2926, 3127, 3165, 2965, 2966, 3167],
  // Style 1, Dir E
  [3090, 3091, 3091, 3092, 2885, 2886, 2887, 3132, 2925, 2926, 2927, 3132, 3170, 3171, 3171, 3172],
  // Style 1, Dir S
  [3126, 2885, 2886, 3128, 3166, 2925, 2926, 3168, 3166, 2965, 2966, 3168, 3206, 3207, 3207, 3208],
  // Style 1, Dir W
  [3129, 3130, 3130, 3131, 3169, 2885, 2886, 2887, 3169, 2925, 2926, 2927, 3209, 3210, 3210, 3211],
];

// Holding pen data: 2 types (0=static, 1=animated), 5 entries each
// [floor, green_center, red_center, blue_center, yellow_center]
// From static_holding_pen_data[][] in customize.cpp:137-139
export const HOLDING_PEN_DATA: number[][] = [
  // Type 0: Static
  [320, 146, 186, 276, 316],
  // Type 1: Animated
  [0x808B, 0x808D, 0x808E, 0x808F, 0x8090],
];

// Spawn data: 4 teams, 9 tiles each (3x3 cross) - Type 1 hardcoded
// Layout: [ ][N][ ] / [W][MID][E] / [ ][S][ ]  (-1 = skip corner)
export const SPAWN_DATA: number[][] = [
  // Green (team 0)
  [-1, 0x8008, -1, 0x800A, 147, 0x8009, -1, 0x800B, -1],
  // Red (team 1)
  [-1, 0x8004, -1, 0x8006, 187, 0x8005, -1, 0x8007, -1],
  // Blue (team 2)
  [-1, 0x8032, -1, 0x8034, 277, 0x8033, -1, 0x8035, -1],
  // Yellow (team 3)
  [-1, 0x8036, -1, 0x8038, 317, 0x8037, -1, 0x8039, -1],
];

// Animated warp: 3x3 block of animated tiles (9 animation IDs)
// Animation IDs 0x9A-0xA2 map to BigWarp TL/TM/TR/ML/MM/MR/BL/BM/BR
export const ANIMATED_WARP_PATTERN: number[] = [
  0x8000 | 0x9A, 0x8000 | 0x9B, 0x8000 | 0x9C,  // Top row
  0x8000 | 0x9D, 0x8000 | 0x9E, 0x8000 | 0x9F,  // Middle row (0x9E = center warp)
  0x8000 | 0xA0, 0x8000 | 0xA1, 0x8000 | 0xA2,  // Bottom row
];

// Conveyor Right data: hardcoded LR placement (8 tiles)
export const CONV_RIGHT_DATA: number[] = [
  0x8000 | 0xB7,  // Top-left (anim 0xB7)
  0x8000 | 0xB9,  // Top-middle (anim 0xB9)
  0x8000 | 0xB9,  // Top-middle repeat (anim 0xB9)
  0x8000 | 0xBB,  // Top-right (anim 0xBB)
  0x8000 | 0xB8,  // Bottom-left (anim 0xB8)
  0x8000 | 0xBA,  // Bottom-middle (anim 0xBA)
  0x8000 | 0xBA,  // Bottom-middle repeat (anim 0xBA)
  0x8000 | 0xBC,  // Bottom-right (anim 0xBC)
];

// Conveyor Down data: hardcoded UD placement (8 tiles)
export const CONV_DOWN_DATA: number[] = [
  0x8000 | 0x94,  // Top-left (anim 0x94)
  0x8000 | 0x95,  // Top-right (anim 0x95)
  0x8000 | 0x96,  // Middle-left (anim 0x96)
  0x8000 | 0x97,  // Middle-right (anim 0x97)
  0x8000 | 0x96,  // Middle-left repeat (anim 0x96)
  0x8000 | 0x97,  // Middle-right repeat (anim 0x97)
  0x8000 | 0x98,  // Bottom-left (anim 0x98)
  0x8000 | 0x99,  // Bottom-right (anim 0x99)
];

// Warp style tile base values
// From map.cpp:32 - warps[] = { 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0x9e }
export const WARP_STYLES: number[] = [0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0x9E];

// Encode a warp tile value
// Only 0xFA works as a functional warp in-game
export function encodeWarpTile(_style: number, src: number, dest: number): number {
  return 0xFA | 0x8000 | (((dest * 10) + src) << 8);
}

// --- Mutable arrays populated from custom.dat ---
// These start zeroed; CustomDatParser fills them when custom.dat is loaded.

export let bridgeLrData: number[][] = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -2]];
export let bridgeUdData: number[][] = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -2]];
export let spawnData: number[][] = [[0, 0, 0, 0, 0, 0, 0, 0, 0, -2, -2, -2, -2, -2, -2, -2]];
export let switchData: number[][] = [[0, 0, 0, 0, 0, 0, 0, 0, 0, -2, -2, -2, -2, -2, -2, -2]];
export let convLrData: number[][] = [[0, 0, 0, 0, 0, 0, 0, 0, -2, -2, -2, -2, -2, -2, -2, -2]];
export let convUdData: number[][] = [[0, 0, 0, 0, 0, 0, 0, 0, -2, -2, -2, -2, -2, -2, -2, -2]];

// Check if custom.dat data is loaded for a given tool type
export function hasCustomData(toolType: string): boolean {
  switch (toolType) {
    case 'bridge_lr':
    case 'bridge':
      return bridgeLrData.length > 0 && bridgeLrData[0][0] !== 0;
    case 'bridge_ud':
      return bridgeUdData.length > 0 && bridgeUdData[0][0] !== 0;
    case 'spawn':
      return true; // Hardcoded SPAWN_DATA always available
    case 'switch':
      return switchData.length > 0 && switchData[0][0] !== 0;
    case 'conv_lr':
    case 'conveyor':
      return convLrData.length > 0 && convLrData[0][0] !== 0;
    case 'conv_ud':
      return convUdData.length > 0 && convUdData[0][0] !== 0;
    default:
      return true;
  }
}

// Setters called by CustomDatParser
export function setBridgeLrData(data: number[][]): void { bridgeLrData = data; }
export function setBridgeUdData(data: number[][]): void { bridgeUdData = data; }
export function setSpawnData(data: number[][]): void { spawnData = data; }
export function setSwitchData(data: number[][]): void { switchData = data; }
export function setConvLrData(data: number[][]): void { convLrData = data; }
export function setConvUdData(data: number[][]): void { convUdData = data; }
