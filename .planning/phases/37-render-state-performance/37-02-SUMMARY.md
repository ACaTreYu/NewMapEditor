---
phase: 37-render-state-performance
plan: 02
subsystem: ui
tags: [react, zustand, canvas, performance, selectors]

# Dependency graph
requires:
  - phase: 37-render-state-performance
    provides: research on selector patterns and layer independence
provides:
  - Granular Zustand selectors (1-3 fields) replacing 9-field mega-selector
  - Conditional canvas layer redraws (overlay only animates when needed)
  - Ref-based animation frame access to avoid false-positive dependencies
affects: [37-03, future-canvas-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Individual selectors for <4 fields, useShallow for 4+ related fields"
    - "Actions always use individual selectors (stable references)"
    - "Ref pattern for accessing animation state without triggering deps"
    - "Conditional animation effects based on active visual elements"

key-files:
  created: []
  modified:
    - src/components/MapCanvas/MapCanvas.tsx

key-decisions:
  - "Split 9-field mega-selector into 3 focused groups (tool, paste, selection)"
  - "Use animFrameRef to decouple overlay from unconditional animation ticks"
  - "Conditional animation only when selection/paste/conveyor active"

patterns-established:
  - "Selector granularity: tool state individual, paste/selection grouped by lifecycle"
  - "Layer independence: static/grid never redraw on animation tick, overlay conditional"

# Metrics
duration: 15min
completed: 2026-02-09
---

# Phase 37 Plan 02: Granular Selectors and Layer Independence Summary

**Split MapCanvas 9-field mega-selector into 3 focused groups and decoupled overlay layer from unconditional animation ticks using ref-based access**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-09T19:40:00Z
- **Completed:** 2026-02-09T19:55:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Reduced false-positive re-renders by splitting 9-field useShallow into 3 focused selectors
- Eliminated unconditional overlay redraws on every animation tick (60 FPS)
- Conditional animation only triggers when selection/paste/conveyor preview active
- Converted 15 action selectors from useShallow to individual (no re-render overhead)

## Task Commits

Each task was committed atomically:

1. **Task 1: Split MapCanvas mega-selector into focused subscriptions** - `4ff6727` (perf)
2. **Task 2: Decouple canvas layer redraws from unrelated state changes** - `46e98b6` (perf)

## Files Created/Modified
- `src/components/MapCanvas/MapCanvas.tsx` - Split selectors, added animFrameRef, conditional animation effect

## Decisions Made

**Selector split strategy:**
- Individual selectors for tool state (currentTool, selectedTile, tileSelection, gameObjectToolState) — change independently
- Grouped selector for paste state (isPasting, clipboard, pastePreviewPosition) — change together
- Grouped selector for selection + rect drag (selection, rectDragState) — change together
- Actions converted from useShallow to individual — stable references never trigger re-renders

**Animation decoupling:**
- animFrameRef stores animation frame without triggering useCallback deps
- drawOverlayLayer uses animFrameRef.current instead of animationFrame dependency
- Conditional effect checks if selection/paste/conveyor active before redrawing
- Reduces overlay redraws from 60 FPS unconditional to ~8 FPS marching ants only when needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript linter briefly reverted animFrameRef changes but re-application succeeded.

## Next Phase Readiness

- Granular selector pattern established for MapCanvas
- Layer independence validated (static/grid never redraw on animation tick)
- Ready for minimap optimization (plan 03) which will use same selector patterns
- Ready for root subscription removal (future plans) with established individual selector baseline

## Self-Check: PASSED

**File verification:**
- FOUND: 37-02-SUMMARY.md
- FOUND: src/components/MapCanvas/MapCanvas.tsx (modified)

**Commit verification:**
- FOUND: 4ff6727 (Task 1: split mega-selector)
- FOUND: 46e98b6 (Task 2: decouple layer redraws)

All claims verified.

---
*Phase: 37-render-state-performance*
*Completed: 2026-02-09*
