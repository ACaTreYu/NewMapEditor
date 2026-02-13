/**
 * Editor state management using Zustand
 * Refactored to use slices-based architecture with backward-compatible API
 */

import { create } from 'zustand';
import { createDocumentsSlice, DocumentsSlice } from './slices/documentsSlice';
import { createGlobalSlice, GlobalSlice } from './slices/globalSlice';
import { createWindowSlice, WindowSlice } from './slices/windowSlice';
import { MapData, MapHeader, createEmptyMap } from '../map/types';
import { MAX_OPEN_DOCUMENTS } from './slices/types';

// Re-export types for consumers
export * from './slices/types';

// Combined editor state
type EditorState = DocumentsSlice & GlobalSlice & WindowSlice & BackwardCompatLayer;

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
    isPasting: doc.isPasting,
    pastePreviewPosition: doc.pastePreviewPosition,
    undoStack: doc.undoStack,
    redoStack: doc.redoStack,
    pendingUndoSnapshot: doc.pendingUndoSnapshot
  };
}

const useEditorStore = create<EditorState>()((set, get, store) => ({
  // Compose the three slices
  ...createDocumentsSlice(set, get, store),
  ...createGlobalSlice(set, get, store),
  ...createWindowSlice(set, get, store),

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
    // Enforce MAX_OPEN_DOCUMENTS limit
    const state = get();
    if (state.documents.size >= MAX_OPEN_DOCUMENTS) {
      alert('Maximum 8 documents can be open simultaneously. Close a document first.');
      return null;
    }

    const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const docState = {
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

    // Extract title from filePath or use 'Untitled'
    let title = 'Untitled';
    if (filePath) {
      const parts = filePath.replace(/\\/g, '/').split('/');
      title = parts[parts.length - 1] || 'Untitled';
    }

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, docState);
      return {
        documents: newDocs,
        activeDocumentId: id,
        ...syncTopLevelFields({ ...state, documents: newDocs, activeDocumentId: id } as EditorState)
      };
    });

    // Create window state after document creation
    get().createWindowState(id, title);

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

    // Raise window to front
    get().raiseWindow(id);
  },

  // Override closeDocument to sync top-level fields
  closeDocument: (id) => {
    // Remove window state before deleting document
    get().removeWindowState(id);

    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.delete(id);

      let newActiveId: string | null = state.activeDocumentId;
      if (state.activeDocumentId === id) {
        // Prefer non-minimized windows
        const windowStates = state.windowStates;
        const candidates = Array.from(newDocs.keys())
          .map(docId => ({ docId, ws: windowStates.get(docId) }))
          .filter(({ ws }) => ws && !ws.isMinimized)
          .sort((a, b) => (b.ws?.zIndex ?? 0) - (a.ws?.zIndex ?? 0));

        newActiveId = candidates.length > 0
          ? candidates[0].docId
          : (newDocs.size > 0 ? (newDocs.keys().next().value as string) : null);
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
    // Sync only map field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map });
  },

  setTiles: (tiles) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().setTilesForDocument(id, tiles);
    // Sync only map field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map });
  },

  placeWall: (x, y) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().placeWallForDocument(id, x, y);
    // Sync only map field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map });
  },

  eraseTile: (x, y) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().eraseTileForDocument(id, x, y);
    // Sync only map field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map });
  },

  fillArea: (x, y) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().fillAreaForDocument(id, x, y);
    // Sync only map field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map });
  },

  pushUndo: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().pushUndoForDocument(id);
    // Sync only undo-related fields (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ undoStack: doc.undoStack, pendingUndoSnapshot: doc.pendingUndoSnapshot });
  },

  commitUndo: (description) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().commitUndoForDocument(id, description);
    // Sync only undo-related fields (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ undoStack: doc.undoStack, pendingUndoSnapshot: doc.pendingUndoSnapshot });
  },

  undo: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().undoForDocument(id);
    // Sync map + undo stacks (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map, undoStack: doc.undoStack, redoStack: doc.redoStack });
  },

  redo: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().redoForDocument(id);
    // Sync map + undo stacks (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map, undoStack: doc.undoStack, redoStack: doc.redoStack });
  },

  setViewport: (viewport) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().setViewportForDocument(id, viewport);
    // Sync only viewport field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ viewport: doc.viewport });
  },

  setSelection: (selection) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().setSelectionForDocument(id, selection);
    // Sync only selection field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ selection: doc.selection });
  },

  clearSelection: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().clearSelectionForDocument(id);
    // Sync only selection field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ selection: doc.selection });
  },

  copySelection: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().copySelectionForDocument(id);
    // Clipboard is on GlobalSlice, already synced by copySelectionForDocument
  },

  cutSelection: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().cutSelectionForDocument(id);
    // Sync map + selection (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map, selection: doc.selection });
  },

  pasteClipboard: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().startPastingForDocument(id);
    // Sync only isPasting field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ isPasting: doc.isPasting });
  },

  deleteSelection: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().deleteSelectionForDocument(id);
    // Sync map + selection (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map, selection: doc.selection });
  },

  startPasting: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().startPastingForDocument(id);
    // Sync only isPasting field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ isPasting: doc.isPasting });
  },

  cancelPasting: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().cancelPastingForDocument(id);
    // Sync isPasting + pastePreviewPosition (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ isPasting: doc.isPasting, pastePreviewPosition: doc.pastePreviewPosition });
  },

  setPastePreviewPosition: (x, y) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().setPastePreviewPositionForDocument(id, x, y);
    // Sync only pastePreviewPosition field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ pastePreviewPosition: doc.pastePreviewPosition });
  },

  pasteAt: (x, y) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().pasteAtForDocument(id, x, y);
    // Sync map + paste fields (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map, isPasting: doc.isPasting, pastePreviewPosition: doc.pastePreviewPosition });
  },

  updateMapHeader: (updates) => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().updateMapHeaderForDocument(id, updates);
    // Sync only map field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map });
  },

  markModified: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().markModifiedForDocument(id);
    // Sync only map field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map });
  },

  markSaved: () => {
    const id = get().activeDocumentId;
    if (!id) return;
    get().markSavedForDocument(id);
    // Sync only map field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map });
  },

  placeGameObject: (x, y) => {
    const id = get().activeDocumentId;
    if (!id) return false;
    const result = get().placeGameObjectForDocument(id, x, y);
    // Sync only map field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map });
    return result;
  },

  placeGameObjectRect: (x1, y1, x2, y2) => {
    const id = get().activeDocumentId;
    if (!id) return false;
    const result = get().placeGameObjectRectForDocument(id, x1, y1, x2, y2);
    // Sync only map field (granular update)
    const doc = get().documents.get(id);
    if (doc) set({ map: doc.map });
    return result;
  }
}));

// --- Grid settings persistence ---
const GRID_STORAGE_KEY = 'ac-map-editor-grid-settings';

// Load persisted grid settings and apply to store
try {
  const stored = localStorage.getItem(GRID_STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    const updates: Record<string, unknown> = {};
    if (typeof parsed.opacity === 'number') updates.gridOpacity = Math.max(0, Math.min(100, parsed.opacity));
    if (typeof parsed.lineWeight === 'number') updates.gridLineWeight = Math.max(1, Math.min(3, parsed.lineWeight));
    if (typeof parsed.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(parsed.color)) updates.gridColor = parsed.color.toUpperCase();
    if (Object.keys(updates).length > 0) {
      useEditorStore.setState(updates);
    }
  }
} catch {
  // Ignore corrupt localStorage
}

// Persist grid settings on change
useEditorStore.subscribe((state, prevState) => {
  if (
    state.gridOpacity !== prevState.gridOpacity ||
    state.gridLineWeight !== prevState.gridLineWeight ||
    state.gridColor !== prevState.gridColor
  ) {
    try {
      localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify({
        opacity: state.gridOpacity,
        lineWeight: state.gridLineWeight,
        color: state.gridColor,
      }));
    } catch {
      // Ignore quota exceeded
    }
  }
});

export { useEditorStore };
