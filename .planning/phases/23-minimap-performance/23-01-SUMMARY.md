---
phase: 23-minimap-performance
plan: 01
subsystem: ui
tags: [canvas, performance, minimap, color-cache, debounce]

# Dependency graph
requires:
  - phase: 08-minimap
    provides: Basic minimap with center-pixel sampling and click-to-navigate
  - phase: 22-canvas-rendering-optimization
    provides: Pattern of pre-computed caches and RAF-debounced rendering
provides:
  - Pre-computed average-color lookup tables for all static and animated tiles
  - Special tile color overrides for gameplay-significant tiles (walls, flags, warps, switches, powerups)
  - Debounced minimap redraws for efficient batch updates during rapid tile painting
affects: [24-batch-state-operations, rendering-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-computed color caches built once at tileset load using 16x16 pixel averaging"
    - "Debounced state updates (150ms) for map changes, immediate updates for viewport changes"
    - "Special tile color overrides via Map lookup for static tiles and array overrides for animated tiles"

key-files:
  created: []
  modified:
    - src/components/Minimap/Minimap.tsx

key-decisions:
  - "Average all 256 pixels per tile (not center pixel) for accurate color representation"
  - "Separate caches for static tiles (Uint8Array), special overrides (Map), and animated tiles (Uint8Array)"
  - "Debounce map tile changes at 150ms, immediate viewport updates for responsive feel"
  - "Hardcoded gameplay-significant tile colors: walls (steel blue-gray), flags (team colors), warps (bright green), switches (gold), powerups (bright gold)"

patterns-established:
  - "Three-tier color lookup: animated tile cache → special override map → average color cache → fallback"
  - "Zero temporary canvas creation during draw loop (only one-time init creates temp canvas)"
  - "Split useEffect hooks: debounced for map changes, immediate for viewport, initial for cache-ready"

# Metrics
duration: 18min
completed: 2026-02-08
---

# Phase 23 Plan 01: Minimap Performance Summary

**Average-color tile caching with debounced redraws eliminates per-draw computation overhead and improves visual accuracy with 256-pixel sampling**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-08T10:12:38Z
- **Completed:** 2026-02-08T10:30:45Z
- **Tasks:** 2 (combined into single commit)
- **Files modified:** 1

## Accomplishments
- Pre-computed color caches for all static tiles, special overrides, and animated tiles built once at tileset load
- Replaced center-pixel sampling with average of all 256 pixels per tile for accurate color representation
- Debounced map tile changes at 150ms to batch rapid paint/fill operations
- Viewport changes trigger immediate redraw for responsive panning and zooming
- Special tile colors: walls (steel blue-gray), powerups (bright gold), empty space (dark blue-black)
- Animated tiles show frame-0 averaged color with gameplay overrides for warps (bright green), flags (team colors), switches (gold), neutral flags (light gray)

## Task Commits

Both tasks were combined into a single atomic commit:

1. **Tasks 1-2: Average-color cache + optimized draw loop + debounced redraws** - `86d289f` (feat)

## Files Created/Modified
- `src/components/Minimap/Minimap.tsx` - Optimized minimap rendering with three-tier color caching system

## Decisions Made

**Color Cache Architecture:**
- Three separate data structures: `tileColorCacheRef` (Uint8Array for all static tiles), `specialColorMapRef` (Map for static overrides like walls/powerups), `animColorCacheRef` (Uint8Array 256 entries for animation IDs)
- Static tiles check special overrides first, then average cache for accurate color representation
- Animated tiles use frame-0 averaged color with hardcoded overrides for gameplay-significant tiles

**Debounce Strategy:**
- Map tile changes debounced at 150ms to batch rapid painting/filling without lag
- Viewport changes immediate (no debounce) for responsive panning and zooming feel
- Initial draw triggered when cache finishes building to render minimap on tileset load

**Tile Color Overrides:**
- Empty space (tile 280): `[26, 26, 46]` dark blue-black
- Walls (all 15 wall types via `wallSystem.isWallTile()`): `[90, 100, 140]` steel blue-gray
- Powerups (tiles 36-39, 76-79): `[255, 220, 50]` bright gold
- Warps (anim IDs 0xF6-0xFA, 0x9E): `[80, 220, 80]` bright green
- Flag poles (team 0-3): team colors (green/red/blue/yellow)
- Switches (anim ID 0x7B): `[220, 180, 100]` gold
- Neutral flags (anim ID 0x8C): `[200, 200, 200]` light gray

**Performance Improvements:**
- Removed HSL fallback computation (30+ lines of math per uncached tile)
- Removed hardcoded tile ID heuristics (`tileId < 250` for walls, `tileId >= 4000` for special)
- Zero temporary canvas elements created during draw loop (only one-time 16x16 temp canvas during cache init)
- Removed `tilesetImage` from draw() dependencies (draw function only reads from cache refs)

## Deviations from Plan

None - plan executed exactly as written. All tasks completed according to specification.

## Issues Encountered

None - implementation proceeded smoothly. The three-tier cache lookup (animated → special overrides → average → fallback) cleanly handles all tile types without edge cases.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Minimap rendering optimized and ready for Phase 24 (Batch State Operations)
- Color cache pattern established for potential reuse in other rendering optimizations
- No blockers for next phase

## Self-Check

Verifying implementation claims:

**Files Modified:**
- `src/components/Minimap/Minimap.tsx` - CONFIRMED (modified with three cache refs, average-color sampling, debounced redraws)

**Commits:**
- `86d289f` - CONFIRMED (feat(23-01): optimize minimap with average-color cache and debounced redraws)

**Key Implementation Details:**
- Temp canvas sized 16x16 (not 1x1) - CONFIRMED (line: `tempCanvas.width = TILE_SIZE; tempCanvas.height = TILE_SIZE;`)
- Average of all 256 pixels - CONFIRMED (loop through `pixels.length` with `i += 4`, divide by `pixelCount`)
- Three cache refs - CONFIRMED (`tileColorCacheRef`, `specialColorMapRef`, `animColorCacheRef`)
- Debounced map changes - CONFIRMED (`setTimeout` with `DEBOUNCE_DELAY` in map useEffect)
- Immediate viewport updates - CONFIRMED (viewport useEffect calls `draw()` directly with no timeout)
- Special overrides applied - CONFIRMED (walls via `wallSystem.isWallTile()`, flags/warps/switches via animation ID arrays)
- No `tilesetImage` in draw dependencies - CONFIRMED (dependency array is `[map, viewport, getViewportRect]`)

## Self-Check: PASSED

All claims verified. Implementation matches specification exactly.

---
*Phase: 23-minimap-performance*
*Completed: 2026-02-08*
