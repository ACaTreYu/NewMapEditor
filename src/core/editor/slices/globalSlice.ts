/**
 * Global slice - shared UI state and actions
 */

import { StateCreator } from 'zustand';
import { ToolType, Team, GameObjectToolState, DEFAULT_TILE } from '../../map/types';
import { wallSystem } from '../../map/WallSystem';
import { parseCustomDat } from '../../map/CustomDatParser';
import { TileSelection, ClipboardData } from './types';

const TILES_PER_ROW = 40;

// Global state that is shared across all documents
export interface GlobalSlice {
  // Tool state
  currentTool: ToolType;
  previousTool: ToolType | null;
  selectedTile: number;
  tileSelection: TileSelection;
  wallType: number;

  // Animation state (frame counter for animated tiles)
  animationFrame: number;

  // Game object tool state
  gameObjectToolState: GameObjectToolState;
  customDatLoaded: boolean;

  // UI state
  showGrid: boolean;
  showAnimations: boolean;
  maxUndoLevels: number;

  // Clipboard state (shared across documents)
  clipboard: ClipboardData | null;

  // Actions
  setTool: (tool: ToolType) => void;
  restorePreviousTool: () => void;
  setSelectedTile: (tile: number) => void;
  setTileSelection: (selection: TileSelection) => void;
  getSelectedTileId: () => number;
  setWallType: (type: number) => void;
  advanceAnimationFrame: () => void;
  toggleGrid: () => void;
  toggleAnimations: () => void;

  // Clipboard actions
  setClipboard: (data: ClipboardData | null) => void;

  // Game object tool actions
  setGameObjectTeam: (team: Team) => void;
  setWarpSettings: (src: number, dest: number, style: number) => void;
  setSpawnType: (type: number) => void;
  setSwitchType: (type: number) => void;
  setBunkerSettings: (dir: number, style: number) => void;
  setHoldingPenType: (type: number) => void;
  setBridgeDirection: (dir: number) => void;
  setConveyorDirection: (dir: number) => void;
  setFlagPadType: (type: number) => void;
  loadCustomDat: (buffer: ArrayBuffer) => boolean;
}

export const createGlobalSlice: StateCreator<
  GlobalSlice,
  [],
  [],
  GlobalSlice
> = (set, get) => ({
  // Initial state
  currentTool: ToolType.PENCIL,
  previousTool: null,
  selectedTile: DEFAULT_TILE,
  tileSelection: { startCol: 0, startRow: 7, width: 1, height: 1 }, // DEFAULT_TILE = 280 = row 7, col 0
  wallType: 0,
  animationFrame: 0,
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
    flagPadType: 0,
  },
  customDatLoaded: false,
  showGrid: false,
  showAnimations: true,
  maxUndoLevels: 100, // User decision: increased from 50
  clipboard: null,

  // Actions
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

  advanceAnimationFrame: () => set((state) => ({
    animationFrame: state.animationFrame + 1
  })),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  toggleAnimations: () => set((state) => ({ showAnimations: !state.showAnimations })),

  // Clipboard actions
  setClipboard: (data) => set({ clipboard: data }),

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

  setFlagPadType: (type) => set((state) => ({
    gameObjectToolState: { ...state.gameObjectToolState, flagPadType: type }
  })),

  loadCustomDat: (buffer) => {
    const result = parseCustomDat(buffer);
    if (result.success) {
      set({ customDatLoaded: true });
    }
    return result.success;
  }
});
