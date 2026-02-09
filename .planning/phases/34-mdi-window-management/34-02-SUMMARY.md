---
phase: 34-mdi-window-management
plan: 02
subsystem: ui
tags: [mdi, workspace, child-window, react-rnd, electron-menu]
requires:
  - phase: 34-01
    provides: Window state slice with cascade/tile arrangement algorithms
provides:
  - MDI workspace container with ChildWindow per document
  - Draggable/resizable child windows via react-rnd
  - Window chrome (title bar, close button, active/inactive states)
  - Electron Window menu (Cascade, Tile Horizontal, Tile Vertical)
  - File/Edit menu with IPC integration
  - Per-document MapCanvas rendering
affects:
  - app-layout (single MapCanvas replaced with Workspace)
  - electron-menu (application menu with File/Edit/Window)
  - toolbar-z-index (raised to 200k to stay above MDI windows)
tech_stack:
  added: []
  patterns:
    - "MDI workspace: Workspace renders ChildWindow per document ID"
    - "react-rnd drag-by-title-bar: dragHandleClassName restricts drag to title bar"
    - "Per-document MapCanvas: documentId prop reads own document's map/viewport/selection"
    - "IPC menu integration: main sends menu-action/arrange-windows, renderer listens"
key_files:
  created:
    - src/components/Workspace/Workspace.tsx
    - src/components/Workspace/ChildWindow.tsx
    - src/components/Workspace/Workspace.css
  modified:
    - src/components/index.ts
    - src/App.tsx
    - src/App.css
    - electron/main.ts
    - electron/preload.ts
    - src/vite-env.d.ts
    - src/components/MapCanvas/MapCanvas.tsx
    - src/components/ToolBar/ToolBar.css
key_decisions:
  - decision: "dragHandleClassName='window-title-bar' restricts drag to title bar only"
    rationale: "Without this, clicking anywhere in window (including MapCanvas) would start a drag"
    alternatives: ["manual drag handle element", "onDragStart filter"]
  - decision: "Per-document MapCanvas with documentId prop"
    rationale: "Each child window reads its own document's state instead of only active document"
    alternatives: ["backward compat top-level fields only (stale inactive windows)"]
  - decision: "Toolbar dropdown z-index raised to 200k"
    rationale: "MDI windows use z-indexes 1000+ (normalizing at 100k), dropdowns must stay above"
    alternatives: ["lower window z-indexes", "portal-based dropdowns"]
duration: ~30 minutes
completed: 2026-02-09
---

# Phase 34 Plan 02: MDI Window UI Components Summary

MDI workspace with draggable/resizable child windows, Electron menu integration, and per-document rendering.

## Performance

- Zero TypeScript errors (strict mode maintained)
- App starts with empty workspace, creates child windows on File > New/Open
- Per-document MapCanvas rendering eliminates stale inactive window content

## Accomplishments

### Task 1: Create Workspace and ChildWindow Components

**Commit:** `c2df132`

- Created `Workspace.tsx` — MDI container that iterates document IDs and renders ChildWindow per document. Shows empty workspace message when no documents open.
- Created `ChildWindow.tsx` — Wraps MapCanvas in react-rnd with:
  - Drag restricted to title bar via `dragHandleClassName="window-title-bar"`
  - Resize via edges/corners with min 400x300
  - Z-index from windowState for stacking order
  - Title bar shows filename (or "Untitled") with ` *` for modified documents
  - Active/inactive CSS classes for accent vs grey title bar
  - Close button with stopPropagation to prevent focus change
- Created `Workspace.css` — Window chrome styling with OKLCH design tokens, active/inactive states, box shadows
- Added `Workspace` export to `components/index.ts`

### Task 2: Integrate Workspace into App and Add Electron Menu

**Commit:** `139dca8`

- Replaced single MapCanvas in App.tsx with `<Workspace>` component
- Wired `handleCloseDocument` to Workspace close buttons (previously unused)
- Added IPC listeners for `arrange-windows` and `menu-action` events
- Created Electron application menu with:
  - **File**: New (Ctrl+N), Open (Ctrl+O), Save (Ctrl+S), Exit
  - **Edit**: Undo (Ctrl+Z), Redo (Ctrl+Y), Cut, Copy, Paste, Delete, Select All
  - **Window**: Cascade, Tile Horizontal, Tile Vertical
- Updated `preload.ts` with `onArrangeWindows`, `onMenuAction` and cleanup listeners
- Updated `vite-env.d.ts` with new ElectronAPI types
- Removed empty-workspace styles from App.css (moved to Workspace.css)

### Bug Fix: White Screen and Per-Document Rendering

**Commit:** `84a9b63`

- Fixed infinite re-render loop in Workspace by using `useShallow` for document IDs selector
- Added `display: flex` to `.window-content` so MapCanvas frame expands properly
- Made MapCanvas document-aware with optional `documentId` prop — each child window reads its own document's map/viewport/selection state
- Added document activation on mousedown/wheel to ensure actions target correct document

### Bug Fix: Toolbar Dropdown Z-Index

**Commit:** `54eb347`

- Raised toolbar dropdown z-index from 1000 to 200000
- MDI windows use z-indexes 1000+ (normalizing at 100k threshold), so toolbar dropdowns were hidden behind them

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| src/components/Workspace/Workspace.tsx | 44 | MDI workspace container |
| src/components/Workspace/ChildWindow.tsx | 99 | Draggable/resizable window with react-rnd |
| src/components/Workspace/Workspace.css | 102 | Window chrome styling |

## Files Modified

| File | Changes | Reason |
|------|---------|--------|
| src/components/index.ts | +1 export | Workspace component |
| src/App.tsx | +56/-8 | Replace MapCanvas with Workspace, add IPC listeners |
| src/App.css | -13 | Remove empty-workspace styles |
| electron/main.ts | +91/-1 | Application menu with File/Edit/Window |
| electron/preload.ts | +20/-1 | IPC event listeners for arrange-windows and menu-action |
| src/vite-env.d.ts | +4 | ElectronAPI type additions |
| src/components/MapCanvas/MapCanvas.tsx | +47/-15 | Per-document rendering with documentId prop |
| src/components/ToolBar/ToolBar.css | +1/-1 | Raise dropdown z-index to 200k |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2] Infinite re-render loop in Workspace**
- **Found during:** Runtime testing
- **Issue:** `Array.from(state.documents.keys())` creates a new array every render, causing infinite re-renders
- **Fix:** Wrapped selector with `useShallow` for stable reference
- **Commit:** `84a9b63`

**2. [Rule 2] MapCanvas only rendering active document data**
- **Found during:** Runtime testing (white screen in child windows)
- **Issue:** MapCanvas read from top-level backward-compat fields, so all windows showed same content
- **Fix:** Added `documentId` prop to MapCanvas, reads per-document state when provided
- **Commit:** `84a9b63`

**3. [Rule 2] Toolbar dropdowns hidden behind MDI windows**
- **Found during:** Runtime testing
- **Issue:** Toolbar dropdown z-index (1000) was lower than MDI window z-indexes (1000+)
- **Fix:** Raised toolbar dropdown z-index to 200000
- **Commit:** `54eb347`

## Issues & Concerns

None.

## Self-Check

- [x] Workspace.tsx exists and renders ChildWindow per document
- [x] ChildWindow.tsx exists with react-rnd drag/resize
- [x] Workspace.css exists with window chrome styles
- [x] Electron menu has Window submenu with Cascade/Tile H/Tile V
- [x] MapCanvas accepts documentId prop for per-document rendering
- [x] Commits c2df132, 139dca8, 84a9b63, 54eb347 exist in git history

**Result: PASSED**
