/**
 * Window slice - MDI child window state and arrangement
 */

import { StateCreator } from 'zustand';
import { DocumentId, WindowState } from './types';
import { cascadeWindows, tileWindowsHorizontal, tileWindowsVertical } from './windowArrangement';
import { DocumentsSlice } from './documentsSlice';
import { GlobalSlice } from './globalSlice';

const DEFAULT_WINDOW_WIDTH = 800;
const DEFAULT_WINDOW_HEIGHT = 600;
const CASCADE_OFFSET = 40;
const BASE_Z_INDEX = 1000;
const Z_INDEX_NORMALIZE_THRESHOLD = 100000;

export interface WindowSlice {
  // Window state
  windowStates: Map<DocumentId, WindowState>;
  nextZIndex: number;

  // Actions
  createWindowState: (docId: DocumentId, title: string) => void;
  removeWindowState: (docId: DocumentId) => void;
  updateWindowState: (docId: DocumentId, updates: Partial<WindowState>) => void;
  raiseWindow: (docId: DocumentId) => void;
  arrangeWindows: (mode: 'cascade' | 'tileHorizontal' | 'tileVertical') => void;
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
        title
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
  }
});
