/**
 * Wall auto-connection system
 * Based on SEDIT wall connection algorithm
 */

import { MapData, MAP_WIDTH, MAP_HEIGHT, WallConnection } from './types';

// Wall connection index mapping (16 states)
// Maps connection bitmask to tile index within wall type array
const WALL_INDEX_DATA = [
  15, 14, 11, 10, 12, 13, 8, 9, 3, 2, 7, 6, 0, 1, 4, 5
];

// Default wall types (15 types, 16 tiles each)
// Each array contains tile IDs for all 16 connection states
const DEFAULT_WALL_TYPES: number[][] = [
  // Type 0: Basic Wall
  [49, 10, 47, 51, 50, 89, 9, 7, 48, 8, 46, 11, 52, 6, 12, 13],
  // Type 1: Stone Wall
  [54, 60, 53, 18, 59, 20, 58, 15, 56, 57, 55, 19, 17, 14, 16, 13],
  // Type 2: Metal Wall
  [258, 259, 257, 262, 220, 177, 260, 216, 256, 219, 218, 222, 261, 217, 221, 178],
  // Type 3: Dark Wall
  [311, 312, 310, 315, 273, 232, 313, 269, 309, 272, 271, 275, 314, 270, 274, 268],
  // Type 4: Tech Wall
  [391, 392, 390, 395, 353, 396, 393, 349, 389, 352, 351, 355, 394, 350, 354, 356],
  // Type 5: Crystal Wall
  [476, 477, 475, 556, 514, 557, 554, 434, 474, 477, 476, 516, 455, 435, 515, 517],
  // Type 6: Pattern A
  [538, 539, 540, 537, 578, 579, 580, 577, 618, 619, 620, 617, 658, 659, 660, 13],
  // Type 7: Pattern B
  [505, 506, 507, 504, 545, 546, 547, 544, 585, 586, 587, 584, 625, 626, 627, 13],
  // Type 8: Tile Block A
  [698, 699, 700, 701, 738, 739, 740, 741, 778, 779, 780, 781, 818, 819, 820, 821],
  // Type 9: Tile Block B
  [694, 695, 696, 697, 734, 735, 736, 737, 774, 775, 776, 777, 814, 815, 816, 817],
  // Type 10: Blue Metal
  [2724, 2725, 2726, 2727, 2764, 2765, 2766, 2767, 2804, 2805, 2806, 2807, 2844, 2845, 2846, 2847],
  // Type 11: Industrial
  [3040, 3041, 3042, 3084, 3080, 3081, 3082, 3083, 3120, 3121, 3122, 3124, 3163, 3161, 3164, 3044],
  // Type 12: Red Metal
  [2067, 2068, 2066, 2071, 2029, 2072, 2069, 2025, 2065, 2028, 2027, 2031, 2070, 2026, 2030, 2032],
  // Type 13: Purple Metal
  [2151, 2152, 2150, 2231, 2189, 2232, 2229, 2109, 2149, 2112, 2111, 2191, 2230, 2110, 2190, 2192],
  // Type 14: Gray Metal
  [1988, 1989, 1987, 1992, 1950, 1985, 1990, 1946, 1986, 1949, 1948, 1952, 1991, 1947, 1951, 1945]
];

// Wall type names
export const WALL_TYPE_NAMES = [
  'Basic', 'Stone', 'Metal', 'Dark', 'Tech',
  'Crystal', 'Pattern A', 'Pattern B', 'Block A', 'Block B',
  'Blue Metal', 'Industrial', 'Red Metal', 'Purple Metal', 'Gray Metal'
];

export class WallSystem {
  private wallTypes: number[][];
  private currentType: number = 0;
  private wallTileLookup: Set<number>;

  constructor() {
    this.wallTypes = [...DEFAULT_WALL_TYPES];
    this.wallTileLookup = this.buildLookupCache();
  }

  // Build a set of all wall tile IDs for quick lookup
  private buildLookupCache(): Set<number> {
    const cache = new Set<number>();
    for (const wallType of this.wallTypes) {
      for (const tile of wallType) {
        cache.add(tile);
      }
    }
    return cache;
  }

  // Check if a tile is a wall tile
  isWallTile(tile: number): boolean {
    // Wall tiles are static (bit 15 = 0)
    if ((tile & 0x8000) !== 0) return false;
    return this.wallTileLookup.has(tile);
  }

  // Get current wall type
  getWallType(): number {
    return this.currentType;
  }

  // Set current wall type
  setWallType(type: number): void {
    if (type >= 0 && type < this.wallTypes.length) {
      this.currentType = type;
    }
  }

  // Get wall type count
  getWallTypeCount(): number {
    return this.wallTypes.length;
  }

  // Get wall tile for specific connection state
  getWallTile(type: number, connections: number): number {
    if (type < 0 || type >= this.wallTypes.length) return 0;
    const index = WALL_INDEX_DATA[connections & 0xF];
    return this.wallTypes[type][index];
  }

  // Get connection flags for a position
  private getConnections(map: MapData, x: number, y: number): number {
    let flags = 0;

    // Check left
    if (x > 0 && this.isWallTile(map.tiles[y * MAP_WIDTH + (x - 1)])) {
      flags |= WallConnection.LEFT;
    }

    // Check right
    if (x < MAP_WIDTH - 1 && this.isWallTile(map.tiles[y * MAP_WIDTH + (x + 1)])) {
      flags |= WallConnection.RIGHT;
    }

    // Check up
    if (y > 0 && this.isWallTile(map.tiles[(y - 1) * MAP_WIDTH + x])) {
      flags |= WallConnection.UP;
    }

    // Check down
    if (y < MAP_HEIGHT - 1 && this.isWallTile(map.tiles[(y + 1) * MAP_WIDTH + x])) {
      flags |= WallConnection.DOWN;
    }

    return flags;
  }

  // Place a wall at position, auto-connecting to neighbors
  placeWall(map: MapData, x: number, y: number): void {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    // Get connections and place the wall
    const connections = this.getConnections(map, x, y);
    const tile = this.getWallTile(this.currentType, connections);
    map.tiles[y * MAP_WIDTH + x] = tile;

    // Update neighbors to connect to the new wall
    this.updateNeighbor(map, x - 1, y, WallConnection.RIGHT);
    this.updateNeighbor(map, x + 1, y, WallConnection.LEFT);
    this.updateNeighbor(map, x, y - 1, WallConnection.DOWN);
    this.updateNeighbor(map, x, y + 1, WallConnection.UP);

    map.modified = true;
  }

  // Update a neighbor wall to connect in a direction
  private updateNeighbor(map: MapData, x: number, y: number, addConnection: number): void {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    const index = y * MAP_WIDTH + x;
    const currentTile = map.tiles[index];

    // Only update if it's already a wall
    if (!this.isWallTile(currentTile)) return;

    // Find which wall type this neighbor is
    const wallType = this.findWallType(currentTile);
    if (wallType === -1) return;

    // Get current connections and add the new one
    const connections = this.getConnections(map, x, y);
    const newTile = this.getWallTile(wallType, connections);
    map.tiles[index] = newTile;
  }

  // Find which wall type a tile belongs to
  private findWallType(tile: number): number {
    for (let type = 0; type < this.wallTypes.length; type++) {
      if (this.wallTypes[type].includes(tile)) {
        return type;
      }
    }
    return -1;
  }

  // Remove a wall and update neighbors
  removeWall(map: MapData, x: number, y: number, replacementTile: number): void {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    const index = y * MAP_WIDTH + x;
    const currentTile = map.tiles[index];

    // Only proceed if it's a wall
    if (!this.isWallTile(currentTile)) return;

    // Replace with the specified tile
    map.tiles[index] = replacementTile;

    // Update neighbors (they no longer connect here)
    this.updateNeighborDisconnect(map, x - 1, y);
    this.updateNeighborDisconnect(map, x + 1, y);
    this.updateNeighborDisconnect(map, x, y - 1);
    this.updateNeighborDisconnect(map, x, y + 1);

    map.modified = true;
  }

  // Update neighbor after disconnection
  private updateNeighborDisconnect(map: MapData, x: number, y: number): void {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    const index = y * MAP_WIDTH + x;
    const currentTile = map.tiles[index];

    if (!this.isWallTile(currentTile)) return;

    const wallType = this.findWallType(currentTile);
    if (wallType === -1) return;

    // Recalculate connections (now missing one)
    const connections = this.getConnections(map, x, y);
    const newTile = this.getWallTile(wallType, connections);
    map.tiles[index] = newTile;
  }
}

export const wallSystem = new WallSystem();
