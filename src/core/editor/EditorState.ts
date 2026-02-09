/**
 * Editor state management using Zustand
 * Refactored to use slices-based architecture with backward-compatible API
 */

import { create } from 'zustand';
import { createDocumentsSlice, DocumentsSlice } from './slices/documentsSlice';
import { createGlobalSlice, GlobalSlice } from './slices/globalSlice';
import { MapData, MapHeader, createEmptyMap } from '../map/types';

// Re-export types for consumers
export * from './slices/types';

// Combined editor state
type EditorState = DocumentsSlice & GlobalSlice & BackwardCompatLayer;

// Backward-compatible wrapper layer
interface BackwardCompatLayer {
  // Top-level state fields that mirror the active document
  map: MapData | null;
  filePath: string | null;
  viewport: { x: number; y: number; zoom: number };
  selection: { startX: number; startY: number; endX: number; endY: number; active: boolean };
  clipboard: any;
  isPasting: boolean;
  pastePreviewPosition: { x: number; y: number } | null;
  undoStack: any[];
  redoStack: any[];
  pendingUndoSnapshot: Uint16Array | null;

  // Backward-compatible wrapper actions
  setMap: (map: MapData | null, filePath?: string) => void;
  newMap: () => void;
  setTile: (x: number, y: number, tile: number) => void;
  setTiles: (tiles: Array<{ x: number; y: number; tile: number }>) => void;
  placeWall: (x: number, y: number) => void;
  eraseTile: (x: number, y: number) => void;
  fillArea: (x: number, y: number) => void;
  pushUndo: () => void;
  commitUndo: (description: string) => void;
  undo: () => void;
  redo: () => void;
  setViewport: (viewport: Partial<{ x: number; y: number; zoom: number }>) => void;
  setSelection: (selection: Partial<{ startX: number; startY: number; endX: number; endY: number; active: boolean }>) => void;
  clearSelection: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: () => void;
  deleteSelection: () => void;
  startPasting: () => void;
  cancelPasting: () => void;
  setPastePreviewPosition: (x: number, y: number) => void;
  pasteAt: (x: number, y: number) => void;
  mirrorHorizontal: () => void;
  mirrorVertical: () => void;
  rotateClipboard: () => void;
  updateMapHeader: (updates: Partial<MapHeader>) => void;
  markModified: () => void;
  markSaved: () => void;
  placeGameObject: (x: number, y: number) => boolean;
  placeGameObjectRect: (x1: number, y1: number, x2: number, y2: number) => boolean;
}

// Sync top-level fields from active document
function syncTopLevelFields(state: EditorState): Partial<EditorState> {
  const { activeDocumentId, documents } = state;
  if (!activeDocumentId) {
    return {
      map: null,
      filePath: null,
      viewport: { x: 0, y: 0, zoom: 1 },
      selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
      clipboard: null,
      isPasting: false,
      pastePreviewPosition: null,
      undoStack: [],
      redoStack: [],
      pendingUndoSnapshot: null
    };
  }

  const doc = documents.get(activeDocumentId);
  if (!doc) {
    return {
      map: null,
      filePath: null,
      viewport: { x: 0, y: 0, zoom: 1 },
      selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
      clipboard: null,
      isPasting: false,
      pastePreviewPosition: null,
      undoStack: [],
      redoStack: [],
      pendingUndoSnapshot: null
    };
  }

  return {
    map: doc.map,
    filePath: doc.filePath,
    viewport: doc.viewport,
    selection: doc.selection,
    clipboard: doc.clipboard,
    isPasting: doc.isPasting,
    pastePreviewPosition: doc.pastePreviewPosition,
    undoStack: doc.undoStack,
    redoStack: doc.redoStack,
    pendingUndoSnapshot: doc.pendingUndoSnapshot
  };
}

export const useEditorStore = create<EditorState>()((set, get, store) => ({
  // Compose the two slices
  ...createDocumentsSlice(set, get, store),
  ...createGlobalSlice(set, get, store),

  // Initialize top-level backward-compatible fields
  map: null,
  filePath: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
  clipboard: null,
  isPasting: false,
  pastePreviewPosition: null,
  undoStack: [],
  redoStack: [],
  pendingUndoSnapshot: null,

  // Override createDocument to also sync top-level fields
  createDocument: (map, filePath?) => {
    const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const docState = {
      map,
      filePath: filePath || null,
      viewport: { x: 0, y: 0, zoom: 1 },
      selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
      clipboard: null,
      isPasting: false,
      pastePreviewPosition: null,
      undoStack: [],
      redoStack: [],
      pendingUndoSnapshot: null,
      modified: false
    };

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, docState);
      return {
        documents: newDocs,
        activeDocumentId: id,
        ...syncTopLevelFields({ ...state, documents: newDocs, activeDocumentId: id } as EditorState)
      };
    });

    return id;
  },

  // Override setActiveDocument to sync top-level fields
  setActiveDocument: (id) => {
    const doc = get().documents.get(id);
    if (!doc) return;

    set((state) => ({
      activeDocumentId: id,
      ...syncTopLevelFields({ ...state, activeDocumentId: id } as EditorState)
    }));
  },

  // Override closeDocument to sync top-level fields
  closeDocument: (id) => {
    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.delete(id);

      let newActiveId: string | null = state.activeDocumentId;
      if (state.activeDocumentId === id) {
        newActiveId = newDocs.size > 0 ? (newDocs.keys().next().value as string) : null;
      }

      return {
        documents: newDocs,
        activeDocumentId: newActiveId,
        ...syncTopLevelFields({ ...state, documents: newDocs, activeDocumentId: newActiveId } as EditorState)
      };
    });
  },

  // Backward-compatible wrappers that delegate to active document

  setMap: (map, filePath?) => {
    if (!map) return;
    get().createDocument(map, filePath);
  },

  newMap: () => {
    const map = createEmptyMap();
    get().createDocument(map);
  },

  setTile: (x, y, tile) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().setTileForDocument(id, x, y, tile);
    // Sync top-level map state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  setTiles: (tiles) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().setTilesForDocument(id, tiles);
    // Sync top-level map state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  placeWall: (x, y) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().placeWallForDocument(id, x, y);
    // Sync top-level map state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  eraseTile: (x, y) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().eraseTileForDocument(id, x, y);
    // Sync top-level map state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  fillArea: (x, y) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().fillAreaForDocument(id, x, y);
    // Sync top-level map state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  pushUndo: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().pushUndoForDocument(id);
    // Sync top-level undo state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  commitUndo: (description) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().commitUndoForDocument(id, description);
    // Sync top-level undo state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  undo: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().undoForDocument(id);
    // Sync top-level state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  redo: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().redoForDocument(id);
    // Sync top-level state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  setViewport: (viewport) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().setViewportForDocument(id, viewport);
    // Sync top-level viewport
    set((state) => syncTopLevelFields(state as EditorState));
  },

  setSelection: (selection) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().setSelectionForDocument(id, selection);
    // Sync top-level selection
    set((state) => syncTopLevelFields(state as EditorState));
  },

  clearSelection: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().clearSelectionForDocument(id);
    // Sync top-level selection
    set((state) => syncTopLevelFields(state as EditorState));
  },

  copySelection: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().copySelectionForDocument(id);
    // Sync top-level clipboard
    set((state) => syncTopLevelFields(state as EditorState));
  },

  cutSelection: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().cutSelectionForDocument(id);
    // Sync top-level state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  pasteClipboard: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().startPastingForDocument(id);
    // Sync top-level paste state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  deleteSelection: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().deleteSelectionForDocument(id);
    // Sync top-level state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  startPasting: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().startPastingForDocument(id);
    // Sync top-level paste state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  cancelPasting: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().cancelPastingForDocument(id);
    // Sync top-level paste state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  setPastePreviewPosition: (x, y) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().setPastePreviewPositionForDocument(id, x, y);
    // Sync top-level paste state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  pasteAt: (x, y) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().pasteAtForDocument(id, x, y);
    // Sync top-level state
    set((state) => syncTopLevelFields(state as EditorState));
  },

  mirrorHorizontal: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().mirrorHorizontalForDocument(id);
    // Sync top-level clipboard
    set((state) => syncTopLevelFields(state as EditorState));
  },

  mirrorVertical: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().mirrorVerticalForDocument(id);
    // Sync top-level clipboard
    set((state) => syncTopLevelFields(state as EditorState));
  },

  rotateClipboard: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().rotateClipboardForDocument(id);
    // Sync top-level clipboard
    set((state) => syncTopLevelFields(state as EditorState));
  },

  updateMapHeader: (updates) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().updateMapHeaderForDocument(id, updates);
    // Sync top-level map
    set((state) => syncTopLevelFields(state as EditorState));
  },

  markModified: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().markModifiedForDocument(id);
    // Sync top-level map
    set((state) => syncTopLevelFields(state as EditorState));
  },

  markSaved: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().markSavedForDocument(id);
    // Sync top-level map
    set((state) => syncTopLevelFields(state as EditorState));
  },

  placeGameObject: (x, y) => {
    const id = get().activeDocumentId;
    if (!id) return false;
    const result = get().placeGameObjectForDocument(id, x, y);
    // Sync top-level map
    set((state) => syncTopLevelFields(state as EditorState));
    return result;
  },

  placeGameObjectRect: (x1, y1, x2, y2) => {
    const id = get().activeDocumentId;
    if (!id) return false;
    const result = get().placeGameObjectRectForDocument(id, x1, y1, x2, y2);
    // Sync top-level map
    set((state) => syncTopLevelFields(state as EditorState));
    return result;
  }
}));
