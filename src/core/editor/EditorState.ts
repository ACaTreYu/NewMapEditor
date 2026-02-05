/**
 * Editor state management using Zustand
 * Portable state logic that can be used in any React context
 */

import { create } from 'zustand';
import {
  MapData,
  MapHeader,
  ToolType,
  Team,
  GameObjectToolState,
  RectDragState,
  createEmptyMap,
  MAP_WIDTH,
  MAP_HEIGHT,
  DEFAULT_TILE
} from '../map/types';

const TILES_PER_ROW = 40;
import { wallSystem } from '../map/WallSystem';
import { gameObjectSystem } from '../map/GameObjectSystem';
import { parseCustomDat } from '../map/CustomDatParser';
import { bridgeLrData, bridgeUdData, convLrData, convUdData } from '../map/GameObjectData';

// Undo/redo action
interface MapAction {
  tiles: Uint16Array;
  description: string;
}

// Viewport state
interface Viewport {
  x: number;      // Top-left tile X
  y: number;      // Top-left tile Y
  zoom: number;   // Zoom level (1 = 16px per tile)
}

// Selection state
interface Selection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}

// Tile selection for multi-tile picker
interface TileSelection {
  startCol: number;  // 0-39
  startRow: number;  // 0-N
  width: number;     // 1+
  height: number;    // 1+
}

// Clipboard data for copy/cut/paste operations
interface ClipboardData {
  width: number;
  height: number;
  tiles: Uint16Array;  // Full 16-bit values (preserves animation flags, game objects)
  originX: number;     // Top-left X of original copied region
  originY: number;     // Top-left Y of original copied region
}

// Editor state interface
interface EditorState {
  // Map data
  map: MapData | null;
  filePath: string | null;

  // Tool state
  currentTool: ToolType;
  previousTool: ToolType | null;
  selectedTile: number;
  tileSelection: TileSelection;
  wallType: number;

  // Animation state (frame counter for animated tiles)
  animationFrame: number;

  // Viewport
  viewport: Viewport;

  // Selection
  selection: Selection;

  // Clipboard
  clipboard: ClipboardData | null;

  // Undo/redo
  undoStack: MapAction[];
  redoStack: MapAction[];
  maxUndoLevels: number;

  // Game object tool state
  gameObjectToolState: GameObjectToolState;
  rectDragState: RectDragState;
  customDatLoaded: boolean;

  // UI state
  showGrid: boolean;
  showAnimations: boolean;

  // Actions
  setMap: (map: MapData | null, filePath?: string) => void;
  newMap: () => void;
  setTool: (tool: ToolType) => void;
  restorePreviousTool: () => void;
  setSelectedTile: (tile: number) => void;
  setTileSelection: (selection: TileSelection) => void;
  getSelectedTileId: () => number;
  setWallType: (type: number) => void;
  updateMapHeader: (updates: Partial<MapHeader>) => void;
  advanceAnimationFrame: () => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setSelection: (selection: Partial<Selection>) => void;
  clearSelection: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: () => void;
  deleteSelection: () => void;
  toggleGrid: () => void;
  toggleAnimations: () => void;

  // Game object tool actions
  setGameObjectTeam: (team: Team) => void;
  setWarpSettings: (src: number, dest: number, style: number) => void;
  setSpawnType: (type: number) => void;
  setSwitchType: (type: number) => void;
  setBunkerSettings: (dir: number, style: number) => void;
  setHoldingPenType: (type: number) => void;
  setBridgeDirection: (dir: number) => void;
  setConveyorDirection: (dir: number) => void;
  setRectDragState: (state: Partial<RectDragState>) => void;
  loadCustomDat: (buffer: ArrayBuffer) => boolean;

  // Game object placement
  placeGameObject: (x: number, y: number) => boolean;
  placeGameObjectRect: (x1: number, y1: number, x2: number, y2: number) => boolean;

  // Tile operations
  setTile: (x: number, y: number, tile: number) => void;
  setTiles: (tiles: Array<{ x: number; y: number; tile: number }>) => void;
  placeWall: (x: number, y: number) => void;
  eraseTile: (x: number, y: number) => void;
  fillArea: (x: number, y: number) => void;

  // Undo/redo
  pushUndo: (description: string) => void;
  undo: () => void;
  redo: () => void;

  // Map state
  markModified: () => void;
  markSaved: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  map: null,
  filePath: null,
  currentTool: ToolType.PENCIL,
  previousTool: null,
  selectedTile: DEFAULT_TILE,
  tileSelection: { startCol: 0, startRow: 7, width: 1, height: 1 }, // DEFAULT_TILE = 280 = row 7, col 0
  wallType: 0,
  animationFrame: 0,
  viewport: { x: 0, y: 0, zoom: 1 },
  selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
  clipboard: null,
  undoStack: [],
  redoStack: [],
  maxUndoLevels: 50,
  gameObjectToolState: {
    selectedTeam: Team.GREEN,
    warpSrc: 0,
    warpDest: 0,
    warpStyle: 0,
    spawnType: 0,
    bunkerDir: 0,
    bunkerStyle: 0,
    holdingPenType: 0,
    bridgeDir: 0,
    conveyorDir: 0,
    switchType: 0,
  },
  rectDragState: { active: false, startX: 0, startY: 0, endX: 0, endY: 0 },
  customDatLoaded: false,
  showGrid: false,
  showAnimations: true,

  // Actions
  setMap: (map, filePath) => set({
    map,
    filePath: filePath || null,
    undoStack: [],
    redoStack: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false }
  }),

  newMap: () => {
    const map = createEmptyMap();
    set({
      map,
      filePath: null,
      undoStack: [],
      redoStack: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false }
    });
  },

  setTool: (tool) => set((state) => ({
    currentTool: tool,
    previousTool: tool === ToolType.PICKER ? state.currentTool : state.previousTool
  })),

  restorePreviousTool: () => set((state) => ({
    currentTool: state.previousTool || ToolType.PENCIL
  })),

  setSelectedTile: (tile) => {
    const col = tile % TILES_PER_ROW;
    const row = Math.floor(tile / TILES_PER_ROW);
    set({
      selectedTile: tile,
      tileSelection: { startCol: col, startRow: row, width: 1, height: 1 }
    });
  },

  setTileSelection: (selection) => {
    const tile = selection.startRow * TILES_PER_ROW + selection.startCol;
    set({
      selectedTile: tile,
      tileSelection: selection
    });
  },

  getSelectedTileId: () => {
    const { tileSelection } = get();
    return tileSelection.startRow * TILES_PER_ROW + tileSelection.startCol;
  },

  setWallType: (type) => {
    wallSystem.setWallType(type);
    set({ wallType: type });
  },

  updateMapHeader: (updates) => {
    const { map } = get();
    if (!map) return;
    set({
      map: {
        ...map,
        header: { ...map.header, ...updates },
        modified: true
      }
    });
  },

  advanceAnimationFrame: () => set((state) => ({
    animationFrame: state.animationFrame + 1
  })),

  setViewport: (viewport) => set((state) => ({
    viewport: { ...state.viewport, ...viewport }
  })),

  setSelection: (selection) => set((state) => ({
    selection: { ...state.selection, ...selection }
  })),

  clearSelection: () => set({
    selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false }
  }),

  copySelection: () => {
    const { map, selection } = get();
    if (!map || !selection.active) return;

    const minX = Math.min(selection.startX, selection.endX);
    const minY = Math.min(selection.startY, selection.endY);
    const maxX = Math.max(selection.startX, selection.endX);
    const maxY = Math.max(selection.startY, selection.endY);

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const tiles = new Uint16Array(width * height);

    let pos = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        tiles[pos++] = map.tiles[y * MAP_WIDTH + x];
      }
    }

    set({
      clipboard: { width, height, tiles, originX: minX, originY: minY }
    });
  },

  cutSelection: () => {
    const { map, selection } = get();
    if (!map || !selection.active) return;

    // Copy first
    get().copySelection();

    // Then clear (with undo)
    get().pushUndo('Cut selection');

    const minX = Math.min(selection.startX, selection.endX);
    const minY = Math.min(selection.startY, selection.endY);
    const maxX = Math.max(selection.startX, selection.endX);
    const maxY = Math.max(selection.startY, selection.endY);

    const tiles: Array<{ x: number; y: number; tile: number }> = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        tiles.push({ x, y, tile: DEFAULT_TILE });
      }
    }
    get().setTiles(tiles);
    // Selection persists (user decision from CONTEXT.md)
  },

  pasteClipboard: () => {
    const { map, clipboard } = get();
    if (!map || !clipboard) return;

    get().pushUndo('Paste');

    const tiles: Array<{ x: number; y: number; tile: number }> = [];
    for (let y = 0; y < clipboard.height; y++) {
      for (let x = 0; x < clipboard.width; x++) {
        const mapX = clipboard.originX + x;
        const mapY = clipboard.originY + y;

        // Silently discard out-of-bounds tiles (user decision)
        if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
          tiles.push({ x: mapX, y: mapY, tile: clipboard.tiles[y * clipboard.width + x] });
        }
      }
    }
    get().setTiles(tiles);

    // Pasted region becomes active selection (user decision)
    set({
      selection: {
        startX: clipboard.originX,
        startY: clipboard.originY,
        endX: clipboard.originX + clipboard.width - 1,
        endY: clipboard.originY + clipboard.height - 1,
        active: true
      }
    });
  },

  deleteSelection: () => {
    const { map, selection } = get();
    if (!map || !selection.active) return;

    get().pushUndo('Delete selection');

    const minX = Math.min(selection.startX, selection.endX);
    const minY = Math.min(selection.startY, selection.endY);
    const maxX = Math.max(selection.startX, selection.endX);
    const maxY = Math.max(selection.startY, selection.endY);

    const tiles: Array<{ x: number; y: number; tile: number }> = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        tiles.push({ x, y, tile: DEFAULT_TILE });
      }
    }
    get().setTiles(tiles);
    // Selection persists (user decision from CONTEXT.md)
  },

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  toggleAnimations: () => set((state) => ({ showAnimations: !state.showAnimations })),

  // Game object tool actions
  setGameObjectTeam: (team) => set((state) => ({
    gameObjectToolState: { ...state.gameObjectToolState, selectedTeam: team }
  })),

  setWarpSettings: (src, dest, style) => set((state) => ({
    gameObjectToolState: { ...state.gameObjectToolState, warpSrc: src, warpDest: dest, warpStyle: style }
  })),

  setSpawnType: (type) => set((state) => ({
    gameObjectToolState: { ...state.gameObjectToolState, spawnType: type }
  })),

  setSwitchType: (type) => set((state) => ({
    gameObjectToolState: { ...state.gameObjectToolState, switchType: type }
  })),

  setBunkerSettings: (dir, style) => set((state) => ({
    gameObjectToolState: { ...state.gameObjectToolState, bunkerDir: dir, bunkerStyle: style }
  })),

  setHoldingPenType: (type) => set((state) => ({
    gameObjectToolState: { ...state.gameObjectToolState, holdingPenType: type }
  })),

  setBridgeDirection: (dir) => set((state) => ({
    gameObjectToolState: { ...state.gameObjectToolState, bridgeDir: dir }
  })),

  setConveyorDirection: (dir) => set((state) => ({
    gameObjectToolState: { ...state.gameObjectToolState, conveyorDir: dir }
  })),

  setRectDragState: (rectState) => set((state) => ({
    rectDragState: { ...state.rectDragState, ...rectState }
  })),

  loadCustomDat: (buffer) => {
    const result = parseCustomDat(buffer);
    if (result.success) {
      set({ customDatLoaded: true });
    }
    return result.success;
  },

  placeGameObject: (x, y) => {
    const { map, gameObjectToolState, currentTool } = get();
    if (!map) return false;
    const { selectedTeam, warpSrc, warpDest, warpStyle, spawnType, switchType } = gameObjectToolState;

    let success = false;
    switch (currentTool) {
      case ToolType.FLAG:
        success = gameObjectSystem.placeFlag(map, x, y, selectedTeam);
        break;
      case ToolType.FLAG_POLE:
        success = gameObjectSystem.placePole(map, x, y, selectedTeam);
        break;
      case ToolType.WARP:
        success = gameObjectSystem.placeWarp(map, x, y, warpStyle, warpSrc, warpDest);
        break;
      case ToolType.SPAWN:
        success = gameObjectSystem.placeSpawn(map, x, y, selectedTeam, spawnType);
        break;
      case ToolType.SWITCH:
        success = gameObjectSystem.placeSwitch(map, x, y, switchType);
        break;
    }

    if (success) {
      set({ map: { ...map } });
    }
    return success;
  },

  placeGameObjectRect: (x1, y1, x2, y2) => {
    const { map, gameObjectToolState, currentTool } = get();
    if (!map) return false;
    const { selectedTeam, bunkerDir, bunkerStyle, holdingPenType, bridgeDir, conveyorDir } = gameObjectToolState;

    let success = false;
    switch (currentTool) {
      case ToolType.BUNKER:
        success = gameObjectSystem.placeBunker(map, x1, y1, x2, y2, bunkerDir, bunkerStyle);
        break;
      case ToolType.HOLDING_PEN:
        success = gameObjectSystem.placeHoldingPen(map, x1, y1, x2, y2, selectedTeam, holdingPenType);
        break;
      case ToolType.BRIDGE: {
        const bridgeData = bridgeDir === 0 ? bridgeLrData : bridgeUdData;
        if (bridgeData.length > 0) {
          success = gameObjectSystem.placeBridge(map, x1, y1, x2, y2, bridgeDir, bridgeData[0]);
        }
        break;
      }
      case ToolType.CONVEYOR: {
        const convData = conveyorDir === 0 ? convLrData : convUdData;
        if (convData.length > 0) {
          success = gameObjectSystem.placeConveyor(map, x1, y1, x2, y2, conveyorDir, convData[0]);
        }
        break;
      }
      case ToolType.WALL_RECT: {
        // Wall rect: draw walls along rectangle border
        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const maxX = Math.max(x1, x2);
        const maxY = Math.max(y1, y2);
        for (let px = minX; px <= maxX; px++) {
          wallSystem.placeWall(map, px, minY);
          wallSystem.placeWall(map, px, maxY);
        }
        for (let py = minY + 1; py < maxY; py++) {
          wallSystem.placeWall(map, minX, py);
          wallSystem.placeWall(map, maxX, py);
        }
        success = true;
        break;
      }
    }

    if (success) {
      set({ map: { ...map } });
    }
    return success;
  },

  // Tile operations
  setTile: (x, y, tile) => {
    const { map } = get();
    if (!map || x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    map.tiles[y * MAP_WIDTH + x] = tile;
    map.modified = true;
    set({ map: { ...map } });
  },

  setTiles: (tiles) => {
    const { map } = get();
    if (!map) return;

    for (const { x, y, tile } of tiles) {
      if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
        map.tiles[y * MAP_WIDTH + x] = tile;
      }
    }
    map.modified = true;
    set({ map: { ...map } });
  },

  placeWall: (x, y) => {
    const { map } = get();
    if (!map) return;

    wallSystem.placeWall(map, x, y);
    set({ map: { ...map } });
  },

  eraseTile: (x, y) => {
    const { map } = get();
    if (!map || x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    const currentTile = map.tiles[y * MAP_WIDTH + x];

    // If it's a wall, use wall removal to update neighbors
    if (wallSystem.isWallTile(currentTile)) {
      wallSystem.removeWall(map, x, y, DEFAULT_TILE);
    } else {
      map.tiles[y * MAP_WIDTH + x] = DEFAULT_TILE;
      map.modified = true;
    }

    set({ map: { ...map } });
  },

  fillArea: (x, y) => {
    const { map, tileSelection } = get();
    if (!map || x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    const targetTile = map.tiles[y * MAP_WIDTH + x];

    // Calculate the top-left tile of the selection for early exit check
    const startTile = tileSelection.startRow * TILES_PER_ROW + tileSelection.startCol;
    if (targetTile === startTile) return;

    // Store fill origin for pattern offset calculation
    const originX = x;
    const originY = y;

    // Flood fill algorithm with pattern support
    const stack: Array<{ x: number; y: number }> = [{ x, y }];
    const visited = new Set<number>();

    while (stack.length > 0) {
      const pos = stack.pop()!;
      const index = pos.y * MAP_WIDTH + pos.x;

      if (visited.has(index)) continue;
      if (pos.x < 0 || pos.x >= MAP_WIDTH || pos.y < 0 || pos.y >= MAP_HEIGHT) continue;
      if (map.tiles[index] !== targetTile) continue;

      visited.add(index);

      // Calculate offset from fill origin
      const offsetX = pos.x - originX;
      const offsetY = pos.y - originY;

      // Handle negative modulo correctly: ((n % m) + m) % m
      const patternX = ((offsetX % tileSelection.width) + tileSelection.width) % tileSelection.width;
      const patternY = ((offsetY % tileSelection.height) + tileSelection.height) % tileSelection.height;

      // Calculate actual tile index in tileset
      const tileIndex = (tileSelection.startRow + patternY) * TILES_PER_ROW
                      + (tileSelection.startCol + patternX);

      map.tiles[index] = tileIndex;

      stack.push({ x: pos.x - 1, y: pos.y });
      stack.push({ x: pos.x + 1, y: pos.y });
      stack.push({ x: pos.x, y: pos.y - 1 });
      stack.push({ x: pos.x, y: pos.y + 1 });
    }

    map.modified = true;
    set({ map: { ...map } });
  },

  // Undo/redo
  pushUndo: (description) => {
    const { map, undoStack, maxUndoLevels } = get();
    if (!map) return;

    const action: MapAction = {
      tiles: new Uint16Array(map.tiles),
      description
    };

    const newStack = [...undoStack, action];
    if (newStack.length > maxUndoLevels) {
      newStack.shift();
    }

    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { map, undoStack, redoStack } = get();
    if (!map || undoStack.length === 0) return;

    const action = undoStack[undoStack.length - 1];
    const redoAction: MapAction = {
      tiles: new Uint16Array(map.tiles),
      description: action.description
    };

    map.tiles = new Uint16Array(action.tiles);
    map.modified = true;

    set({
      map: { ...map },
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, redoAction]
    });
  },

  redo: () => {
    const { map, undoStack, redoStack } = get();
    if (!map || redoStack.length === 0) return;

    const action = redoStack[redoStack.length - 1];
    const undoAction: MapAction = {
      tiles: new Uint16Array(map.tiles),
      description: action.description
    };

    map.tiles = new Uint16Array(action.tiles);
    map.modified = true;

    set({
      map: { ...map },
      undoStack: [...undoStack, undoAction],
      redoStack: redoStack.slice(0, -1)
    });
  },

  markModified: () => {
    const { map } = get();
    if (map) {
      map.modified = true;
      set({ map: { ...map } });
    }
  },

  markSaved: () => {
    const { map } = get();
    if (map) {
      map.modified = false;
      set({ map: { ...map } });
    }
  }
}));
