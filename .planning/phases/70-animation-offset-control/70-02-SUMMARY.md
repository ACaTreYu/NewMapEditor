---
phase: 70-animation-offset-control
plan: 02
subsystem: tools
tags: [picker-tool, animation-offset, warp-decode, inspection]
dependency_graph:
  requires:
    - 70-01 (offset state and control)
    - TileEncoding utilities (getFrameOffset, getAnimationId, isAnimatedTile)
  provides:
    - Picker tool offset extraction
    - Picker tool warp routing decode
  affects:
    - AnimationPanel (offset field population)
    - GameObjectToolPanel (warp Source/Dest dropdowns)
tech_stack:
  added: []
  patterns:
    - Picker tool integration with animation offset state
    - Warp routing decode (offset % 10 = src, floor(offset / 10) = dest)
    - Conditional state updates (animated vs non-animated tiles)
key_files:
  created: []
  modified:
    - src/components/MapCanvas/MapCanvas.tsx
decisions: []
metrics:
  duration: 85s
  completed: 2026-02-16
---

# Phase 70 Plan 02: Picker Tool Offset Extraction Summary

**One-liner:** Picker tool now extracts offset from animated tiles and decodes warp routing into Source/Dest dropdowns for inspect-adjust-replace workflow.

## Overview

Added offset extraction and warp routing decode to the picker tool handler in MapCanvas, completing the inspection loop for the inspect-adjust-replace workflow. Users can now pick an existing animated tile and have its offset automatically populate the AnimationPanel, and pick warp tiles to decode their routing data.

## Implementation Details

### Imports & Selectors
- **Imports:** Added `getFrameOffset`, `getAnimationId`, `isAnimatedTile` from `@core/map`
- **Zustand selectors:** Added `setAnimationOffsetInput` and `setWarpSettings` to action subscriptions

### Picker Handler Logic
Modified `ToolType.PICKER` case in `handleToolAction()`:

1. **Store picked tile:** `const pickedTile = map.tiles[y * MAP_WIDTH + x]`
2. **Set selected tile:** `setSelectedTile(pickedTile)` (unchanged)
3. **Extract offset from animated tiles:**
   - Check `isAnimatedTile(pickedTile)`
   - Extract offset via `getFrameOffset(pickedTile)` (bits 14-8)
   - Sync to GlobalSlice via `setAnimationOffsetInput(offset)`
4. **Decode warp routing:**
   - If `animId === 0xFA` (functional warp)
   - Decode: `warpSrc = offset % 10`, `warpDest = floor(offset / 10)`
   - Preserve current `warpStyle` from `gameObjectToolState`
   - Update via `setWarpSettings(warpSrc, warpDest, currentWarpStyle)`
5. **Restore previous tool:** `restorePreviousTool()` (unchanged)

### Warp Encoding Pattern
- **Offset encoding:** `destWarp * 10 + srcWarp`
- **Decode:** `src = offset % 10`, `dest = Math.floor(offset / 10)`
- **Range:** 0-9 for each warp ID (10 warps total)

## Deviations from Plan

None — plan executed exactly as written.

## Requirements Coverage

| Requirement ID | Description                                          | Status   |
| -------------- | ---------------------------------------------------- | -------- |
| PICK-01        | Picker extracts offset from animated tiles           | Complete |
| PICK-02        | Picker syncs offset to AnimationPanel                | Complete |
| WARP-02        | Picker decodes warp routing into Source/Dest dropdowns | Complete |

## Testing & Verification

**TypeScript:** Zero new errors (pre-existing unused variable warnings)

**Expected Behavior:**
1. Pick animated tile → offset appears in AnimationPanel offset field
2. Pick warp tile (0xFA) → Source/Dest dropdowns populated with decoded routing
3. Pick non-animated tile → offset state unchanged
4. `restorePreviousTool()` works as before

## Key Files Modified

### src/components/MapCanvas/MapCanvas.tsx
- **Lines 9:** Added TileEncoding imports (`getFrameOffset`, `getAnimationId`, `isAnimatedTile`)
- **Lines 165-166:** Added Zustand action selectors (`setAnimationOffsetInput`, `setWarpSettings`)
- **Lines 1951-1971:** Expanded picker handler with offset extraction and warp decode logic

## Dependencies & Integration

**Upstream dependencies:**
- Plan 70-01: `animationOffsetInput` state and `setAnimationOffsetInput` action
- TileEncoding module: `getFrameOffset()`, `getAnimationId()`, `isAnimatedTile()` utilities

**Downstream effects:**
- AnimationPanel: Offset field auto-populated when picking animated tiles
- GameObjectToolPanel: Warp Source/Dest dropdowns auto-populated when picking warps

## Next Steps

Phase 70 complete (2/2 plans). Ready for verification and milestone summary.

**Suggested user testing:**
1. Place animated tile with offset 64 → pick it → verify offset field shows 64
2. Place warp tile with src=3, dest=7 → pick it → verify dropdowns show 3 and 7
3. Pick non-animated tile → verify offset field unchanged from previous value

## Self-Check: PASSED

**Files created:** None (plan only modified existing file)

**Files modified:**
- FOUND: src/components/MapCanvas/MapCanvas.tsx

**Commits:**
- FOUND: 35e8765

All claimed artifacts verified.
