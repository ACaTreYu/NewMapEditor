---
phase: 74-multi-tile-previews
plan: 01
subsystem: ui/canvas
tags: [preview, game-objects, visual-feedback]
dependency_graph:
  requires:
    - "ANIMATED_WARP_PATTERN constant"
    - "BUNKER_DATA patterns"
    - "bridgeLrData/bridgeUdData from custom.dat"
    - "makeAnimatedTile encoder"
    - "Global animationFrame counter"
    - "Existing conveyor preview pattern (70% opacity)"
  provides:
    - "Warp tool 3x3 hover preview (variant=1)"
    - "Bunker tool rect drag preview"
    - "Bridge tool rect drag preview"
  affects:
    - "src/components/MapCanvas/MapCanvas.tsx drawUiLayer()"
tech_stack:
  added: []
  patterns:
    - "Semi-transparent multi-tile preview (70% opacity)"
    - "Variant-aware tool rendering"
    - "Animated tile preview with frame offset"
    - "Exact placement algorithm mirroring"
key_files:
  created: []
  modified:
    - path: "src/components/MapCanvas/MapCanvas.tsx"
      lines_changed: 223
      description: "Added multi-tile previews for warp/bunker/bridge tools"
decisions:
  - id: PREV-OPACITY
    decision: "All tool previews use 70% opacity matching conveyor pattern"
    rationale: "Visual consistency across all game object tools"
    alternatives: ["Different opacity per tool", "User-configurable opacity"]
  - id: PREV-WARP-VARIANT
    decision: "Variant 0 keeps blue single-tile outline, variant 1 shows 3x3 preview"
    rationale: "Single encoded warp is conceptually different from 3x3 animated warp pattern"
    alternatives: ["Always show 3x3 preview", "Always show single-tile outline"]
  - id: PREV-BRIDGE-ANIMATED
    decision: "Bridge preview includes animated tile check for custom.dat compatibility"
    rationale: "Custom.dat could theoretically contain animated tile IDs in bridge data"
    alternatives: ["Assume bridge tiles always static", "Skip animation check"]
metrics:
  duration: "~2 minutes"
  completed_date: 2026-02-16
  tasks_completed: 2
  commits: 2
---

# Phase 74 Plan 01: Multi-Tile Previews Summary

**One-liner:** Added semi-transparent multi-tile previews for warp (3x3 hover), bunker (rect drag), and bridge (rect drag) game object tools using the same 70% opacity pattern proven by the conveyor tool.

## What Was Built

Three new tool preview modes were added to `MapCanvas.tsx` to provide professional visual feedback during game object placement:

1. **Warp Tool 3x3 Hover Preview (Variant 1):**
   - Shows all 9 animated warp tiles in 3x3 grid centered on cursor
   - Center tile (0x9E) encodes warpSrc/warpDest routing from gameObjectToolState
   - Border tiles use offset=0 for pure animation cycling
   - Green/red outline indicates placement validity
   - Variant 0 (single encoded warp) retains original blue single-tile outline

2. **Bunker Tool Rect Drag Preview:**
   - Shows full bunker tile pattern at 70% opacity during rectangle drag
   - Uses exact same tile selection logic as `GameObjectSystem.placeBunker()`
   - Supports all 8 bunker types (2 styles × 4 directions)
   - 16-tile edge pattern with alternating middle tiles
   - Preview only shows when dimensions valid (w >= 2, h >= 2)

3. **Bridge Tool Rect Drag Preview:**
   - Shows full bridge tile pattern at 70% opacity during rectangle drag
   - Uses exact same tile selection logic as `GameObjectSystem.placeBridge()`
   - Supports LR and UD directions from custom.dat
   - 15-tile edge pattern (5 rows for LR, 5 cols for UD)
   - Includes animated tile check for custom.dat compatibility
   - Preview only shows when custom.dat loaded and dimensions valid

All animated tiles in previews cycle frames using the global `animationFrame` counter, ensuring synchronized animation with placed tiles.

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Details

**Warp Preview (variant-aware):**
- Checks `gameObjectToolState.warpVariant` to determine rendering mode
- Maps `ANIMATED_WARP_PATTERN` indices to tile positions
- Uses `makeAnimatedTile(animId, offset)` for proper tile encoding
- Center tile (index 4): `offset = warpDest * 10 + warpSrc`
- Border tiles (indices 0-3, 5-8): `offset = 0`

**Bunker Preview:**
- Pattern index: `j = bunkerStyle * 4 + bunkerDir`
- Exact 16-tile layout matching `placeBunker()` algorithm
- Corner/edge/middle tile selection based on row/col position
- Static tiles only (no animation check needed)

**Bridge Preview:**
- Data source: `bridgeLrData[0]` or `bridgeUdData[0]` based on direction
- Different edge patterns for LR (row-based) vs UD (col-based)
- 15-tile layout with special cases for corners/edges
- Includes animated tile rendering for custom.dat compatibility

**Code Reuse:**
- All previews use identical screen coordinate calculation: `Math.floor((minX + col - vp.x) * tilePixels)`
- All previews use identical tileset rendering: `ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, screenX, screenY, tilePixels, tilePixels)`
- Animated tile rendering matches conveyor preview pattern exactly

## Verification

All success criteria met:

- ✅ PREV-01: Multi-tile tools show full tile pattern as semi-transparent preview
- ✅ PREV-02: Warp 3x3 preview shows all 9 tiles on hover
- ✅ PREV-03: Bunker preview shows full pattern on drag
- ✅ PREV-04: Bridge preview shows full pattern on drag
- ✅ All previews at 70% opacity matching existing conveyor pattern
- ✅ Zero TypeScript errors (only pre-existing unused variable warnings)
- ✅ Warp preview encodes routing in center tile
- ✅ All animated tiles cycle frames in sync with placed tiles
- ✅ Validity outlines (green/red) indicate placement constraints

## Next Phase Readiness

**Ready to proceed to Phase 75** — all multi-tile preview functionality complete.

No blockers. No cross-phase dependencies introduced.

## Self-Check

Verifying all claims in this summary.

**Files modified:**
- ✅ src/components/MapCanvas/MapCanvas.tsx exists and modified

**Commits exist:**
- ✅ 29c5610 (feat(74-01): add animated warp 3x3 hover preview)
- ✅ 4409881 (feat(74-01): add bunker and bridge rect drag tile previews)

**TypeScript compilation:**
- ✅ `npm run typecheck` passes (only pre-existing warnings)

## Self-Check: PASSED

All files exist, all commits verified, TypeScript compiles successfully.
