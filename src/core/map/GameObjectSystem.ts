/**
 * Game object placement system
 * Exact placement logic from SEdit map.cpp
 */

import { MapData, MAP_WIDTH, MAP_HEIGHT, ObjectiveType, Team } from './types';
import {
  FLAG_DATA,
  POLE_DATA,
  BUNKER_DATA,
  HOLDING_PEN_DATA,
  SPAWN_DATA,
  ANIMATED_WARP_PATTERN,
  encodeWarpTile,
  switchData,
} from './GameObjectData';
import { wallSystem } from './WallSystem';
import { makeAnimatedTile } from './TileEncoding';

// Wall data index constants used by holding pen (from SEdit wall connection indices)
// These are the wall_data[0][index] values for specific connection states
// SEdit holding pen uses: 0=TL corner, 2=TR corner, 7=vertical edge,
//                          8=BL corner, 10=BR corner, 13=horizontal edge
const WALL_TYPE_0_INDICES = {
  TL_CORNER: 0,   // wall_data[0][0]
  TR_CORNER: 2,   // wall_data[0][2]
  V_EDGE: 7,      // wall_data[0][7]
  BL_CORNER: 8,   // wall_data[0][8]
  BR_CORNER: 10,  // wall_data[0][10]
  H_EDGE: 13,     // wall_data[0][13]
};

class GameObjectSystemClass {

  // Place a 3x3 stamp at top-left (x,y) - SEdit origin convention
  // SEdit iterates: for i = y to y+2, for j = x to x+2
  private stamp3x3(map: MapData, x: number, y: number, tiles: number[]): boolean {
    for (let i = y; i < y + 3; i++) {
      if (i < 0 || i >= MAP_HEIGHT) continue;
      for (let j = x; j < x + 3; j++) {
        if (j < 0 || j >= MAP_WIDTH) continue;
        const tileVal = tiles[(i - y) * 3 + (j - x)];
        if (tileVal >= 0) {
          map.tiles[i * MAP_WIDTH + j] = tileVal;
        }
      }
    }
    map.modified = true;
    return true;
  }

  // Place flag (3x3 stamp at top-left)
  // From map.cpp:1271-1308
  // padTeam = pad surround color, flagColor = center flag color
  placeFlag(map: MapData, x: number, y: number, padTeam: number, flagColor: Team): boolean {
    if (padTeam < 0 || padTeam >= FLAG_DATA.length) return false;
    if (flagColor < 0 || flagColor >= FLAG_DATA.length) return false;

    // Build 3x3: surround from padTeam, center from flagColor
    const surround = FLAG_DATA[padTeam];
    const tiles = [
      surround[0], surround[1], surround[2],
      surround[3], FLAG_DATA[flagColor][4], surround[5],
      surround[6], surround[7], surround[8],
    ];
    this.stamp3x3(map, x, y, tiles);
    map.header.objective = ObjectiveType.FLAG;
    return true;
  }

  // Place flag pole (3x3 surround + receiver center)
  // From map.cpp:1313-1353
  // padTeam = pad surround color, flagColor = receiver center color
  placePole(map: MapData, x: number, y: number, padTeam: number, flagColor: Team): boolean {
    if (padTeam < 0 || padTeam >= POLE_DATA.length) return false;
    if (flagColor < 0 || flagColor > 4) return false;
    const poleData = POLE_DATA[padTeam];

    for (let i = y; i < y + 3; i++) {
      if (i < 0 || i >= MAP_HEIGHT) continue;
      for (let j = x; j < x + 3; j++) {
        if (j < 0 || j >= MAP_WIDTH) continue;
        if ((i - y) === 1 && (j - x) === 1) {
          // Center tile = receiver for flagColor on this pad
          map.tiles[i * MAP_WIDTH + j] = poleData[9 + flagColor];
        } else {
          const tileVal = poleData[(i - y) * 3 + (j - x)];
          if (tileVal >= 0) {
            map.tiles[i * MAP_WIDTH + j] = tileVal;
          }
        }
      }
    }

    map.header.objective = ObjectiveType.FLAG;
    map.modified = true;
    return true;
  }

  // Place warp (single encoded tile)
  // From map.cpp:1460-1481
  placeWarp(map: MapData, x: number, y: number, style: number, src: number, dest: number): boolean {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
    if (style < 0 || style >= 6) return false;
    if (src < 0 || src > 9 || dest < 0 || dest > 9) return false;

    map.tiles[y * MAP_WIDTH + x] = encodeWarpTile(style, src, dest);
    map.modified = true;
    return true;
  }

  // Place spawn (3x3 stamp) - hardcoded Type 1 data
  placeSpawn(map: MapData, x: number, y: number, team: Team): boolean {
    if (team === Team.NEUTRAL || team < 0 || team > 3) return false;
    if (team >= SPAWN_DATA.length) return false;
    return this.stamp3x3(map, x, y, SPAWN_DATA[team]);
  }

  // Place animated spawn (single animated tile)
  // Animation IDs: 0xA3 (green), 0xA4 (red), 0xA5 (blue), 0xA6 (yellow)
  placeAnimatedSpawn(map: MapData, x: number, y: number, team: Team, offset: number = 0): boolean {
    if (team === Team.NEUTRAL || team < 0 || team > 3) return false;
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;

    const animId = 0xA3 + team;
    map.tiles[y * MAP_WIDTH + x] = makeAnimatedTile(animId, offset);
    map.modified = true;
    return true;
  }

  // Place animated warp (3x3 block of animated tiles)
  // Uses ANIMATED_WARP_PATTERN with animation IDs 0x9A-0xA2
  placeAnimatedWarp(map: MapData, x: number, y: number, src: number = 0, dest: number = 0): boolean {
    const routingOffset = dest * 10 + src;

    const patternWithOffset = ANIMATED_WARP_PATTERN.map((tile, index) => {
      if (!(tile & 0x8000)) return tile;
      const animId = tile & 0xFF;

      if (index === 4 && animId === 0x9E) {
        // Center tile: encode routing
        return makeAnimatedTile(animId, routingOffset);
      } else {
        // Border tiles: no offset (pure animation)
        return makeAnimatedTile(animId, 0);
      }
    });

    return this.stamp3x3(map, x, y, patternWithOffset);
  }

  // Place switch (3x3 stamp)
  // From map.cpp switch placement - uses custom.dat data
  placeSwitch(map: MapData, x: number, y: number, switchType: number): boolean {
    if (switchType < 0 || switchType >= switchData.length) return false;
    if (switchData[switchType][0] === 0) return false; // no custom.dat data
    this.stamp3x3(map, x, y, switchData[switchType]);
    map.header.objective = ObjectiveType.SWITCH;
    return true;
  }

  // Place bunker (fill rectangle with pattern)
  // From map.cpp:2554-2588
  // Selection: tile=top-left, horz=width, vert=height
  placeBunker(map: MapData, x1: number, y1: number, x2: number, y2: number, direction: number, style: number): boolean {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w < 2 || h < 2) return false;
    if (minX < 0 || maxX >= MAP_WIDTH || minY < 0 || maxY >= MAP_HEIGHT) return false;

    const j = style * 4 + direction;
    if (j < 0 || j >= BUNKER_DATA.length) return false;
    const pattern = BUNKER_DATA[j];

    // Exact SEdit logic from map.cpp:2556-2587
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        let tile: number;

        if (row === 0 && col === 0)
          tile = pattern[0];
        else if (row === 0 && col === w - 1)
          tile = pattern[3];
        else if (row === 0)
          tile = pattern[1 + col % 2];
        else if (row === h - 1 && col === 0)
          tile = pattern[12];
        else if (row === h - 1 && col === w - 1)
          tile = pattern[15];
        else if (row === h - 1)
          tile = pattern[13 + col % 2];
        else if (col === 0)
          tile = pattern[4];
        else if (col === w - 1)
          tile = pattern[7];
        else
          tile = pattern[5 + (col % 2) + 4 * (row % 2)];

        if (tile > -1) {
          map.tiles[(minY + row) * MAP_WIDTH + (minX + col)] = tile;
        }
      }
    }

    map.modified = true;
    return true;
  }

  // Place holding pen (wall border + floor fill + team center)
  // From map.cpp:2666-2694
  // Uses wall_data[0] indices directly for border tiles (not wallSystem.placeWall)
  placeHoldingPen(map: MapData, x1: number, y1: number, x2: number, y2: number, team: Team, penType: number): boolean {
    if (team === Team.NEUTRAL) return false;
    if (team < 0 || team > 3) return false;

    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w < 2 || h < 2) return false;
    if (minX < 0 || maxX >= MAP_WIDTH || minY < 0 || maxY >= MAP_HEIGHT) return false;

    if (penType < 0 || penType >= HOLDING_PEN_DATA.length) return false;
    const penData = HOLDING_PEN_DATA[penType];

    // Get wall tiles from wall type 0 at specific indices (direct, not connection-mapped)
    const { TL_CORNER, TR_CORNER, V_EDGE, BL_CORNER, BR_CORNER, H_EDGE } = WALL_TYPE_0_INDICES;

    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        let tile: number;

        if (row === 0 && col === 0)
          tile = wallSystem.getWallTileByIndex(0, TL_CORNER);
        else if (row === 0 && col === w - 1)
          tile = wallSystem.getWallTileByIndex(0, TR_CORNER);
        else if (row === h - 1 && col === 0)
          tile = wallSystem.getWallTileByIndex(0, BL_CORNER);
        else if (row === h - 1 && col === w - 1)
          tile = wallSystem.getWallTileByIndex(0, BR_CORNER);
        else if (row === 0 || row === h - 1)
          tile = wallSystem.getWallTileByIndex(0, H_EDGE);
        else if (col === 0 || col === w - 1)
          tile = wallSystem.getWallTileByIndex(0, V_EDGE);
        else if (col === Math.floor(w / 2) && row === Math.floor(h / 2))
          tile = penData[1 + team];
        else
          tile = penData[0];

        map.tiles[(minY + row) * MAP_WIDTH + (minX + col)] = tile;
      }
    }

    map.modified = true;
    return true;
  }

  // Place bridge (15-tile edge pattern)
  // From map.cpp:2591-2664 - exact SEdit logic
  // LR bridge: rows define pattern (row 0, row 1, inner, row h-2, row h-1)
  // UD bridge: cols define pattern (col 0, col 1, inner, col w-2, col w-1)
  placeBridge(map: MapData, x1: number, y1: number, x2: number, y2: number, direction: number, data: number[]): boolean {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w < 2 || h < 2) return false;
    if (minX < 0 || maxX >= MAP_WIDTH || minY < 0 || maxY >= MAP_HEIGHT) return false;
    if (data[0] === 0 && data[1] === 0) return false;

    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        let tile = -1;

        if (direction === 0) {
          // LR bridge - from map.cpp:2595-2625
          if (row === 0 && col === 0)
            tile = data[0];
          else if (row === 0 && col === w - 1)
            tile = data[2];
          else if (row === 0)
            tile = data[1];
          else if (row === 1 && col === 0)
            tile = data[3];
          else if (row === 1 && col === w - 1)
            tile = data[5];
          else if (row === 1)
            tile = data[4];
          else if (row === h - 2 && col === 0)
            tile = data[9];
          else if (row === h - 2 && col === w - 1)
            tile = data[11];
          else if (row === h - 2)
            tile = data[10];
          else if (row === h - 1 && col === 0)
            tile = data[12];
          else if (row === h - 1 && col === w - 1)
            tile = data[14];
          else if (row === h - 1)
            tile = data[13];
          else if (col === 0)
            tile = data[6];
          else if (col === w - 1)
            tile = data[8];
          else
            tile = data[7];
        } else {
          // UD bridge - from map.cpp:2627-2657
          if (row === 0 && col === 0)
            tile = data[0];
          else if (row === 0 && col === w - 1)
            tile = data[4];
          else if (row === 0 && col === 1)
            tile = data[1];
          else if (row === 0 && col === w - 2)
            tile = data[3];
          else if (row === 0)
            tile = data[2];
          else if (row === h - 1 && col === 0)
            tile = data[10];
          else if (row === h - 1 && col === 1)
            tile = data[11];
          else if (row === h - 1 && col === w - 2)
            tile = data[13];
          else if (row === h - 1 && col === w - 1)
            tile = data[14];
          else if (row === h - 1)
            tile = data[12];
          else if (col === 0)
            tile = data[5];
          else if (col === w - 1)
            tile = data[9];
          else if (col === 1)
            tile = data[6];
          else if (col === w - 2)
            tile = data[8];
          else
            tile = data[7];
        }

        if (tile > -1) {
          map.tiles[(minY + row) * MAP_WIDTH + (minX + col)] = tile;
        }
      }
    }

    map.modified = true;
    return true;
  }

  // Place conveyor
  // From map.cpp:2697-2718 - exact SEdit logic
  placeConveyor(map: MapData, x1: number, y1: number, x2: number, y2: number, direction: number, data: number[]): boolean {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w < 1 || h < 1) return false;
    if (minX < 0 || maxX >= MAP_WIDTH || minY < 0 || maxY >= MAP_HEIGHT) return false;
    if (data[0] === 0 && data[1] === 0) return false;

    for (let k = 0; k < h; k++) {
      for (let hh = 0; hh < w; hh++) {
        let tile: number;

        if (direction === 1) {
          // UD conveyor - from map.cpp:2701-2706
          if (w > 1 && w % 2 !== 0 && hh === w - 1) continue;
          if (k === 0)
            tile = data[hh % 2];
          else if (k === h - 1)
            tile = data[hh % 2 + 6];
          else
            tile = data[(k % 2 + 1) * 2 + hh % 2];
        } else {
          // LR conveyor - from map.cpp:2708-2713
          if (h > 1 && h % 2 !== 0 && k === h - 1) continue;
          if (hh === 0)
            tile = data[(k % 2) * 4];
          else if (hh === w - 1)
            tile = data[(k % 2) * 4 + 3];
          else
            tile = data[1 + (k % 2) * 4 + hh % 2];
        }

        map.tiles[(minY + k) * MAP_WIDTH + (minX + hh)] = tile;
      }
    }

    map.modified = true;
    return true;
  }
}

export const gameObjectSystem = new GameObjectSystemClass();
