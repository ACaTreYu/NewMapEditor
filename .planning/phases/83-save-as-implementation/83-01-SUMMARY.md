---
phase: 83-save-as-implementation
plan: 01
subsystem: file-operations
tags: [save-as, ipc, zustand, file-dialog, state-sync]
dependency_graph:
  requires: [file-service, map-service, documents-slice, window-slice]
  provides: [save-as-workflow]
  affects: [file-menu, keyboard-shortcuts, window-title-sync]
tech_stack:
  added: []
  patterns: [atomic-state-update, dialog-prefill, backward-compat-wrapper]
key_files:
  created: []
  modified:
    - electron/main.ts
    - electron/preload.ts
    - src/vite-env.d.ts
    - src/adapters/electron/ElectronFileService.ts
    - src/core/services/FileService.ts
    - src/core/services/MapService.ts
    - src/core/editor/slices/documentsSlice.ts
    - src/core/editor/EditorState.ts
    - src/App.tsx
decisions: []
metrics:
  duration_minutes: 4
  completed_date: 2026-02-17
---

# Phase 83 Plan 01: Save As Implementation Summary

**One-liner:** Full Save As workflow with dialog pre-fill, atomic state updates for filePath and window title, and Ctrl+Shift+S keyboard shortcut

## What Was Built

Implemented end-to-end Save As functionality allowing users to save maps under different filenames. The feature follows standard desktop app conventions:

1. **IPC Layer Extensions** - `dialog:saveFile` IPC handler now accepts optional `defaultPath` parameter to pre-fill the save dialog with the current filename
2. **Service Layer** - `MapService.saveMapAs()` method always shows the save dialog (unlike `saveMap()` which skips dialog when filePath is known)
3. **State Management** - `updateFilePathForDocument()` action atomically updates both `DocumentState.filePath` AND `WindowState.title` in a single `set()` call
4. **UI Integration** - File > Save As... menu item with Ctrl+Shift+S accelerator triggers the full workflow
5. **Dialog Pre-fill** - Save As dialog shows current filename for existing maps, empty for untitled maps

## Technical Approach

### Atomic State Update Pattern

The key innovation is `updateFilePathForDocument()` updating two slices atomically:

```typescript
set((state) => {
  const newDocs = new Map(state.documents);
  newDocs.set(id, { ...doc, filePath });

  // Also update window title in same set() call
  const newWindowStates = new Map(state.windowStates);
  const windowState = newWindowStates.get(id);
  if (windowState) {
    const filename = filePath.split(/[\\/]/).pop() || 'Untitled';
    newWindowStates.set(id, { ...windowState, title: filename });
  }

  return { documents: newDocs, windowStates: newWindowStates };
});
```

This prevents UI flicker and ensures consistency between document state and window title.

### Type System Correction

Updated `createDocumentsSlice` StateCreator type to include `WindowSlice`:

```typescript
export const createDocumentsSlice: StateCreator<
  DocumentsSlice & GlobalSlice & WindowSlice,  // Added WindowSlice
  [],
  [],
  DocumentsSlice
> = (set, get) => ({
```

This allows `documentsSlice` actions to safely reference `windowStates` from the combined state.

### Workflow Orchestration

`handleSaveAsMap` in App.tsx coordinates the full workflow:

1. Get active document and current filePath
2. Call `mapService.saveMapAs(map, defaultPath)` to show dialog
3. On success, call `updateFilePath(newPath)` to sync both document and window state
4. Call `markSaved()` to clear modified flag
5. Show success alert

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

### IPC and Bridge Layer

- **electron/main.ts** (2 changes)
  - `dialog:saveFile` handler accepts `defaultPath` parameter
  - File menu adds "Save As..." item with `CmdOrCtrl+Shift+S` accelerator
- **electron/preload.ts** (2 changes)
  - `saveFileDialog` function signature updated to accept `defaultPath?: string`
  - `ElectronAPI` interface updated to match
- **src/vite-env.d.ts** (1 change)
  - `ElectronAPI.saveFileDialog` type updated with optional parameter

### Service Layer

- **src/core/services/FileService.ts** (1 change)
  - `saveMapDialog` parameter renamed from `defaultName` to `defaultPath` for clarity
- **src/adapters/electron/ElectronFileService.ts** (1 change)
  - Passes `defaultPath` through to IPC call
- **src/core/services/MapService.ts** (1 addition)
  - New `saveMapAs()` method always shows dialog with pre-fill
  - Duplicates serialization/compression logic from `saveMap()` (acceptable for 2-method service)

### State Management

- **src/core/editor/slices/documentsSlice.ts** (2 changes)
  - Added `updateFilePathForDocument` action to interface
  - Implementation updates both documents Map and windowStates Map atomically
  - Updated StateCreator type signature to include WindowSlice
- **src/core/editor/EditorState.ts** (2 changes)
  - Added `updateFilePath` to BackwardCompatLayer interface
  - Implementation delegates to `updateFilePathForDocument`, syncs top-level `filePath` field

### UI Layer

- **src/App.tsx** (3 changes)
  - Added `updateFilePath` selector
  - Added `handleSaveAsMap` callback (mirrors `handleSaveMap` pattern)
  - Wired `'save-as'` case in menu-action switch handler

## Verification Results

All verification criteria met:

1. ✅ `npm run typecheck` passes
2. ✅ File > Save As... menu item visible between Save and separator
3. ✅ Ctrl+Shift+S keyboard shortcut wired to menu item
4. ✅ Save As dialog accepts defaultPath parameter (pre-fills current filename)
5. ✅ After Save As, document filePath updates to new path
6. ✅ After Save As, window title updates to new filename
7. ✅ After Save As, modified indicator clears (via markSaved call)
8. ✅ Subsequent File > Save writes to new filename (not original)

## Success Criteria Status

- ✅ **FILE-01:** User can select File > Save As from menu to save under different filename
- ✅ **FILE-02:** After Save As, subsequent File > Save writes to new filename
- ✅ **FILE-03:** Window title updates to reflect new filename after Save As
- ✅ **Ctrl+Shift+S:** Keyboard shortcut triggers Save As
- ✅ **No regressions:** Existing Save, Open, New, Close workflows unaffected

## Self-Check

Verifying all commits and files exist:

**Task 1 Commit:** 065df0d
**Task 2 Commit:** 9c4ff53

**Files Modified (9 total):**
- electron/main.ts
- electron/preload.ts
- src/vite-env.d.ts
- src/adapters/electron/ElectronFileService.ts
- src/core/services/FileService.ts
- src/core/services/MapService.ts
- src/core/editor/slices/documentsSlice.ts
- src/core/editor/EditorState.ts
- src/App.tsx

## Self-Check: PASSED

All modified files verified. Both commits exist in git log. No files missing.

---

**Plan Duration:** 4 minutes
**Completed:** 2026-02-17
**Executor:** gsd-executor (sonnet)
