/**
 * Documents slice - per-document state and actions
 */

import { StateCreator } from 'zustand';
import { MapData, MapHeader, MAP_WIDTH, MAP_HEIGHT, DEFAULT_TILE, ToolType } from '../../map/types';
import { wallSystem } from '../../map/WallSystem';
import { gameObjectSystem } from '../../map/GameObjectSystem';
import { bridgeLrData, bridgeUdData, convLrData, convUdData, CONV_RIGHT_DATA, CONV_DOWN_DATA, WARP_STYLES } from '../../map/GameObjectData';
import * as SelectionTransforms from '../../map/SelectionTransforms';
import {
  DocumentId,
  DocumentState,
  Viewport,
  Selection,
  TileDelta,
  UndoEntry,
  createDocumentFromMap
} from './types';
import { GlobalSlice } from './globalSlice';

const TILES_PER_ROW = 40;

export interface DocumentsSlice {
  // Document collection
  documents: Map<DocumentId, DocumentState>;
  activeDocumentId: DocumentId | null;

  // Document lifecycle
  createDocument: (map: MapData, filePath?: string) => DocumentId | null;
  closeDocument: (id: DocumentId) => void;
  setActiveDocument: (id: DocumentId) => void;

  // Per-document tile operations
  setTileForDocument: (id: DocumentId, x: number, y: number, tile: number) => void;
  setTilesForDocument: (id: DocumentId, tiles: Array<{ x: number; y: number; tile: number }>) => void;
  placeWallForDocument: (id: DocumentId, x: number, y: number) => void;
  eraseTileForDocument: (id: DocumentId, x: number, y: number) => void;
  fillAreaForDocument: (id: DocumentId, x: number, y: number) => void;

  // Per-document undo/redo
  pushUndoForDocument: (id: DocumentId) => void;
  commitUndoForDocument: (id: DocumentId, description: string) => void;
  undoForDocument: (id: DocumentId) => void;
  redoForDocument: (id: DocumentId) => void;

  // Per-document viewport
  setViewportForDocument: (id: DocumentId, viewport: Partial<Viewport>) => void;

  // Per-document selection
  setSelectionForDocument: (id: DocumentId, selection: Partial<Selection>) => void;
  clearSelectionForDocument: (id: DocumentId) => void;

  // Per-document clipboard operations
  copySelectionForDocument: (id: DocumentId) => void;
  cutSelectionForDocument: (id: DocumentId) => void;
  deleteSelectionForDocument: (id: DocumentId) => void;
  startPastingForDocument: (id: DocumentId) => void;
  cancelPastingForDocument: (id: DocumentId) => void;
  setPastePreviewPositionForDocument: (id: DocumentId, x: number, y: number) => void;
  pasteAtForDocument: (id: DocumentId, x: number, y: number) => void;

  // Per-document selection transforms
  rotateSelectionForDocument: (id: DocumentId, angle: 90 | -90) => void;
  mirrorSelectionForDocument: (id: DocumentId, direction: SelectionTransforms.MirrorDirection) => void;

  // Per-document map operations
  updateMapHeaderForDocument: (id: DocumentId, updates: Partial<MapHeader>) => void;
  markModifiedForDocument: (id: DocumentId) => void;
  markSavedForDocument: (id: DocumentId) => void;

  // Per-document game object operations
  placeGameObjectForDocument: (id: DocumentId, x: number, y: number) => boolean;
  placeGameObjectRectForDocument: (id: DocumentId, x1: number, y1: number, x2: number, y2: number) => boolean;
}

export const createDocumentsSlice: StateCreator<
  DocumentsSlice & GlobalSlice,
  [],
  [],
  DocumentsSlice
> = (set, get) => ({
  // Initial state
  documents: new Map(),
  activeDocumentId: null,

  // Document lifecycle
  createDocument: (map, filePath?) => {
    const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const docState = createDocumentFromMap(map, filePath);

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, docState);
      return {
        documents: newDocs,
        activeDocumentId: id
      };
    });

    return id;
  },

  closeDocument: (id) => {
    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.delete(id);

      // If closing active document, switch to first remaining or null
      let newActiveId: DocumentId | null = state.activeDocumentId;
      if (state.activeDocumentId === id) {
        newActiveId = newDocs.size > 0 ? (newDocs.keys().next().value as DocumentId) : null;
      }

      return {
        documents: newDocs,
        activeDocumentId: newActiveId
      };
    });
  },

  setActiveDocument: (id) => {
    const doc = get().documents.get(id);
    if (!doc) return;

    set({ activeDocumentId: id });
  },

  // Tile operations
  setTileForDocument: (id, x, y, tile) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map || x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    doc.map.tiles[y * MAP_WIDTH + x] = tile;
    doc.map.modified = true;
    const newMap = { ...doc.map } as MapData;

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, { ...doc, map: newMap, modified: true });
      return { documents: newDocs };
    });
  },

  setTilesForDocument: (id, tiles) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map) return;

    for (const { x, y, tile } of tiles) {
      if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
        doc.map.tiles[y * MAP_WIDTH + x] = tile;
      }
    }
    doc.map.modified = true;
    const newMap = { ...doc.map } as MapData;

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, { ...doc, map: newMap, modified: true });
      return { documents: newDocs };
    });
  },

  placeWallForDocument: (id, x, y) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map) return;

    wallSystem.placeWall(doc.map, x, y);
    const newMap = { ...doc.map, modified: true } as MapData;

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, { ...doc, map: newMap, modified: true });
      return { documents: newDocs };
    });
  },

  eraseTileForDocument: (id, x, y) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map || x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    const currentTile = doc.map.tiles[y * MAP_WIDTH + x];

    // If it's a wall, use wall removal to update neighbors
    if (wallSystem.isWallTile(currentTile)) {
      wallSystem.removeWall(doc.map, x, y, DEFAULT_TILE);
    } else {
      doc.map.tiles[y * MAP_WIDTH + x] = DEFAULT_TILE;
    }
    doc.map.modified = true;
    const newMap = { ...doc.map } as MapData;

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, { ...doc, map: newMap, modified: true });
      return { documents: newDocs };
    });
  },

  fillAreaForDocument: (id, x, y) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map || x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    const targetTile = doc.map.tiles[y * MAP_WIDTH + x];

    // Get tileSelection from GlobalSlice via get()
    const { tileSelection } = get();

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
      if (doc.map.tiles[index] !== targetTile) continue;

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

      doc.map.tiles[index] = tileIndex;

      stack.push({ x: pos.x - 1, y: pos.y });
      stack.push({ x: pos.x + 1, y: pos.y });
      stack.push({ x: pos.x, y: pos.y - 1 });
      stack.push({ x: pos.x, y: pos.y + 1 });
    }

    doc.map.modified = true;
    const newMap = { ...doc.map } as MapData;

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, { ...doc, map: newMap, modified: true });
      return { documents: newDocs };
    });
  },

  // Undo/redo
  pushUndoForDocument: (id) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map) return;

    // Store snapshot of current tiles for later delta comparison
    const updatedDoc = {
      ...doc,
      pendingUndoSnapshot: new Uint16Array(doc.map.tiles)
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, updatedDoc);
      return { documents: newDocs };
    });
  },

  commitUndoForDocument: (id, description) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map || !doc.pendingUndoSnapshot) return;

    const deltas: TileDelta[] = [];
    for (let i = 0; i < doc.map.tiles.length; i++) {
      if (doc.map.tiles[i] !== doc.pendingUndoSnapshot[i]) {
        deltas.push({
          x: i % MAP_WIDTH,
          y: Math.floor(i / MAP_WIDTH),
          oldValue: doc.pendingUndoSnapshot[i],
          newValue: doc.map.tiles[i]
        });
      }
    }

    if (deltas.length === 0) {
      // No changes — don't create empty undo entry
      const updatedDoc = { ...doc, pendingUndoSnapshot: null };
      set((state) => {
        const newDocs = new Map(state.documents);
        newDocs.set(id, updatedDoc);
        return { documents: newDocs };
      });
      return;
    }

    const entry: UndoEntry = { deltas, description };
    const newStack = [...doc.undoStack, entry];

    // Enforce 100-entry limit (user decision)
    if (newStack.length > 100) {
      newStack.shift();
    }

    const updatedDoc = {
      ...doc,
      undoStack: newStack,
      redoStack: [],
      pendingUndoSnapshot: null
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, updatedDoc);
      return { documents: newDocs };
    });
  },

  undoForDocument: (id) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map || doc.undoStack.length === 0) return;

    const entry = doc.undoStack[doc.undoStack.length - 1];

    // Apply undo: restore old values to a new tiles array
    const newTiles = new Uint16Array(doc.map.tiles);
    for (const delta of entry.deltas) {
      newTiles[delta.y * MAP_WIDTH + delta.x] = delta.oldValue;
    }

    const newMap = { ...doc.map, tiles: newTiles, modified: true } as MapData;

    // Move entry to redo stack as-is (same deltas, redo will apply newValue)
    const newRedoStack = [...doc.redoStack, entry];
    if (newRedoStack.length > 100) {
      newRedoStack.shift();
    }

    const updatedDoc = {
      ...doc,
      map: newMap,
      modified: true,
      undoStack: doc.undoStack.slice(0, -1),
      redoStack: newRedoStack
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, updatedDoc);
      return { documents: newDocs };
    });
  },

  redoForDocument: (id) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map || doc.redoStack.length === 0) return;

    const entry = doc.redoStack[doc.redoStack.length - 1];

    // Apply redo: restore new values to a new tiles array
    const newTiles = new Uint16Array(doc.map.tiles);
    for (const delta of entry.deltas) {
      newTiles[delta.y * MAP_WIDTH + delta.x] = delta.newValue;
    }

    const newMap = { ...doc.map, tiles: newTiles, modified: true } as MapData;

    // Move entry back to undo stack as-is (same deltas, undo will apply oldValue)
    const newUndoStack = [...doc.undoStack, entry];
    if (newUndoStack.length > 100) {
      newUndoStack.shift();
    }

    const updatedDoc = {
      ...doc,
      map: newMap,
      modified: true,
      undoStack: newUndoStack,
      redoStack: doc.redoStack.slice(0, -1)
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, updatedDoc);
      return { documents: newDocs };
    });
  },

  // Viewport
  setViewportForDocument: (id, viewport) => {
    const doc = get().documents.get(id);
    if (!doc) return;

    const updatedDoc = {
      ...doc,
      viewport: { ...doc.viewport, ...viewport }
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, updatedDoc);
      return { documents: newDocs };
    });
  },

  // Selection
  setSelectionForDocument: (id, selection) => {
    const doc = get().documents.get(id);
    if (!doc) return;

    const updatedDoc = {
      ...doc,
      selection: { ...doc.selection, ...selection }
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, updatedDoc);
      return { documents: newDocs };
    });
  },

  clearSelectionForDocument: (id) => {
    const doc = get().documents.get(id);
    if (!doc) return;

    const updatedDoc = {
      ...doc,
      selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false }
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, updatedDoc);
      return { documents: newDocs };
    });
  },

  // Clipboard operations
  copySelectionForDocument: (id) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map || !doc.selection.active) return;

    const minX = Math.min(doc.selection.startX, doc.selection.endX);
    const minY = Math.min(doc.selection.startY, doc.selection.endY);
    const maxX = Math.max(doc.selection.startX, doc.selection.endX);
    const maxY = Math.max(doc.selection.startY, doc.selection.endY);

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const tiles = new Uint16Array(width * height);

    let pos = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        tiles[pos++] = doc.map.tiles[y * MAP_WIDTH + x];
      }
    }

    // Write to global clipboard instead of per-document
    set({ clipboard: { width, height, tiles, originX: minX, originY: minY } });
  },

  cutSelectionForDocument: (id) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map || !doc.selection.active) return;

    // Copy first
    get().copySelectionForDocument(id);

    // Then clear (with undo)
    get().pushUndoForDocument(id);

    const minX = Math.min(doc.selection.startX, doc.selection.endX);
    const minY = Math.min(doc.selection.startY, doc.selection.endY);
    const maxX = Math.max(doc.selection.startX, doc.selection.endX);
    const maxY = Math.max(doc.selection.startY, doc.selection.endY);

    const tiles: Array<{ x: number; y: number; tile: number }> = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        tiles.push({ x, y, tile: DEFAULT_TILE });
      }
    }
    get().setTilesForDocument(id, tiles);
    get().commitUndoForDocument(id, 'Cut selection');
    // Selection persists (user decision from CONTEXT.md)
  },

  deleteSelectionForDocument: (id) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map || !doc.selection.active) return;

    get().pushUndoForDocument(id);

    const minX = Math.min(doc.selection.startX, doc.selection.endX);
    const minY = Math.min(doc.selection.startY, doc.selection.endY);
    const maxX = Math.max(doc.selection.startX, doc.selection.endX);
    const maxY = Math.max(doc.selection.startY, doc.selection.endY);

    const tiles: Array<{ x: number; y: number; tile: number }> = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        tiles.push({ x, y, tile: DEFAULT_TILE });
      }
    }
    get().setTilesForDocument(id, tiles);
    get().commitUndoForDocument(id, 'Delete selection');
    // Selection persists (user decision from CONTEXT.md)
  },

  startPastingForDocument: (id) => {
    const clipboard = get().clipboard;
    const doc = get().documents.get(id);
    if (!doc || !clipboard) return;

    const updatedDoc = {
      ...doc,
      isPasting: true,
      pastePreviewPosition: null
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, updatedDoc);
      return { documents: newDocs };
    });
  },

  cancelPastingForDocument: (id) => {
    const doc = get().documents.get(id);
    if (!doc) return;

    const updatedDoc = {
      ...doc,
      isPasting: false,
      pastePreviewPosition: null
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, updatedDoc);
      return { documents: newDocs };
    });
  },

  setPastePreviewPositionForDocument: (id, x, y) => {
    const doc = get().documents.get(id);
    if (!doc) return;

    const updatedDoc = {
      ...doc,
      pastePreviewPosition: { x, y }
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, updatedDoc);
      return { documents: newDocs };
    });
  },

  pasteAtForDocument: (id, x, y) => {
    const clipboard = get().clipboard;
    const doc = get().documents.get(id);
    if (!doc || !doc.map || !clipboard) return;

    get().pushUndoForDocument(id);

    const tiles: Array<{ x: number; y: number; tile: number }> = [];
    for (let dy = 0; dy < clipboard.height; dy++) {
      for (let dx = 0; dx < clipboard.width; dx++) {
        const mapX = x + dx;
        const mapY = y + dy;

        // Silently discard out-of-bounds tiles
        if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
          tiles.push({ x: mapX, y: mapY, tile: clipboard.tiles[dy * clipboard.width + dx] });
        }
      }
    }
    get().setTilesForDocument(id, tiles);
    get().commitUndoForDocument(id, 'Paste');

    // Pasted region becomes active selection
    const updatedDoc = get().documents.get(id)!;
    const finalDoc = {
      ...updatedDoc,
      isPasting: false,
      pastePreviewPosition: null,
      selection: {
        startX: x,
        startY: y,
        endX: Math.min(MAP_WIDTH - 1, x + clipboard.width - 1),
        endY: Math.min(MAP_HEIGHT - 1, y + clipboard.height - 1),
        active: true
      }
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, finalDoc);
      return { documents: newDocs };
    });
  },

  // Selection transforms
  rotateSelectionForDocument: (id, angle) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map || !doc.selection.active || doc.isPasting) return;

    // Calculate selection bounds
    const minX = Math.min(doc.selection.startX, doc.selection.endX);
    const minY = Math.min(doc.selection.startY, doc.selection.endY);
    const maxX = Math.max(doc.selection.startX, doc.selection.endX);
    const maxY = Math.max(doc.selection.startY, doc.selection.endY);

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Extract selection into temp array
    const extracted = new Uint16Array(width * height);
    let pos = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        extracted[pos++] = doc.map.tiles[y * MAP_WIDTH + x];
      }
    }

    // Rotate the extracted tiles
    const rotated = SelectionTransforms.rotate(extracted, width, height, angle);

    // Snapshot for undo
    get().pushUndoForDocument(id);

    // Clear original area
    const clearTiles: Array<{ x: number; y: number; tile: number }> = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        clearTiles.push({ x, y, tile: DEFAULT_TILE });
      }
    }
    get().setTilesForDocument(id, clearTiles);

    // Write rotated tiles starting at minX/minY, clipping out-of-bounds
    const writeTiles: Array<{ x: number; y: number; tile: number }> = [];
    for (let dy = 0; dy < rotated.height; dy++) {
      for (let dx = 0; dx < rotated.width; dx++) {
        const mapX = minX + dx;
        const mapY = minY + dy;

        // Silently discard out-of-bounds tiles
        if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
          writeTiles.push({ x: mapX, y: mapY, tile: rotated.tiles[dy * rotated.width + dx] });
        }
      }
    }
    get().setTilesForDocument(id, writeTiles);

    // Update selection bounds to fit rotated dimensions
    const updatedDoc = get().documents.get(id)!;
    const newEndX = Math.min(MAP_WIDTH - 1, minX + rotated.width - 1);
    const newEndY = Math.min(MAP_HEIGHT - 1, minY + rotated.height - 1);

    const finalDoc = {
      ...updatedDoc,
      selection: {
        startX: minX,
        startY: minY,
        endX: newEndX,
        endY: newEndY,
        active: true
      }
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, finalDoc);
      return { documents: newDocs };
    });

    // Commit undo
    get().commitUndoForDocument(id, `Rotate ${angle}°`);
  },

  mirrorSelectionForDocument: (id, direction) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map || !doc.selection.active || doc.isPasting) return;

    // Calculate selection bounds
    const minX = Math.min(doc.selection.startX, doc.selection.endX);
    const minY = Math.min(doc.selection.startY, doc.selection.endY);
    const maxX = Math.max(doc.selection.startX, doc.selection.endX);
    const maxY = Math.max(doc.selection.startY, doc.selection.endY);

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Extract selection into temp array
    const extracted = new Uint16Array(width * height);
    let pos = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        extracted[pos++] = doc.map.tiles[y * MAP_WIDTH + x];
      }
    }

    // Mirror the extracted tiles
    const mirrored = SelectionTransforms.mirror(extracted, width, height, direction);

    // Calculate adjacent copy position
    let copyX = minX;
    let copyY = minY;
    switch (direction) {
      case 'right':
        copyX = minX + width;
        break;
      case 'left':
        copyX = minX - width;
        break;
      case 'up':
        copyY = minY - height;
        break;
      case 'down':
        copyY = minY + height;
        break;
    }

    // Snapshot for undo
    get().pushUndoForDocument(id);

    // Write mirrored tiles at adjacent position, clipping out-of-bounds
    const writeTiles: Array<{ x: number; y: number; tile: number }> = [];
    let idx = 0;
    for (let dy = 0; dy < mirrored.height; dy++) {
      for (let dx = 0; dx < mirrored.width; dx++) {
        const mapX = copyX + dx;
        const mapY = copyY + dy;

        // Silently discard out-of-bounds tiles
        if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
          writeTiles.push({ x: mapX, y: mapY, tile: mirrored.tiles[idx] });
        }
        idx++;
      }
    }
    get().setTilesForDocument(id, writeTiles);

    // Keep selection at original bounds (don't expand to include mirrored copy)

    // Commit undo
    const dirLabel = direction.charAt(0).toUpperCase() + direction.slice(1);
    get().commitUndoForDocument(id, `Mirror ${dirLabel}`);
  },

  // Map operations
  updateMapHeaderForDocument: (id, updates) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map) return;

    const updatedDoc = {
      ...doc,
      map: {
        ...doc.map,
        header: { ...doc.map.header, ...updates },
        modified: true
      },
      modified: true
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, updatedDoc);
      return { documents: newDocs };
    });
  },

  markModifiedForDocument: (id) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map) return;

    const updatedDoc = {
      ...doc,
      map: { ...doc.map, modified: true },
      modified: true
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, updatedDoc);
      return { documents: newDocs };
    });
  },

  markSavedForDocument: (id) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map) return;

    const updatedDoc = {
      ...doc,
      map: { ...doc.map, modified: false },
      modified: false
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, updatedDoc);
      return { documents: newDocs };
    });
  },

  // Game object operations
  placeGameObjectForDocument: (id, x, y) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map) return false;

    // Get current tool and game object state from GlobalSlice
    const { currentTool, gameObjectToolState, animationOffsetInput } = get();
    const { selectedTeam, warpSrc, warpDest, warpType, switchType, flagPadType, spawnVariant } = gameObjectToolState;

    let success = false;
    switch (currentTool) {
      case ToolType.FLAG:
        // Flag: pad and center flag are always the same team (matches SEdit)
        success = gameObjectSystem.placeFlag(doc.map, x, y, flagPadType, flagPadType);
        break;
      case ToolType.FLAG_POLE: {
        // Pole: dropdown selects pad team, radio buttons select receiver team
        const polePad = Math.min(flagPadType, 3);
        success = gameObjectSystem.placePole(doc.map, x, y, polePad, selectedTeam);
        break;
      }
      case ToolType.WARP:
        if (warpType === 5) {
          // 0x9E (warpType 5) is 3x3 animated block, requires different placement logic
          success = gameObjectSystem.placeAnimatedWarp(doc.map, x, y, warpSrc, warpDest);
        } else {
          const animId = WARP_STYLES[warpType];
          success = gameObjectSystem.placeWarp(doc.map, x, y, animId, warpSrc, warpDest);
        }
        break;
      case ToolType.SPAWN:
        if (spawnVariant === 1) {
          success = gameObjectSystem.placeAnimatedSpawn(doc.map, x, y, selectedTeam, animationOffsetInput);
        } else {
          success = gameObjectSystem.placeSpawn(doc.map, x, y, selectedTeam);
        }
        break;
      case ToolType.SWITCH:
        success = gameObjectSystem.placeSwitch(doc.map, x, y, switchType);
        break;
      case ToolType.TURRET: {
        const { turretWeapon, turretTeam, turretFireRate } = gameObjectToolState;
        success = gameObjectSystem.placeTurret(doc.map, x, y, turretWeapon, turretTeam, turretFireRate);
        break;
      }
    }

    if (success) {
      doc.map.modified = true;
      const newMap = { ...doc.map } as MapData;
      set((state) => {
        const newDocs = new Map(state.documents);
        newDocs.set(id, { ...doc, map: newMap, modified: true });
        return { documents: newDocs };
      });
    }
    return success;
  },

  placeGameObjectRectForDocument: (id, x1, y1, x2, y2) => {
    const doc = get().documents.get(id);
    if (!doc || !doc.map) return false;

    // Get current tool and game object state from GlobalSlice
    const { currentTool, gameObjectToolState } = get();
    const { selectedTeam, bunkerDir, bunkerStyle, holdingPenType, bridgeDir, conveyorDir } = gameObjectToolState;

    let success = false;
    switch (currentTool) {
      case ToolType.BUNKER:
        success = gameObjectSystem.placeBunker(doc.map, x1, y1, x2, y2, bunkerDir, bunkerStyle);
        break;
      case ToolType.HOLDING_PEN:
        success = gameObjectSystem.placeHoldingPen(doc.map, x1, y1, x2, y2, selectedTeam, holdingPenType);
        break;
      case ToolType.BRIDGE: {
        const bridgeData = bridgeDir === 0 ? bridgeLrData : bridgeUdData;
        if (bridgeData.length > 0) {
          success = gameObjectSystem.placeBridge(doc.map, x1, y1, x2, y2, bridgeDir, bridgeData[0]);
        }
        break;
      }
      case ToolType.CONVEYOR: {
        let placementDir: number;
        let convData: number[];
        switch (conveyorDir) {
          case 0: // Left
            placementDir = 0;
            convData = convLrData.length > 0 ? convLrData[0] : [];
            break;
          case 1: // Right
            placementDir = 0;
            convData = CONV_RIGHT_DATA;
            break;
          case 2: // Up
            placementDir = 1;
            convData = convUdData.length > 0 ? convUdData[0] : [];
            break;
          case 3: // Down
            placementDir = 1;
            convData = CONV_DOWN_DATA;
            break;
          default:
            placementDir = 0;
            convData = convLrData.length > 0 ? convLrData[0] : [];
        }
        if (convData.length > 0) {
          success = gameObjectSystem.placeConveyor(doc.map, x1, y1, x2, y2, placementDir, convData);
        }
        break;
      }
      case ToolType.WALL_RECT: {
        // Wall rect: draw walls along rectangle border
        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const maxX = Math.max(x1, x2);
        const maxY = Math.max(y1, y2);

        // Collect all rectangle border positions
        const positions: Array<{ x: number; y: number }> = [];

        // Top and bottom edges
        for (let px = minX; px <= maxX; px++) {
          positions.push({ x: px, y: minY });
          positions.push({ x: px, y: maxY });
        }
        // Left and right edges (exclude corners already added)
        for (let py = minY + 1; py < maxY; py++) {
          positions.push({ x: minX, y: py });
          positions.push({ x: maxX, y: py });
        }

        wallSystem.placeWallBatch(doc.map, positions);
        success = true;
        break;
      }
    }

    if (success) {
      doc.map.modified = true;
      const newMap = { ...doc.map } as MapData;
      set((state) => {
        const newDocs = new Map(state.documents);
        newDocs.set(id, { ...doc, map: newMap, modified: true });
        return { documents: newDocs };
      });
    }
    return success;
  }
});
