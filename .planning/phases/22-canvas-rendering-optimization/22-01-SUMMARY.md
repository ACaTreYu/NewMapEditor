---
phase: 22-canvas-rendering-optimization
plan: 01
subsystem: ui
tags: [canvas, performance, rendering, layers, grid]

requires:
  - phase: 21-zustand-store-optimization
    provides: Granular selectors preventing double-triggering during refactor
provides:
  - 4-layer stacked canvas architecture (static, animated, overlays, grid)
  - Pixel-perfect tile rendering with Math.floor coordinates
  - Batched grid drawing (single stroke call)
  - RAF-debounced canvas resize
  - Grid defaults to OFF
affects: [23-minimap-performance, 24-batch-state-operations]

tech-stack:
  added: []
  patterns: [layered-canvas, raf-debounce, batched-path-drawing]

key-files:
  modified:
    - src/components/MapCanvas/MapCanvas.tsx
    - src/components/MapCanvas/MapCanvas.css
    - src/core/editor/EditorState.ts

key-decisions:
  - "4 stacked canvases with CSS absolute positioning and pointer-events:none"
  - "Static layer draws frame 0 of animated tiles as background"
  - "Grid layer is topmost and receives all mouse events"
  - "Batched grid drawing with single beginPath/stroke"
  - "RAF-debounced resize via ResizeObserver"
  - "showGrid defaults to false"

duration: 6min
completed: 2026-02-05
---

# Phase 22 Plan 01: Canvas Rendering Optimization Summary

**4-layer stacked canvas architecture with pixel-perfect rendering, batched grid, RAF-debounced resize, and independent layer render triggers**

## Performance

- **Duration:** ~6 min
- **Tasks:** 2/2 auto tasks completed (checkpoint skipped — issues found)
- **Files modified:** 3

## Accomplishments
- Refactored monolithic single-canvas MapCanvas into 4 independent layers
- Fixed phantom grid lines bug with Math.floor() coordinates and imageSmoothingEnabled=false
- Implemented batched grid drawing (1 beginPath + all lines + 1 stroke vs 60+ individual calls)
- RAF-debounced canvas resize prevents flicker during window resize
- Split Zustand subscriptions by layer for granular re-renders
- Grid defaults to OFF, visible at all zoom levels when toggled on

## Task Commits

1. **Task 1: Multi-canvas layer architecture with pixel-perfect rendering** - `06f7008` (perf)
2. **Task 2: Layer-specific render triggers and RAF-debounced resize** - `96f837a` (perf)

## Files Created/Modified
- `src/components/MapCanvas/MapCanvas.tsx` - 4-layer canvas architecture with independent render triggers
- `src/components/MapCanvas/MapCanvas.css` - Added .map-canvas-layer and .no-events classes
- `src/core/editor/EditorState.ts` - Changed showGrid default to false

## Decisions Made
- 4 stacked canvases (static, animated, overlays, grid) with CSS absolute positioning
- Static layer draws frame 0 of animated tiles to prevent flicker
- Grid layer topmost — receives all mouse events, other layers have pointer-events:none
- Overlay layer includes animationFrame dep for marching ants animation

## Deviations from Plan
None - plan executed as written for tasks 1-2.

## Issues Encountered

1. **Minimap crash**: App crashes when dragging to navigate on minimap. Likely the rapid viewport updates from minimap dragging interact poorly with the 4-layer redraw cycle. Deferred to future phase.

2. **Animation speed**: Animations appeared to run faster than expected. May be related to both static layer (frame 0) and animation layer painting simultaneously, or the animation layer redraw triggering more frequently. Needs investigation. Deferred to future phase.

## Next Phase Readiness
- Core 4-layer architecture is in place and functional for basic use
- Minimap crash and animation speed issues need resolution before this phase can be considered fully complete
- These issues should be addressed in a gap closure phase or next performance phase

---
*Phase: 22-canvas-rendering-optimization*
*Completed: 2026-02-05*
