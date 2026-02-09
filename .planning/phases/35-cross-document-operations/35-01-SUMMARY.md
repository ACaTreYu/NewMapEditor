---
phase: 35-cross-document-operations
plan: 01
subsystem: editor-state
tags: [zustand, clipboard, global-state, cross-document]

# Dependency graph
requires:
  - phase: 33-document-state-refactoring
    provides: Sliced Zustand architecture with GlobalSlice and DocumentsSlice separation
provides:
  - Global clipboard state accessible across all open documents
  - Clipboard transformation actions (mirror horizontal/vertical, rotate) in GlobalSlice
  - Cross-document copy/paste operations
affects: [35-cross-document-operations, multi-window-workflows]

# Tech tracking
tech-stack:
  added: []
  patterns: [global-state-for-cross-document-features, per-document-paste-preview]

key-files:
  created: []
  modified:
    - src/core/editor/slices/globalSlice.ts
    - src/core/editor/slices/types.ts
    - src/core/editor/slices/documentsSlice.ts
    - src/core/editor/EditorState.ts
    - src/components/MapCanvas/MapCanvas.tsx

key-decisions:
  - "Clipboard state moved to GlobalSlice to enable cross-document copy/paste"
  - "isPasting and pastePreviewPosition remain per-document for independent paste previews"
  - "Clipboard transformations (mirror/rotate) operate on global state, not per-document"

patterns-established:
  - "Global state pattern: shared features (clipboard, selected tile, tool) in GlobalSlice"
  - "Per-document state pattern: view-specific features (paste preview, selection) in DocumentState"
  - "Cross-document clipboard preserves full 16-bit tile encoding including animation flags"

# Metrics
duration: 14min
completed: 2026-02-09
---

# Phase 35 Plan 01: Global Clipboard Summary

**Global clipboard enables cross-document copy/paste with full 16-bit tile encoding preservation, mirror/rotate transformations, and per-document paste preview isolation**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-09T20:59:48Z
- **Completed:** 2026-02-09T21:13:55Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Moved clipboard state from per-document to GlobalSlice, enabling cross-document operations
- User can copy tiles from map A and paste into map B without clipboard isolation
- Clipboard transformations (mirror horizontal/vertical, rotate) operate on shared global state
- Paste preview state (isPasting, pastePreviewPosition) remains per-document to prevent leak across windows
- Full 16-bit tile encoding preserved across documents (animation flags, game objects)

## Task Commits

Each task was committed atomically:

1. **Task 1: Move clipboard state from DocumentState to GlobalSlice** - `f40e1e7` (feat)
   - Removed clipboard field from DocumentState interface and factory functions
   - Added clipboard state and transformation actions to GlobalSlice
   - Updated copySelectionForDocument to write to global clipboard
   - Updated paste operations to read from global clipboard
   - Removed per-document mirror/rotate implementations from DocumentsSlice

2. **Task 2: Update EditorState wrappers and MapCanvas selector** - `f40e1e7` (feat)
   - Updated syncTopLevelFields to not sync clipboard from document (now global)
   - Updated backward-compat wrappers to call global clipboard actions
   - Updated MapCanvas to read clipboard from state.clipboard (global) instead of doc.clipboard

**Note:** Both tasks were committed together in a single atomic commit `f40e1e7`.

## Files Created/Modified
- `src/core/editor/slices/globalSlice.ts` - Added clipboard state, setClipboard, mirrorClipboardHorizontal, mirrorClipboardVertical, rotateClipboard actions
- `src/core/editor/slices/types.ts` - Removed clipboard field from DocumentState interface and factory functions
- `src/core/editor/slices/documentsSlice.ts` - Updated copy/paste actions to read/write global clipboard, removed per-document mirror/rotate implementations
- `src/core/editor/EditorState.ts` - Updated backward-compat wrappers to delegate to global clipboard actions, removed clipboard from syncTopLevelFields
- `src/components/MapCanvas/MapCanvas.tsx` - Updated clipboard selector to always read from state.clipboard (global)

## Decisions Made

**Clipboard scope:** Moved to GlobalSlice to enable cross-document operations. This mirrors the existing pattern where selectedTile is global (enabling cross-document picker tool).

**Paste preview isolation:** Kept isPasting and pastePreviewPosition per-document to prevent paste preview from appearing on all open windows simultaneously.

**16-bit preservation:** All clipboard operations use raw Uint16Array values without masking, preserving animation flags (bit 15) and frame offsets.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - GlobalSlice architecture (established in Phase 33) made this refactoring straightforward.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02 (Cross-Document Picker):**
- Picker tool already works cross-document because selectedTile is in GlobalSlice
- Plan 02 will verify with typecheck and create documentation

**Ready for future multi-window workflows:**
- Global clipboard pattern established
- Pattern documented for future cross-document features

**No blockers.**

## Self-Check

**Files:** PASSED - All 5 modified files exist and contain expected changes.

**Commits:** PASSED - Commit f40e1e7 exists and contains both tasks.

**TypeScript:** PASSED - `npx tsc --noEmit` passes with zero errors.

---
*Phase: 35-cross-document-operations*
*Completed: 2026-02-09*
