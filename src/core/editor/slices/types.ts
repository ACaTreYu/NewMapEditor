/**
 * Shared types for document-based editor state
 */

import { MapData } from '../../map/types';

// Document identifier
export type DocumentId = string;

// Viewport state
export interface Viewport {
  x: number;      // Top-left tile X
  y: number;      // Top-left tile Y
  zoom: number;   // Zoom level (1 = 16px per tile)
}

// Selection state
export interface Selection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}

// Tile selection for multi-tile picker
export interface TileSelection {
  startCol: number;  // 0-39
  startRow: number;  // 0-N
  width: number;     // 1+
  height: number;    // 1+
}

// Clipboard data for copy/cut/paste operations
export interface ClipboardData {
  width: number;
  height: number;
  tiles: Uint16Array;  // Full 16-bit values (preserves animation flags, game objects)
  originX: number;     // Top-left X of original copied region
  originY: number;     // Top-left Y of original copied region
}

// Paste preview position
export interface PastePreviewPosition {
  x: number;
  y: number;
}

// Delta-based undo/redo
export interface TileDelta {
  x: number;
  y: number;
  oldValue: number;
  newValue: number;
}

export interface UndoEntry {
  deltas: TileDelta[];
  description: string;
}

// Per-document state
export interface DocumentState {
  map: MapData | null;
  filePath: string | null;
  viewport: Viewport;
  selection: Selection;
  isPasting: boolean;
  pastePreviewPosition: PastePreviewPosition | null;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  pendingUndoSnapshot: Uint16Array | null;
  modified: boolean;
}

// Create a fresh document state with defaults
export function createDefaultDocumentState(): DocumentState {
  return {
    map: null,
    filePath: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
    isPasting: false,
    pastePreviewPosition: null,
    undoStack: [],
    redoStack: [],
    pendingUndoSnapshot: null,
    modified: false
  };
}

// Create a document from a map
export function createDocumentFromMap(map: MapData, filePath?: string): DocumentState {
  return {
    map,
    filePath: filePath || null,
    viewport: { x: 0, y: 0, zoom: 1 },
    selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
    isPasting: false,
    pastePreviewPosition: null,
    undoStack: [],
    redoStack: [],
    pendingUndoSnapshot: null,
    modified: false
  };
}

// Window state for MDI child windows
export const MAX_OPEN_DOCUMENTS = 8;

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  title: string;
  isMinimized: boolean;      // Window is minimized to bar
  isMaximized: boolean;      // Window fills workspace
  savedBounds: {             // Restore target when un-minimizing/un-maximizing
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}
