---
phase: 49-canvas-optimization
plan: 01
subsystem: rendering
tags: [canvas, imageBitmap, gpu-optimization, pattern-rendering, performance]

# Dependency graph
requires:
  - phase: 48-real-time-pan-rendering
    provides: RAF progressive rendering infrastructure for pan drag
provides:
  - 2-layer canvas architecture (map + UI overlay) replacing 4-layer stack
  - ImageBitmap tile atlas for GPU-ready rendering with O(1) tile lookup
  - Pattern-based grid rendering (O(1) fill vs O(N) line strokes)
  - Map layer with alpha:false for compositor optimization
affects: [50-buffer-zone-rendering, future-rendering-optimizations]

# Tech tracking
tech-stack:
  added: [createImageBitmap API, CanvasPattern API, alpha:false context option]
  patterns:
    - "ImageBitmap atlas: pre-slice tileset into bitmap array indexed by tile ID"
    - "Pattern-based grid: createPattern() + fillRect instead of individual line strokes"
    - "Module-level pattern cache: invalidate only on zoom change"
    - "Opaque layer optimization: alpha:false on map layer for compositor fast path"

key-files:
  created: []
  modified:
    - src/components/MapCanvas/MapCanvas.tsx

key-decisions:
  - "2-layer architecture: map (all tiles) + UI (grid + overlays) instead of 4 separate layers"
  - "ImageBitmap atlas: index by tile ID for direct lookup without row/col conversion"
  - "Map layer uses alpha:false context option (opaque blending fast path)"
  - "Grid pattern cached at module scope, invalidated only on zoom change"
  - "Progressive render during pan updates map layer only (UI lags 1 frame for performance)"

patterns-established:
  - "Pattern 1: GPU-ready tile rendering via ImageBitmap pre-slicing (no runtime source rect calculations)"
  - "Pattern 2: Cached pattern rendering for repeating grid elements (O(1) vs O(visible_tiles))"
  - "Pattern 3: Module-level render caches for zoom-invariant patterns (persist across component renders)"

# Metrics
duration: 6min
completed: 2026-02-12
---

# Phase 49 Plan 01: Canvas Optimization Summary

**2-layer canvas with ImageBitmap atlas and pattern grid replaces 4-layer architecture, enabling opaque blending and O(1) grid rendering**

## Performance

- **Duration:** 6 minutes
- **Started:** 2026-02-12T18:24:23Z
- **Completed:** 2026-02-12T18:30:37Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Consolidated 4 canvas layers (static/anim/overlay/grid) to 2 (map/UI), reducing compositor overhead
- Pre-sliced tileset into ImageBitmap array for GPU-ready rendering with O(1) tile lookup
- Enabled alpha:false on map layer for opaque blending fast path (compositor optimization)
- Replaced O(N) grid line strokes with O(1) pattern fill cached at module scope

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ImageBitmap atlas utility + state** - `34f9ca9` (feat)
2. **Task 2: Consolidate layers (4->2) + alpha:false + drawMapLayer + drawUILayer** - `8a7b48d` (feat)
3. **Task 3: Pattern-based grid rendering** - `ae5e650` (perf)

## Files Created/Modified

- `src/components/MapCanvas/MapCanvas.tsx` - 2-layer canvas rendering with ImageBitmap atlas and pattern grid

## Decisions Made

**1. 2-layer architecture instead of 4**
- Rationale: Static + anim tiles can render in single pass with atlas. Grid + overlays both transparent, can share layer.
- Impact: Reduces compositor overhead from 4 stacked canvases to 2.

**2. ImageBitmap atlas indexed by tile ID**
- Rationale: Direct lookup `bitmaps[tileId]` avoids runtime row/col conversion (no `tileId % tilesPerRow` math per tile).
- Impact: GPU-ready bitmaps eliminate per-draw tile decode.

**3. alpha:false on map layer**
- Rationale: Map layer has no transparency (tiles always opaque), so enable compositor fast path.
- Impact: Browser can skip alpha blending when compositing layers.

**4. Module-level grid pattern cache**
- Rationale: Pattern only changes on zoom (not pan/viewport), so cache at module scope instead of component state.
- Impact: Pattern survives component re-renders, invalidated only when needed.

**5. Progressive render updates map layer only**
- Rationale: During pan drag, UI elements (grid, cursor, selection) can lag 1 frame without visual artifacts.
- Impact: Halves progressive render work (1 layer redraw instead of 2).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 49 complete: 2-layer canvas architecture with ImageBitmap atlas and pattern grid operational
- Phase 50 (buffer zone rendering) ready to plan: tile atlas infrastructure in place for buffer zone pre-rendering
- Verified: All tools work (pencil, fill, wall, line, select, paste, conveyor, game objects)
- Verified: Pan drag works with CSS transform + progressive render + scrollbar sync
- Verified: Zoom to cursor works at all zoom levels (0.25x to 4x)
- Verified: Animated tiles animate correctly on map layer
- Verified: Grid renders with pattern fill, aligns with tile boundaries at all zoom levels

## Self-Check: PASSED

**Files:**
- ✓ src/components/MapCanvas/MapCanvas.tsx exists

**Commits:**
- ✓ 34f9ca9 exists (Task 1: ImageBitmap atlas infrastructure)
- ✓ 8a7b48d exists (Task 2: 4-layer to 2-layer consolidation)
- ✓ ae5e650 exists (Task 3: Pattern-based grid rendering)

All claims verified.

---
*Phase: 49-canvas-optimization*
*Completed: 2026-02-12*
