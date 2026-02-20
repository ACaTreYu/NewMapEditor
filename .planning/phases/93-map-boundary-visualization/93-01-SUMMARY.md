---
phase: 93
plan: 01
subsystem: canvas-rendering
tags: [canvas, boundary, theme, visualization, ux]
requires: []
provides: [map-boundary-visualization]
affects: [CanvasEngine, MapCanvas, variables.css]
tech-stack:
  added: []
  patterns: [MutationObserver-theme-refresh, CSS-token-theming, fillRect-strip-clipping]
key-files:
  created: []
  modified:
    - src/styles/variables.css
    - src/core/canvas/CanvasEngine.ts
    - src/components/MapCanvas/MapCanvas.tsx
key-decisions:
  - id: D93-01-1
    decision: Four-strip fillRect approach for out-of-map fill
    rationale: Non-overlapping strips (left/right full-height, top/bottom map-width-clamped) correctly handle all viewport positions including corners
  - id: D93-01-2
    decision: MutationObserver on data-theme triggers all three layer redraws
    rationale: Map layer needs new out-of-map fill color, grid layer may have theme-relative color, UI layer needs new border color
  - id: D93-01-3
    decision: Border drawn before other overlays in drawUiLayer
    rationale: Border sits behind cursors, selection boxes, and tool previews for correct visual layering
duration: 98s
completed: 2026-02-20
---

# Phase 93 Plan 01: Map Boundary Visualization Summary

**One-liner:** Theme-aware out-of-map fill (four-strip fillRect) and 1px border line at the 256x256 map boundary, with MutationObserver-driven redraw on theme switch.

## Performance Metrics

- Duration: 98 seconds
- Tasks completed: 2/2
- Type errors: 0
- Deviations: 0

## Accomplishments

- Added `--canvas-out-of-map-bg` and `--canvas-map-border` CSS tokens to all three theme blocks (Light, Dark, Terminal) in variables.css
- Out-of-map fill rendered in `CanvasEngine.blitToScreen()` using four non-overlapping fillRect strips after drawImage
- 1px map boundary border line rendered in `MapCanvas.drawUiLayer` at exact (0,0)-(256,256) boundary before all other overlays
- MutationObserver on `document.documentElement` detects `data-theme` changes and triggers full three-layer redraw so boundary colors update immediately on theme switch
- All changes are zoom-invariant: coordinate math uses `TILE_SIZE * viewport.zoom` so boundary aligns correctly at 0.25x to 4x zoom

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CSS tokens + out-of-map fill in CanvasEngine | d155648 | src/styles/variables.css, src/core/canvas/CanvasEngine.ts |
| 2 | Border line + MutationObserver in MapCanvas | 15b9549 | src/components/MapCanvas/MapCanvas.tsx |

## Files Created

None.

## Files Modified

| File | Change |
|------|--------|
| src/styles/variables.css | Added `--canvas-out-of-map-bg` and `--canvas-map-border` to :root (light), [data-theme="dark"], and [data-theme="terminal"] blocks |
| src/core/canvas/CanvasEngine.ts | Added four-strip out-of-map fillRect after drawImage in blitToScreen() |
| src/components/MapCanvas/MapCanvas.tsx | Added border strokeRect at top of drawUiLayer; added MutationObserver useEffect for theme-change redraw |

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D93-01-1 | Four-strip fillRect approach | Non-overlapping: left/right are full canvas height, top/bottom are clamped to horizontal map extent. Handles all scroll/zoom positions correctly. |
| D93-01-2 | MutationObserver triggers all three layers | Map layer (out-of-map fill color), grid layer (theme-relative grid color), UI layer (border color). Complete theme refresh. |
| D93-01-3 | Border drawn first in drawUiLayer | Ensures border is behind cursor, selection, paste preview, and all tool overlays. |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Phase 93 plan 01 complete: map boundary visualization is live
- Next: remaining phases in v1.1.3 milestone (move selection, etc.)
- Blocker check: minimap overlap concern documented in STATE.md remains to verify at 800x600

## Self-Check: PASSED

- src/styles/variables.css: FOUND
- src/core/canvas/CanvasEngine.ts: FOUND
- src/components/MapCanvas/MapCanvas.tsx: FOUND
- git log grep "93-01": FOUND (d155648, 15b9549)
