---
phase: 53-decouple-pencil-drag
plan: 01
subsystem: rendering
tags: [canvas, zustand, performance, imperative-rendering]

# Dependency graph
requires:
  - phase: 52-engine-zustand-subscriptions
    provides: CanvasEngine with Zustand subscriptions and imperative rendering methods
provides:
  - CanvasEngine drag lifecycle (beginDrag, paintTile, commitDrag, cancelDrag)
  - Pencil drag decoupled from React re-renders
  - Batch commit pattern for tile accumulation
  - Undo blocking during active drag
affects: [54-decouple-wall-pencil, 55-decouple-multi-tile-stamp, rendering-performance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Imperative drag accumulation with batch commit to Zustand on mouseup"
    - "Module-level singleton for cross-component state checks (isAnyDragActive)"
    - "Escape cancellation with full buffer rebuild from store state"

key-files:
  created: []
  modified:
    - src/core/canvas/CanvasEngine.ts
    - src/core/canvas/index.ts
    - src/components/MapCanvas/MapCanvas.tsx
    - src/components/ToolBar/ToolBar.tsx
    - src/App.tsx

key-decisions:
  - "Use Map<number, number> for pendingTiles (reused across drags, not recreated)"
  - "Update prevTiles snapshot during paintTile to prevent engine subscription from seeing changes"
  - "Module-level activeEngine singleton for isAnyDragActive() cross-component checks"

patterns-established:
  - "Drag lifecycle: beginDrag → paintTile (N times) → commitDrag → setTiles batch"
  - "Escape cancellation: cancelDrag + full drawMapLayer rebuild from store"
  - "Undo/redo blocking via isAnyDragActive() in keyboard and menu handlers"

# Metrics
duration: 5min
completed: 2026-02-13
---

# Phase 53 Plan 01: Pencil Drag Decoupling Summary

**Pencil drag accumulates tiles in engine Map, patches buffer imperatively on mousemove, commits batch to Zustand on mouseup — zero React re-renders during drag**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-13T06:48:15Z
- **Completed:** 2026-02-13T06:53:01Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Engine drag lifecycle methods (beginDrag/paintTile/commitDrag/cancelDrag) for tile accumulation
- Pencil drag completely decoupled from React state updates during mousemove
- Single batch commit to Zustand on mouseup (one React re-render per drag)
- Undo/redo blocked during active drag in both keyboard shortcuts and menu actions
- Escape cancellation with full buffer rebuild from store state

## Task Commits

Each task was committed atomically:

1. **Task 1: Add drag lifecycle methods to CanvasEngine** - `1dbfe4d` (feat)
2. **Task 2: Wire pencil drag to engine + undo blocking** - `34944b5` (feat)

## Files Created/Modified
- `src/core/canvas/CanvasEngine.ts` - Added beginDrag/paintTile/commitDrag/cancelDrag/getIsDragActive methods, pendingTiles Map accumulator, isAnyDragActive module export
- `src/core/canvas/index.ts` - Export isAnyDragActive for cross-component access
- `src/components/MapCanvas/MapCanvas.tsx` - Rewired pencil handlers to use engine drag lifecycle, added paintPencilTile helper, Escape cancellation, removed pendingTilesRef
- `src/components/ToolBar/ToolBar.tsx` - Added isAnyDragActive guard in keyboard undo/redo handler
- `src/App.tsx` - Added isAnyDragActive guard in menu undo/redo handler

## Decisions Made
- **Reuse pendingTiles Map across drags** - Clear instead of recreating for better GC performance
- **Update prevTiles during paintTile** - patchTileBuffer already handles this (lines 255-258), prevents engine subscription from seeing tiles as "changed" when Zustand commits later
- **Module-level singleton activeEngine** - Enables isAnyDragActive() cross-component checks without prop drilling or additional Zustand state
- **Escape rebuilds buffer from store** - cancelDrag only clears pending tiles; caller must trigger drawMapLayer to restore visual state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all patterns followed existing engine architecture from Phase 52.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Pencil drag pattern established, ready for wall pencil decoupling (Phase 54)
- Multi-tile stamp already works during pencil drag (paintPencilTile loops over selection)
- Pattern can be applied to other drag-based tools (wall pencil, fill)

## Self-Check

Verifying claimed files and commits exist:

- File exists: src/core/canvas/CanvasEngine.ts ✓
- File exists: src/core/canvas/index.ts ✓
- File exists: src/components/MapCanvas/MapCanvas.tsx ✓
- File exists: src/components/ToolBar/ToolBar.tsx ✓
- File exists: src/App.tsx ✓
- Commit exists: 1dbfe4d ✓
- Commit exists: 34944b5 ✓

**Self-Check: PASSED**

---
*Phase: 53-decouple-pencil-drag*
*Completed: 2026-02-13*
