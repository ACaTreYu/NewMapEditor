---
phase: 37-render-state-performance
plan: 03
subsystem: performance
tags: [react, zustand, performance, minimap, app-root]

# Dependency graph
requires:
  - phase: 37-render-state-performance
    provides: Conditional animation loop, granular state sync, split selectors
provides:
  - App.tsx without root map subscription (scoped re-renders)
  - Deferred minimap computation via requestIdleCallback
  - New map references in documentsSlice for selector detection
affects: [all-map-editing-components]

# Tech tracking
tech-stack:
  added: [requestIdleCallback]
  patterns:
    - "getState() for event handlers instead of reactive subscriptions"
    - "requestIdleCallback with timeout fallback for deferred computation"
    - "New map wrapper objects via spread for Zustand selector detection"

key-files:
  created: []
  modified:
    - src/App.tsx
    - src/components/Minimap/Minimap.tsx
    - src/core/editor/slices/documentsSlice.ts

key-decisions:
  - "Use getState() in event handlers (handleSaveMap, handleCursorMove) instead of reactive map subscription"
  - "requestIdleCallback with 2s timeout fallback for minimap color cache"
  - "Create new MapData wrapper objects via spread in all map-mutating documentsSlice functions"

patterns-established:
  - "Map-mutating functions must create new map reference ({ ...doc.map }) for selector detection"
  - "Event handlers use getState() for one-time reads, not reactive subscriptions"

# Metrics
duration: 8min
completed: 2026-02-09
---

# Phase 37 Plan 03: App.tsx Cleanup + Minimap Defer Summary

**Removed root map subscription from App.tsx, deferred minimap computation to idle callback, fixed map reference identity for selector detection**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-09T23:55:00Z
- **Completed:** 2026-02-10T00:03:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 3

## Accomplishments
- App.tsx no longer subscribes to map — tile placement doesn't re-render entire component tree
- Minimap tile color cache built via requestIdleCallback — no UI freeze during tileset load
- Fixed map-mutating functions to create new MapData wrapper references for selector detection
- Human verification confirmed all performance targets met

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove root-level map subscription from App.tsx** - `57a3f58` (perf)
2. **Task 2: Defer minimap tile color computation to idle callback** - `93ac7f6` (perf)
3. **Task 3: Fix map references in documentsSlice** - `3fec3b7` (fix)

## Files Created/Modified
- `src/App.tsx` - Removed map subscription, handleSaveMap/handleCursorMove use getState()
- `src/components/Minimap/Minimap.tsx` - requestIdleCallback for color cache, Loading placeholder
- `src/core/editor/slices/documentsSlice.ts` - New map wrapper objects via spread in 7 mutating functions

## Decisions Made
- **getState() for event handlers:** handleSaveMap and handleCursorMove are event-driven, not reactive — getState() is the correct pattern (avoids component-level subscription)
- **requestIdleCallback with timeout:** 2s timeout ensures minimap renders even if main thread stays busy
- **Map reference identity fix:** All 7 map-mutating functions in documentsSlice now create `{ ...doc.map }` instead of reusing `doc.map` reference, enabling useShallow selectors to detect changes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Map mutations not detected by selectors**
- **Found during:** Task 3 (human verification)
- **Issue:** setTileForDocument and similar functions mutated doc.map.tiles in place but reused same doc.map reference — useShallow selectors couldn't detect changes, breaking real-time tile drawing
- **Fix:** Create new MapData wrapper via spread (`{ ...doc.map }`) in all 7 map-mutating functions
- **Files modified:** src/core/editor/slices/documentsSlice.ts
- **Verification:** Tiles draw in real-time during drag, npm run typecheck passes
- **Committed in:** `3fec3b7`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Critical bug fix — without this, the granular state sync from plan 37-01 broke real-time tile rendering.

## Issues Encountered
None after bug fix — all performance verification tests passed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 37 complete — all 3 plans executed
- All performance targets verified by human testing
- Ready for phase verification

---
*Phase: 37-render-state-performance*
*Completed: 2026-02-09*
