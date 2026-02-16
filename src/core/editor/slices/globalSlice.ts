/**
 * Global slice - shared UI state and actions
 */

import { StateCreator } from 'zustand';
import { ToolType, Team, GameObjectToolState, DEFAULT_TILE } from '../../map/types';
import { wallSystem } from '../../map/WallSystem';
import { parseCustomDat } from '../../map/CustomDatParser';
import { TileSelection, ClipboardData } from './types';

const TILES_PER_ROW = 40;

// Ruler mode types
export enum RulerMode {
  LINE = 'line',
  RECTANGLE = 'rectangle',
  PATH = 'path',
  RADIUS = 'radius'
}

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
  animationOffsetInput: number;

  // UI state
  showGrid: boolean;
  gridOpacity: number;
  gridLineWeight: number;
  gridColor: string;
  showAnimations: boolean;
  maxUndoLevels: number;
  rulerMeasurement: {
    mode: RulerMode;
    // Shared coordinate fields — stored for ALL modes so pinMeasurement
    // can reconstruct rendering without separate coordinate storage
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    // Line mode
    dx?: number;
    dy?: number;
    manhattan?: number;
    euclidean?: number;
    angle?: number;  // Angle from horizontal in degrees (0-360, standard math convention)
    // Rectangle mode
    width?: number;
    height?: number;
    tileCount?: number;
    // Path mode (used by Plan 02)
    waypoints?: Array<{ x: number; y: number }>;
    totalDistance?: number;
    segmentAngles?: number[];  // Angle of each segment in degrees (0-360)
    // Radius mode
    centerX?: number;
    centerY?: number;
    radius?: number;
    area?: number;
  } | null;
  rulerMode: RulerMode;
  pinnedMeasurements: Array<{
    id: string;
    measurement: NonNullable<GlobalSlice['rulerMeasurement']>;
    label?: string;
    visible: boolean;
  }>;

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
  setGridOpacity: (opacity: number) => void;
  setGridLineWeight: (weight: number) => void;
  setGridColor: (color: string) => void;
  setRulerMeasurement: (measurement: GlobalSlice['rulerMeasurement']) => void;
  setRulerMode: (mode: RulerMode) => void;
  pinMeasurement: () => void;
  unpinMeasurement: (id: string) => void;
  clearAllPinnedMeasurements: () => void;
  updateMeasurementLabel: (id: string, label: string) => void;
  toggleMeasurementVisibility: (id: string) => void;
  toggleAnimations: () => void;

  // Clipboard actions
  setClipboard: (data: ClipboardData | null) => void;

  // Game object tool actions
  setGameObjectTeam: (team: Team) => void;
  setWarpSettings: (src: number, dest: number, style: number) => void;
  setWarpType: (type: number) => void;
  setSpawnType: (type: number) => void;
  setSpawnVariant: (variant: number) => void;
  setSwitchType: (type: number) => void;
  setBunkerSettings: (dir: number, style: number) => void;
  setHoldingPenType: (type: number) => void;
  setBridgeDirection: (dir: number) => void;
  setConveyorDirection: (dir: number) => void;
  setFlagPadType: (type: number) => void;
  setTurretSettings: (weapon: number, team: number, fireRate: number) => void;
  setAnimationOffsetInput: (offset: number) => void;
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
    warpStyle: 4,
    warpType: 4,
    spawnType: 0,
    spawnVariant: 0,
    bunkerDir: 0,
    bunkerStyle: 0,
    holdingPenType: 0,
    bridgeDir: 0,
    conveyorDir: 0,
    switchType: 0,
    flagPadType: 0,
    turretWeapon: 0,
    turretTeam: 0,
    turretFireRate: 0,
  },
  customDatLoaded: false,
  animationOffsetInput: 0,
  showGrid: false,
  gridOpacity: 10,
  gridLineWeight: 1,
  gridColor: '#FFFFFF',
  rulerMeasurement: null,
  rulerMode: RulerMode.LINE,
  pinnedMeasurements: [],
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

  setGridOpacity: (opacity) => set({ gridOpacity: Math.max(0, Math.min(100, opacity)) }),

  setGridLineWeight: (weight) => set({ gridLineWeight: Math.max(1, Math.min(3, weight)) }),

  setGridColor: (color) => set({ gridColor: color.toUpperCase() }),

  setRulerMeasurement: (measurement) => set({ rulerMeasurement: measurement }),

  setRulerMode: (mode) => set({ rulerMode: mode, rulerMeasurement: null }),

  pinMeasurement: () => set((state) => {
    const current = state.rulerMeasurement;
    if (!current) return state;
    return {
      pinnedMeasurements: [
        ...state.pinnedMeasurements,
        { id: Date.now().toString(), measurement: current, visible: true }
      ]
    };
  }),

  unpinMeasurement: (id) => set((state) => ({
    pinnedMeasurements: state.pinnedMeasurements.filter(p => p.id !== id)
  })),

  clearAllPinnedMeasurements: () => set({ pinnedMeasurements: [] }),

  updateMeasurementLabel: (id, label) => set((state) => ({
    pinnedMeasurements: state.pinnedMeasurements.map(p =>
      p.id === id ? { ...p, label } : p
    )
  })),

  toggleMeasurementVisibility: (id) => set((state) => ({
    pinnedMeasurements: state.pinnedMeasurements.map(p =>
      p.id === id ? { ...p, visible: !p.visible } : p
    )
  })),

  toggleAnimations: () => set((state) => ({ showAnimations: !state.showAnimations })),

  // Clipboard actions
  setClipboard: (data) => set({ clipboard: data }),

  // Game object tool actions
  setGameObjectTeam: (team) => set((state) => ({
    gameObjectToolState: { ...state.gameObjectToolState, selectedTeam: team }
  })),

  setWarpSettings: (src, dest, style) => set((state) => ({
    gameObjectToolState: { ...state.gameObjectToolState, warpSrc: src, warpDest: dest, warpStyle: style, warpType: style }
  })),

  setWarpType: (type) => set((state) => ({
    gameObjectToolState: { ...state.gameObjectToolState, warpType: type }
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

  setSpawnVariant: (variant) => set((state) => ({
    gameObjectToolState: { ...state.gameObjectToolState, spawnVariant: variant }
  })),

  setTurretSettings: (weapon, team, fireRate) => set((state) => ({
    gameObjectToolState: {
      ...state.gameObjectToolState,
      turretWeapon: Math.max(0, Math.min(3, weapon)),
      turretTeam: Math.max(0, Math.min(3, team)),
      turretFireRate: Math.max(0, Math.min(4, fireRate)),
    }
  })),

  setAnimationOffsetInput: (offset) => set({ animationOffsetInput: Math.max(0, Math.min(127, offset)) }),

  loadCustomDat: (buffer) => {
    const result = parseCustomDat(buffer);
    if (result.success) {
      set({ customDatLoaded: true });
    }
    return result.success;
  }
});
