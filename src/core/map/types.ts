/**
 * Core map data types for SubSpace/Continuum map format
 * Based on SEDIT v2.02.00 technical analysis
 */

// Map constants
export const MAP_WIDTH = 256;
export const MAP_HEIGHT = 256;
export const TILE_SIZE = 16;
export const TILE_COUNT = MAP_WIDTH * MAP_HEIGHT; // 65536
export const MAP_MAGIC = 0x4278; // "Bx"
export const DEFAULT_TILE = 280;

// Tile encoding constants
export const ANIMATED_FLAG = 0x8000;
export const ANIMATION_ID_MASK = 0xFF;
export const FRAME_OFFSET_MASK = 0x7F;
export const FRAME_OFFSET_SHIFT = 8;

// File format versions
export enum MapVersion {
  V1_RAW = 1,      // Raw uncompressed (131072 bytes)
  V2_LEGACY = 2,   // Legacy compressed
  V3_CURRENT = 3   // Current format
}

// Objective types
export enum ObjectiveType {
  FRAG = 0,    // Deathmatch
  FLAG = 1,    // Capture the flag
  SWITCH = 2,  // Control switches
  ASSASSIN = 3,
  DOMINATION = 4,
  FFA = 5      // Free-For-All
}

// Team indices
export enum Team {
  GREEN = 0,
  RED = 1,
  BLUE = 2,
  YELLOW = 3,
  NEUTRAL = 4
}

export const MAX_TEAMS = 5;

// Map header structure
export interface MapHeader {
  id: number;              // Magic number (0x4278)
  dataOffset: number;      // Offset to compressed data
  version: MapVersion;     // File format version
  width: number;           // Map width (256)
  height: number;          // Map height (256)
  maxPlayers: number;      // Maximum players (1-16)
  holdingTime: number;     // Flag holding time (seconds)
  numTeams: number;        // Number of teams (1-4)
  objective: ObjectiveType; // Game type
  laserDamage: number;     // Laser damage level
  specialDamage: number;   // Special weapon damage
  rechargeRate: number;    // Energy recharge rate
  missilesEnabled: boolean;
  bombsEnabled: boolean;
  bounciesEnabled: boolean;
  powerupCount: number;    // Total powerups in map
  maxSimulPowerups: number; // Max simultaneous powerups
  switchCount: number;     // Number of switches
  flagCount: number[];     // Flags per team [4]
  flagPoleCount: number[]; // Flag poles per team [4]
  flagPoleData: Uint8Array[]; // Flag pole position data per team
  name: string;            // Map name
  description: string;     // Map description
  neutralCount: number;    // Neutral flag count
  extendedSettings: Record<string, number>; // Extended game settings
}

// Complete map data
export interface MapData {
  header: MapHeader;
  tiles: Uint16Array;      // 65536 tile values
  filePath?: string;       // Source file path (if loaded)
  modified: boolean;       // Has unsaved changes
}

// Animation structure (from Gfx.dll)
export interface Animation {
  id: number;
  frameCount: number;      // 1-32
  speed: number;           // Tick delay (0 = 255)
  frames: number[];        // Static tile IDs for each frame
}

// Tile info for display/debugging
export interface TileInfo {
  value: number;
  isAnimated: boolean;
  tileId: number;          // Static tile ID or animation ID
  frameOffset?: number;    // For animated tiles
  x: number;
  y: number;
}

// Editor tool types
export enum ToolType {
  SELECT = 'select',
  PENCIL = 'pencil',
  FILL = 'fill',
  LINE = 'line',
  WALL = 'wall',
  PICKER = 'picker',
  RULER = 'ruler',
  MIRROR = 'mirror',
  // Game object tools - click-to-stamp
  FLAG = 'flag',
  FLAG_POLE = 'flag_pole',
  SPAWN = 'spawn',
  SWITCH = 'switch',
  WARP = 'warp',
  // Game object tools - drag-to-rectangle
  BUNKER = 'bunker',
  HOLDING_PEN = 'holding_pen',
  BRIDGE = 'bridge',
  CONVEYOR = 'conveyor',
  // Wall drawing tools
  WALL_PENCIL = 'wall_pencil',
  WALL_RECT = 'wall_rect'
}

// Game object tool options state
export interface GameObjectToolState {
  selectedTeam: Team;
  warpSrc: number;
  warpDest: number;
  warpStyle: number;
  spawnType: number;
  spawnVariant: number;  // 0 = static (3x3 cross), 1 = animated (single tile)
  warpVariant: number;   // 0 = single encoded, 1 = 3x3 animated block
  bunkerDir: number;
  bunkerStyle: number;
  holdingPenType: number;
  bridgeDir: number;
  conveyorDir: number;
  switchType: number;
  flagPadType: number;
}

// Rectangle drag state for drag-to-rectangle tools
export interface RectDragState {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// Wall connection flags
export const WallConnection = {
  LEFT: 0x1,
  UP: 0x2,
  RIGHT: 0x4,
  DOWN: 0x8
} as const;

// Create default header
// Default values match SEdit's CreateNewMap() (map.cpp:2774-2848)
export function createDefaultHeader(): MapHeader {
  return {
    id: MAP_MAGIC,
    dataOffset: 26,
    version: MapVersion.V3_CURRENT,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    maxPlayers: 16,
    holdingTime: 15, // SEdit: map.cpp:2789
    numTeams: 2,
    objective: ObjectiveType.FLAG,
    laserDamage: 2, // SEdit: map.cpp:2794
    specialDamage: 2, // SEdit: map.cpp:2795
    rechargeRate: 2, // SEdit: map.cpp:2796
    missilesEnabled: true,
    bombsEnabled: true,
    bounciesEnabled: true,
    powerupCount: 0,
    maxSimulPowerups: 12, // SEdit: map.cpp:2801
    switchCount: 0,
    flagCount: [0, 0, 0, 0],
    flagPoleCount: [0, 0, 0, 0],
    flagPoleData: [new Uint8Array(0), new Uint8Array(0), new Uint8Array(0), new Uint8Array(0)],
    name: 'New Map', // SEdit: map.cpp:2833
    description: 'New map', // SEdit: map.cpp:2834
    neutralCount: 0,
    extendedSettings: {}
  };
}

// Create empty map
export function createEmptyMap(): MapData {
  const tiles = new Uint16Array(TILE_COUNT);
  tiles.fill(DEFAULT_TILE);

  return {
    header: createDefaultHeader(),
    tiles,
    modified: false
  };
}
