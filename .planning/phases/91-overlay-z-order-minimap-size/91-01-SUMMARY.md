---
phase: 91
plan: 01
subsystem: overlay-z-order-minimap-size
tags: [css, z-index, minimap, rendering, overlay]
requires: []
provides: [overlay-z-order-fix, minimap-160px]
affects: [Minimap, GameObjectToolPanel, App]
tech-stack:
  added: []
  patterns: [pixel-first rendering loop, z-index budget documentation]
key-files:
  created: []
  modified:
    - src/components/Minimap/Minimap.css
    - src/components/GameObjectToolPanel/GameObjectToolPanel.css
    - src/App.css
    - src/components/Minimap/Minimap.tsx
key-decisions:
  - id: D1
    decision: "Z-index value 200000 chosen for overlays"
    rationale: "Matches existing toolbar dropdown pattern (ToolBar.css), exceeds MDI normalization ceiling (Z_INDEX_NORMALIZE_THRESHOLD=100000)"
  - id: D2
    decision: "Pixel-first rendering loop (iterate minimap pixels, map back to tiles)"
    rationale: "Correct for any MINIMAP_SIZE, eliminates hardcoded x%2 subsampling guard that was coupled to 128px size"
duration: 2 minutes
completed: "2026-02-20"
---

# Phase 91 Plan 01: Overlay Z-Order and Minimap Size Summary

**One-liner:** Raised overlay z-indexes to 200000 to stay above MDI windows, enlarged minimap from 128x128 to 160x160 with a pixel-first rendering loop that fills every pixel correctly.

## Accomplishments

- Minimap and game object tool panel are now guaranteed visible above maximized MDI child windows (z-index 200000 > MDI normalization ceiling 100000)
- Minimap canvas renders at 160x160 pixels -- all 25,600 pixels filled, no empty margins
- Z-index budget documented in App.css for future maintainers
- TypeScript compiles cleanly with no errors

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Raise overlay z-indexes and document z-index budget | bcc2d1e | Minimap.css, GameObjectToolPanel.css, App.css |
| 2 | Enlarge minimap to 160x160 and fix rendering loop | f570248 | Minimap.tsx |

## Files Created

None.

## Files Modified

| File | Change |
|------|--------|
| `src/components/Minimap/Minimap.css` | `.minimap` z-index: 100 -> 200000 |
| `src/components/GameObjectToolPanel/GameObjectToolPanel.css` | `.game-object-tool-panel` z-index: 100 -> 200000 |
| `src/App.css` | Z-INDEX BUDGET comment block inserted after @import, before Base Styles |
| `src/components/Minimap/Minimap.tsx` | MINIMAP_SIZE 128->160, header comment updated, rendering loop rewritten to pixel-first approach |

## Decisions Made

**D1 — Z-index value 200000:** Matches the existing ToolBar.css dropdown pattern. Exceeds MDI window normalization ceiling (Z_INDEX_NORMALIZE_THRESHOLD=100000 in windowSlice.ts). Documented in budget comment.

**D2 — Pixel-first rendering loop:** Old loop iterated `MAP_WIDTH x MAP_HEIGHT` (256x256=65,536 tiles) with an `x%2 && y%2` guard to subsample down to 128x128. This was tightly coupled to the exact 128px size. New loop iterates `MINIMAP_SIZE x MINIMAP_SIZE` (160x160=25,600 pixels) and maps back to tile coordinates via `Math.floor(px/SCALE)`. Correct at any minimap size. Also more efficient (25,600 vs 65,536 iterations).

## Deviations from Plan

None -- plan executed exactly as written.

## Issues

None.

## Next Phase Readiness

Phase 91 plan 01 complete. Requirements OVRL-01 (overlay z-order) and OVRL-02 (160px minimap) satisfied.

## Self-Check: PASSED
