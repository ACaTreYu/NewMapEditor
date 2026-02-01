/**
 * Editor state management using Zustand
 * Portable state logic that can be used in any React context
 */

import { create } from 'zustand';
import {
  MapData,
  MapHeader,
  ToolType,
  Animation,
  createEmptyMap,
  MAP_WIDTH,
  MAP_HEIGHT,
  DEFAULT_TILE
} from '../map/types';

const TILES_PER_ROW = 40;
import { wallSystem } from '../map/WallSystem';

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

  // Animation state
  animations: Animation[] | null;
  animationFrame: number;

  // Viewport
  viewport: Viewport;

  // Selection
  selection: Selection;

  // Undo/redo
  undoStack: MapAction[];
  redoStack: MapAction[];
  maxUndoLevels: number;

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
  setAnimations: (animations: Animation[]) => void;
  advanceAnimationFrame: () => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setSelection: (selection: Partial<Selection>) => void;
  clearSelection: () => void;
  toggleGrid: () => void;
  toggleAnimations: () => void;

  // Tile operations
  setTile: (x: number, y: number, tile: number) => void;
  setTiles: (tiles: Array<{ x: number; y: number; tile: number }>) => void;
  placeWall: (x: number, y: number) => void;
  eraseTile: (x: number, y: number) => void;
  fillArea: (x: number, y: number, tile: number) => void;

  // Undo/redo
  pushUndo: (description: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

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
  animations: null,
  animationFrame: 0,
  viewport: { x: 0, y: 0, zoom: 1 },
  selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
  undoStack: [],
  redoStack: [],
  maxUndoLevels: 50,
  showGrid: true,
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

  setAnimations: (animations) => set({ animations }),

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

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  toggleAnimations: () => set((state) => ({ showAnimations: !state.showAnimations })),

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

  fillArea: (x, y, tile) => {
    const { map } = get();
    if (!map || x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    const targetTile = map.tiles[y * MAP_WIDTH + x];
    if (targetTile === tile) return;

    // Flood fill algorithm
    const stack: Array<{ x: number; y: number }> = [{ x, y }];
    const visited = new Set<number>();

    while (stack.length > 0) {
      const pos = stack.pop()!;
      const index = pos.y * MAP_WIDTH + pos.x;

      if (visited.has(index)) continue;
      if (pos.x < 0 || pos.x >= MAP_WIDTH || pos.y < 0 || pos.y >= MAP_HEIGHT) continue;
      if (map.tiles[index] !== targetTile) continue;

      visited.add(index);
      map.tiles[index] = tile;

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

  canUndo: () => get().undoStack.length > 0,

  canRedo: () => get().redoStack.length > 0,

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
