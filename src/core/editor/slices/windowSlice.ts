/**
 * Window slice - MDI child window state and arrangement
 */

import { StateCreator } from 'zustand';
import { DocumentId, WindowState, TraceImageWindowState, MAX_TRACE_IMAGES } from './types';
import { cascadeWindows, tileWindowsHorizontal, tileWindowsVertical } from './windowArrangement';
import { DocumentsSlice } from './documentsSlice';
import { GlobalSlice } from './globalSlice';

const DEFAULT_WINDOW_WIDTH = 800;
const DEFAULT_WINDOW_HEIGHT = 600;
const CASCADE_OFFSET = 40;
const BASE_Z_INDEX = 1000;
const Z_INDEX_NORMALIZE_THRESHOLD = 100000;
const TRACE_BASE_Z_INDEX = 5000;
const TRACE_Z_INDEX_NORMALIZE_THRESHOLD = 100000;

export interface WindowSlice {
  // Window state
  windowStates: Map<DocumentId, WindowState>;
  nextZIndex: number;

  // Trace image window state
  traceImageWindows: Map<string, TraceImageWindowState>;
  nextTraceZIndex: number;

  // Actions
  createWindowState: (docId: DocumentId, title: string) => void;
  removeWindowState: (docId: DocumentId) => void;
  updateWindowState: (docId: DocumentId, updates: Partial<WindowState>) => void;
  raiseWindow: (docId: DocumentId) => void;
  arrangeWindows: (mode: 'cascade' | 'tileHorizontal' | 'tileVertical') => void;
  minimizeWindow: (docId: DocumentId) => void;
  restoreWindow: (docId: DocumentId) => void;
  maximizeWindow: (docId: DocumentId) => void;
  unmaximizeWindow: (docId: DocumentId) => void;

  // Trace image window actions
  createTraceImageWindow: (imageSrc: string, fileName: string) => string | null;
  removeTraceImageWindow: (id: string) => void;
  updateTraceImageWindow: (id: string, updates: Partial<TraceImageWindowState>) => void;
  raiseTraceImageWindow: (id: string) => void;
}

export const createWindowSlice: StateCreator<
  DocumentsSlice & GlobalSlice & WindowSlice,
  [],
  [],
  WindowSlice
> = (set, _get) => ({
  // Initial state
  windowStates: new Map(),
  nextZIndex: BASE_Z_INDEX,
  traceImageWindows: new Map(),
  nextTraceZIndex: TRACE_BASE_Z_INDEX,

  // Create window state with cascade positioning
  createWindowState: (docId, title) => {
    set((state) => {
      const newWindowStates = new Map(state.windowStates);
      const cascadeIndex = newWindowStates.size;
      const x = cascadeIndex * CASCADE_OFFSET;
      const y = cascadeIndex * CASCADE_OFFSET;

      newWindowStates.set(docId, {
        x,
        y,
        width: DEFAULT_WINDOW_WIDTH,
        height: DEFAULT_WINDOW_HEIGHT,
        zIndex: state.nextZIndex,
        title,
        isMinimized: false,
        isMaximized: false,
        savedBounds: null
      });

      let newNextZIndex = state.nextZIndex + 1;

      // Normalize z-indexes if threshold exceeded
      if (newNextZIndex > Z_INDEX_NORMALIZE_THRESHOLD) {
        let zIndex = BASE_Z_INDEX;
        const normalizedStates = new Map<DocumentId, WindowState>();
        for (const [id, windowState] of newWindowStates) {
          normalizedStates.set(id, { ...windowState, zIndex: zIndex++ });
        }
        newNextZIndex = zIndex;
        return { windowStates: normalizedStates, nextZIndex: newNextZIndex };
      }

      return { windowStates: newWindowStates, nextZIndex: newNextZIndex };
    });
  },

  // Remove window state
  removeWindowState: (docId) => {
    set((state) => {
      const newWindowStates = new Map(state.windowStates);
      newWindowStates.delete(docId);
      return { windowStates: newWindowStates };
    });
  },

  // Update window state (for drag/resize)
  updateWindowState: (docId, updates) => {
    set((state) => {
      const existing = state.windowStates.get(docId);
      if (!existing) return {};

      const newWindowStates = new Map(state.windowStates);
      newWindowStates.set(docId, { ...existing, ...updates });
      return { windowStates: newWindowStates };
    });
  },

  // Raise window to front
  raiseWindow: (docId) => {
    set((state) => {
      const existing = state.windowStates.get(docId);
      if (!existing) return {};

      const newWindowStates = new Map(state.windowStates);
      newWindowStates.set(docId, { ...existing, zIndex: state.nextZIndex });

      let newNextZIndex = state.nextZIndex + 1;

      // Normalize z-indexes if threshold exceeded
      if (newNextZIndex > Z_INDEX_NORMALIZE_THRESHOLD) {
        let zIndex = BASE_Z_INDEX;
        const normalizedStates = new Map<DocumentId, WindowState>();
        for (const [id, windowState] of newWindowStates) {
          normalizedStates.set(id, { ...windowState, zIndex: zIndex++ });
        }
        newNextZIndex = zIndex;
        return { windowStates: normalizedStates, nextZIndex: newNextZIndex };
      }

      return { windowStates: newWindowStates, nextZIndex: newNextZIndex };
    });
  },

  // Arrange windows using pure functions
  arrangeWindows: (mode) => {
    set((state) => {
      // Query workspace size (fallback to reasonable defaults)
      const workspace = document.querySelector('.workspace');
      const workspaceWidth = workspace?.clientWidth || 1200;
      const workspaceHeight = workspace?.clientHeight || 800;

      let newWindowStates: Map<DocumentId, WindowState>;

      switch (mode) {
        case 'cascade':
          newWindowStates = cascadeWindows(state.windowStates, workspaceWidth, workspaceHeight);
          break;
        case 'tileHorizontal':
          newWindowStates = tileWindowsHorizontal(state.windowStates, workspaceWidth, workspaceHeight);
          break;
        case 'tileVertical':
          newWindowStates = tileWindowsVertical(state.windowStates, workspaceWidth, workspaceHeight);
          break;
      }

      return { windowStates: newWindowStates };
    });
  },

  // Minimize window to bar
  minimizeWindow: (docId) => {
    set((state) => {
      const existing = state.windowStates.get(docId);
      if (!existing || existing.isMinimized) return {};

      const newWindowStates = new Map(state.windowStates);

      // Save current bounds (or savedBounds if already maximized)
      const savedBounds = existing.isMaximized && existing.savedBounds
        ? existing.savedBounds
        : { x: existing.x, y: existing.y, width: existing.width, height: existing.height };

      newWindowStates.set(docId, {
        ...existing,
        isMinimized: true,
        isMaximized: false,
        savedBounds
      });

      // Auto-activate next topmost non-minimized window if this was active
      let newActiveId = state.activeDocumentId;
      if (state.activeDocumentId === docId) {
        const candidates = Array.from(newWindowStates.entries())
          .filter(([id, ws]) => id !== docId && !ws.isMinimized)
          .sort((a, b) => b[1].zIndex - a[1].zIndex);

        newActiveId = candidates.length > 0 ? candidates[0][0] : null;
      }

      return { windowStates: newWindowStates, activeDocumentId: newActiveId };
    });
  },

  // Restore minimized window
  restoreWindow: (docId) => {
    set((state) => {
      const existing = state.windowStates.get(docId);
      if (!existing || !existing.isMinimized) return {};

      const newWindowStates = new Map(state.windowStates);

      // Restore position/size from savedBounds
      const restored = {
        ...existing,
        x: existing.savedBounds?.x ?? existing.x,
        y: existing.savedBounds?.y ?? existing.y,
        width: existing.savedBounds?.width ?? existing.width,
        height: existing.savedBounds?.height ?? existing.height,
        isMinimized: false,
        isMaximized: false,
        savedBounds: null,
        zIndex: state.nextZIndex
      };

      newWindowStates.set(docId, restored);

      let newNextZIndex = state.nextZIndex + 1;

      // Normalize z-indexes if threshold exceeded
      if (newNextZIndex > Z_INDEX_NORMALIZE_THRESHOLD) {
        let zIndex = BASE_Z_INDEX;
        const normalizedStates = new Map<DocumentId, WindowState>();
        for (const [id, windowState] of newWindowStates) {
          normalizedStates.set(id, { ...windowState, zIndex: zIndex++ });
        }
        newNextZIndex = zIndex;
        return {
          windowStates: normalizedStates,
          nextZIndex: newNextZIndex,
          activeDocumentId: docId
        };
      }

      return {
        windowStates: newWindowStates,
        nextZIndex: newNextZIndex,
        activeDocumentId: docId
      };
    });
  },

  // Maximize window to workspace
  maximizeWindow: (docId) => {
    set((state) => {
      const existing = state.windowStates.get(docId);
      if (!existing || existing.isMaximized) return {};

      // Query workspace dimensions
      const workspace = document.querySelector('.workspace');
      const workspaceWidth = workspace?.clientWidth || 1200;
      const workspaceHeight = workspace?.clientHeight || 800;

      const newWindowStates = new Map(state.windowStates);

      // Save current bounds (only if not already minimized)
      const savedBounds = existing.isMinimized && existing.savedBounds
        ? existing.savedBounds
        : { x: existing.x, y: existing.y, width: existing.width, height: existing.height };

      newWindowStates.set(docId, {
        ...existing,
        x: 0,
        y: 0,
        width: workspaceWidth,
        height: workspaceHeight,
        isMaximized: true,
        isMinimized: false,
        savedBounds,
        zIndex: state.nextZIndex
      });

      let newNextZIndex = state.nextZIndex + 1;

      // Normalize z-indexes if threshold exceeded
      if (newNextZIndex > Z_INDEX_NORMALIZE_THRESHOLD) {
        let zIndex = BASE_Z_INDEX;
        const normalizedStates = new Map<DocumentId, WindowState>();
        for (const [id, windowState] of newWindowStates) {
          normalizedStates.set(id, { ...windowState, zIndex: zIndex++ });
        }
        newNextZIndex = zIndex;
        return {
          windowStates: normalizedStates,
          nextZIndex: newNextZIndex,
          activeDocumentId: docId
        };
      }

      return {
        windowStates: newWindowStates,
        nextZIndex: newNextZIndex,
        activeDocumentId: docId
      };
    });
  },

  // Un-maximize window
  unmaximizeWindow: (docId) => {
    set((state) => {
      const existing = state.windowStates.get(docId);
      if (!existing || !existing.isMaximized) return {};

      const newWindowStates = new Map(state.windowStates);

      // Restore position/size from savedBounds
      newWindowStates.set(docId, {
        ...existing,
        x: existing.savedBounds?.x ?? existing.x,
        y: existing.savedBounds?.y ?? existing.y,
        width: existing.savedBounds?.width ?? existing.width,
        height: existing.savedBounds?.height ?? existing.height,
        isMaximized: false,
        savedBounds: null
      });

      return { windowStates: newWindowStates };
    });
  },

  // Create trace image window with cascade positioning
  createTraceImageWindow: (imageSrc, fileName) => {
    const state = _get();

    // Enforce MAX_TRACE_IMAGES limit
    if (state.traceImageWindows.size >= MAX_TRACE_IMAGES) {
      alert(`Maximum ${MAX_TRACE_IMAGES} trace images can be open simultaneously. Close a trace image first.`);
      return null;
    }

    const id = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cascadeIndex = state.traceImageWindows.size;
    const x = 30 + cascadeIndex * 30;
    const y = 30 + cascadeIndex * 30;

    set((state) => {
      const newTraceWindows = new Map(state.traceImageWindows);
      newTraceWindows.set(id, {
        id,
        imageSrc,
        fileName,
        x,
        y,
        width: 400,
        height: 300,
        zIndex: state.nextTraceZIndex,
        opacity: 50,
        isMinimized: false
      });

      let newNextTraceZIndex = state.nextTraceZIndex + 1;

      // Normalize z-indexes if threshold exceeded
      if (newNextTraceZIndex > TRACE_Z_INDEX_NORMALIZE_THRESHOLD) {
        let zIndex = TRACE_BASE_Z_INDEX;
        const normalizedStates = new Map<string, TraceImageWindowState>();
        for (const [id, traceWindow] of newTraceWindows) {
          normalizedStates.set(id, { ...traceWindow, zIndex: zIndex++ });
        }
        newNextTraceZIndex = zIndex;
        return { traceImageWindows: normalizedStates, nextTraceZIndex: newNextTraceZIndex };
      }

      return { traceImageWindows: newTraceWindows, nextTraceZIndex: newNextTraceZIndex };
    });

    return id;
  },

  // Remove trace image window
  removeTraceImageWindow: (id) => {
    set((state) => {
      const newTraceWindows = new Map(state.traceImageWindows);
      newTraceWindows.delete(id);
      return { traceImageWindows: newTraceWindows };
    });
  },

  // Update trace image window state
  updateTraceImageWindow: (id, updates) => {
    set((state) => {
      const existing = state.traceImageWindows.get(id);
      if (!existing) return {};

      const newTraceWindows = new Map(state.traceImageWindows);
      newTraceWindows.set(id, { ...existing, ...updates });
      return { traceImageWindows: newTraceWindows };
    });
  },

  // Raise trace image window to front
  raiseTraceImageWindow: (id) => {
    set((state) => {
      const existing = state.traceImageWindows.get(id);
      if (!existing) return {};

      const newTraceWindows = new Map(state.traceImageWindows);
      newTraceWindows.set(id, { ...existing, zIndex: state.nextTraceZIndex });

      let newNextTraceZIndex = state.nextTraceZIndex + 1;

      // Normalize z-indexes if threshold exceeded
      if (newNextTraceZIndex > TRACE_Z_INDEX_NORMALIZE_THRESHOLD) {
        let zIndex = TRACE_BASE_Z_INDEX;
        const normalizedStates = new Map<string, TraceImageWindowState>();
        for (const [id, traceWindow] of newTraceWindows) {
          normalizedStates.set(id, { ...traceWindow, zIndex: zIndex++ });
        }
        newNextTraceZIndex = zIndex;
        return { traceImageWindows: normalizedStates, nextTraceZIndex: newNextTraceZIndex };
      }

      return { traceImageWindows: newTraceWindows, nextTraceZIndex: newNextTraceZIndex };
    });
  }
});
