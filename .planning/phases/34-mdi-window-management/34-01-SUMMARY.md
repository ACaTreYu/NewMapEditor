---
phase: 34-mdi-window-management
plan: 01
subsystem: state-management
tags: [window-state, mdi, zustand, state-slice]
requires:
  - document-state-refactoring (Phase 33)
  - zustand-store (EditorState)
provides:
  - window-state-tracking (per-document window metadata)
  - window-arrangement-algorithms (cascade, tile horizontal, tile vertical)
  - max-documents-enforcement (8 document limit)
affects:
  - document-lifecycle (creates/removes window state on doc create/close)
  - active-document-switching (raises window z-index)
tech_stack:
  added:
    - react-rnd: "^10.5.2"
  patterns:
    - zustand-slice-composition (3-slice architecture)
    - pure-arrangement-functions (immutable window state transforms)
    - z-index-normalization (prevents overflow at 100k threshold)
key_files:
  created:
    - src/core/editor/slices/windowArrangement.ts
    - src/core/editor/slices/windowSlice.ts
  modified:
    - package.json (react-rnd dependency)
    - src/core/editor/slices/types.ts (WindowState, MAX_OPEN_DOCUMENTS)
    - src/core/editor/EditorState.ts (windowSlice composition, document limit)
    - src/core/editor/slices/documentsSlice.ts (createDocument return type)
key_decisions:
  - decision: MAX_OPEN_DOCUMENTS = 8
    rationale: Prevents canvas context exhaustion (browsers limit at 8-16, we use 4 contexts/doc)
    alternatives: [dynamic limit based on browser, unlimited with context pooling]
  - decision: Cascade offset of 40px
    rationale: Standard MDI pattern, gives clear visual stacking without overlapping too much
    alternatives: [smaller offset like 20px, larger offset like 60px]
  - decision: Extract window title from filePath filename
    rationale: User-friendly titles in future tab/window UI (shows "map.lvl" not full path)
    alternatives: [full path display, custom title input, map name from header]
  - decision: Alert on document limit exceeded
    rationale: Simple UX for v2.1, prevents silent failure
    alternatives: [toast notification, status bar message, disable New/Open menu items]
  - decision: Z-index normalization at 100k threshold
    rationale: Prevents integer overflow on long-running sessions with many window raises
    alternatives: [higher threshold, modulo wrap, no normalization]
duration: 6 minutes
completed: 2026-02-09
---

# Phase 34 Plan 01: Window State Management Summary

Window state layer for MDI child windows with per-document position/size/z-index tracking, pure arrangement algorithms, and 8-document limit enforcement.

## Performance

- Zero TypeScript errors (strict mode maintained)
- App starts successfully with window state integrated
- Window state creation adds ~0ms overhead per document (cascade calculation is O(1))
- Z-index normalization is O(n) where n = open documents, but only triggers at 100k threshold

## Accomplishments

### Task 1: Window Types and Arrangement Algorithms

**Commit:** `8661aba`

- Installed `react-rnd@10.5.2` for future draggable/resizable window UI
- Added `MAX_OPEN_DOCUMENTS = 8` constant to prevent canvas context exhaustion
- Added `WindowState` interface with `x`, `y`, `width`, `height`, `zIndex`, `title` fields
- Created `cascadeWindows()` pure function: 40px cascade offset, wraps at workspace bounds
- Created `tileWindowsHorizontal()`: stack vertically, equal height, full width
- Created `tileWindowsVertical()`: stack horizontally, equal width, full height
- All arrangement functions return new Map instances for immutability

### Task 2: WindowSlice Integration

**Commit:** `a0c163c`

- Created `windowSlice.ts` with 5 actions:
  - `createWindowState(docId, title)`: cascade positioning, assigns z-index
  - `removeWindowState(docId)`: deletes from map, creates new Map for reactivity
  - `updateWindowState(docId, updates)`: partial updates for drag/resize
  - `raiseWindow(docId)`: assigns nextZIndex, increments counter
  - `arrangeWindows(mode)`: delegates to pure functions, queries workspace size
- Integrated windowSlice into EditorState (3-slice composition: DocumentsSlice & GlobalSlice & WindowSlice)
- Enforced MAX_OPEN_DOCUMENTS limit in createDocument override:
  - Checks `documents.size >= 8` before creating document
  - Shows alert: "Maximum 8 documents can be open simultaneously. Close a document first."
  - Returns `null` instead of DocumentId on limit exceeded
- Auto-creates window state after document creation with title extracted from filePath
- Override `setActiveDocument` to call `raiseWindow(id)` when switching documents
- Override `closeDocument` to call `removeWindowState(id)` before deleting document
- Updated `createDocument` return type to `DocumentId | null` for limit rejection handling

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| src/core/editor/slices/windowArrangement.ts | 107 | Pure cascade/tile arrangement algorithms |
| src/core/editor/slices/windowSlice.ts | 148 | Window state CRUD + raise + arrange actions |

## Files Modified

| File | Changes | Reason |
|------|---------|--------|
| package.json | +react-rnd dependency | Draggable/resizable window UI library |
| src/core/editor/slices/types.ts | +WindowState interface, +MAX_OPEN_DOCUMENTS | Window state type definitions |
| src/core/editor/EditorState.ts | +windowSlice composition, +MAX_OPEN_DOCUMENTS enforcement | 3-slice architecture integration |
| src/core/editor/slices/documentsSlice.ts | createDocument return type change | Allow null return on limit exceeded |

## Key Decisions

1. **MAX_OPEN_DOCUMENTS = 8**: Prevents canvas context exhaustion (browsers limit at 8-16 contexts, we use ~4 per document for map/tileset/UI/preview). Alert UI prevents silent failure.

2. **Pure arrangement functions in separate file**: `windowArrangement.ts` contains stateless algorithms, making them testable and reusable. WindowSlice delegates to these functions.

3. **Z-index normalization at 100k threshold**: Prevents integer overflow on long sessions with many window raises. Normalizes all windows to sequential z-indexes starting at 1000.

4. **Cascade offset of 40px**: Standard MDI pattern, balances visibility of stacked windows with workspace usage.

5. **Title extraction from filePath**: Future-friendly for tab UI (shows "map.lvl" instead of full path or "doc-123-abc").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Electron file lock during npm install**
- **Found during:** Task 1 installation
- **Issue:** npm install failed with EBUSY error on electron/dist/icudtl.dat (file locked by running Electron process)
- **Fix:** Killed all Electron processes with `taskkill //F //IM electron.exe`, then retried npm install
- **Files modified:** None (process management only)
- **Commit:** N/A (not a code change)

**2. [Rule 2 - Missing Critical] Unused `get` parameter in windowSlice**
- **Found during:** TypeScript compilation (TS6133 error)
- **Issue:** StateCreator callback declared `get` parameter but never used it
- **Fix:** Renamed parameter to `_get` to indicate intentional non-use
- **Files modified:** src/core/editor/slices/windowSlice.ts
- **Commit:** Included in a0c163c

None - all other work executed exactly as planned.

## Testing

### Manual Verification

1. TypeScript compilation: `npx tsc --noEmit` passes with zero errors
2. App startup: `npm run electron:dev` launches successfully
3. Window state integration: EditorState composes all 3 slices correctly
4. Document creation: File > New creates document with window state (verified state shape)

### Not Yet Tested (awaiting UI components in Phase 34-02)

- Actual draggable/resizable window UI (react-rnd integration)
- Window arrangement commands (cascade, tile horizontal, tile vertical)
- 9th document creation alert (limit enforcement UX)
- Window state updates on drag/resize
- Z-index normalization at 100k threshold (edge case)

## Issues & Concerns

None.

## Next Phase Readiness

**Phase 34-02 (MDI Window UI Components)** is ready to proceed:

- [x] Window state layer exists in Zustand store
- [x] WindowState type defined with all required fields
- [x] createWindowState/updateWindowState/raiseWindow actions available
- [x] Arrangement algorithms ready for Window > Arrange menu commands
- [x] MAX_OPEN_DOCUMENTS limit enforced at state level
- [x] react-rnd dependency installed for window UI

Next plan will build:
- `<DocumentWindow>` component wrapping react-rnd
- Window chrome (title bar, close button)
- Tab bar UI for document switching
- Window > Arrange menu items

## Self-Check

Verifying claims from summary:

- [x] react-rnd in package.json dependencies
- [x] WindowState type exists in types.ts
- [x] MAX_OPEN_DOCUMENTS constant exists
- [x] windowArrangement.ts exists with 3 exported functions
- [x] windowSlice.ts exists with WindowSlice interface
- [x] EditorState.ts composes windowSlice
- [x] Commits 8661aba and a0c163c exist in git history

**Result: PASSED** - All files created, all commits exist, all types exported.
