---
phase: 68-animated-game-objects
plan: 01
subsystem: game-objects
tags: [animated-tiles, spawn-tool, warp-tool, ui-dropdown]
dependency_graph:
  requires: [animation-system, game-object-tools, zustand-state]
  provides: [animated-spawn-placement, animated-warp-placement]
  affects: [spawn-tool, warp-tool]
tech_stack:
  added: []
  patterns: [variant-dropdown, conditional-dispatch, variant-aware-offset]
key_files:
  created: []
  modified:
    - src/core/map/types.ts
    - src/core/editor/slices/globalSlice.ts
    - src/core/map/GameObjectData.ts
    - src/core/map/GameObjectSystem.ts
    - src/core/editor/slices/documentsSlice.ts
    - src/components/ToolBar/ToolBar.tsx
    - src/components/MapCanvas/MapCanvas.tsx
decisions: []
metrics:
  duration_minutes: 3
  tasks_completed: 2
  commits: 2
  files_modified: 7
  completed_date: 2026-02-16
---

# Phase 68 Plan 01: Animated Spawn and Warp Variants Summary

**One-liner:** Spawn and warp tools now support animated variants - single animated spawn tiles per team and 3x3 animated warp blocks with proper frame cycling.

## What Was Built

Added animated variants to the spawn and warp game object tools:

**Spawn tool:**
- New "Type" dropdown with Static (existing 3x3 cross) / Animated (single tile) variants
- Animated spawn places single animated tile using animation IDs 0xA3-0xA6 (green, red, blue, yellow)
- Static variant preserves existing 3x3 cross pattern unchanged

**Warp tool:**
- New "Type" dropdown with Single (existing encoded tile) / 3x3 Animated (block) variants
- Animated warp places 3x3 block of tiles using animation IDs 0x9A-0xA2 (BigWarp tiles)
- Center tile (0x9E) is the actual warp location
- Single variant preserves existing single encoded tile behavior

**Implementation:**
- `spawnVariant` and `warpVariant` state fields (0 = static/single, 1 = animated)
- `ANIMATED_WARP_PATTERN` constant with 9 pre-encoded animation IDs
- `placeAnimatedSpawn()` and `placeAnimatedWarp()` methods in GameObjectSystem
- Variant-aware dispatching in `placeGameObjectForDocument`
- Variant-dependent click offsets in MapCanvas (animated spawn = no offset, animated warp = offset for 3x3 centering)
- All animated tiles automatically cycle frames via existing CanvasEngine animation system

## Tasks Completed

| Task | Name                                                      | Commit  | Files                                                                                                |
| ---- | --------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| 1    | Add animated game object state, data, and placement      | bc3103a | types.ts, globalSlice.ts, GameObjectData.ts, GameObjectSystem.ts                                     |
| 2    | Wire variant dropdowns, dispatcher, and click offsets    | 39dd808 | ToolBar.tsx, documentsSlice.ts, MapCanvas.tsx                                                        |

## Deviations from Plan

None - plan executed exactly as written.

## Requirements Traced

All 7 requirements met:

| ID        | Requirement                                              | Status   | Evidence                                     |
| --------- | -------------------------------------------------------- | -------- | -------------------------------------------- |
| ASPAWN-01 | Spawn tool dropdown shows Static/Animated variants      | COMPLETE | ToolBar.tsx variant config                   |
| ASPAWN-02 | Animated spawn places single tile per team              | COMPLETE | placeAnimatedSpawn() uses 0xA3+team          |
| ASPAWN-03 | Animated spawn tiles cycle frames on canvas             | COMPLETE | Tiles use 0x8000 flag, CanvasEngine renders  |
| AWARP-01  | Warp tool dropdown shows Single/3x3 Animated variants   | COMPLETE | ToolBar.tsx variant config                   |
| AWARP-02  | Animated warp places 3x3 block centered on cursor       | COMPLETE | MapCanvas uses x-1, y-1 offset for variant 1 |
| AWARP-03  | Animated warp tiles cycle frames on canvas              | COMPLETE | ANIMATED_WARP_PATTERN uses 0x8000 flags      |
| AWARP-04  | Center tile of animated warp is warp location (0x9E)    | COMPLETE | ANIMATED_WARP_PATTERN[4] = 0x8000 \| 0x9E    |

## Technical Notes

**Animated spawn is NOT 3x3:**
The static spawn (existing) places a 3x3 cross pattern. The animated spawn places a SINGLE tile. This is a key difference that required separate click offset logic.

**Click offset logic:**
- Static spawn (3x3): uses `placeGameObject(x-1, y-1)` to center on cursor
- Animated spawn (1 tile): uses `placeGameObject(x, y)` - no offset
- Single warp (1 tile): uses `placeGameObject(x, y)` - no offset
- Animated warp (3x3): uses `placeGameObject(x-1, y-1)` to center on cursor

**Animation IDs:**
- Animated spawn: 0xA3 (green), 0xA4 (red), 0xA5 (blue), 0xA6 (yellow)
- Animated warp: 0x9A-0xA2 (9 tiles in 3x3 layout, center = 0x9E)

**Pattern:**
The variant dropdown pattern established here (condition in dispatcher, variant-aware offset in MapCanvas) can be reused for future multi-variant tools.

## Self-Check

Verifying created files and commits:

```bash
# Check commits exist
git log --oneline | grep -E "bc3103a|39dd808"
# bc3103a feat(68-01): add animated spawn and warp state, data, and placement methods
# 39dd808 feat(68-01): wire animated spawn/warp dropdowns and variant-aware placement

# Check key constants exist
grep -n "ANIMATED_WARP_PATTERN" src/core/map/GameObjectData.ts
# 85: export const ANIMATED_WARP_PATTERN: number[] = [

grep -n "placeAnimatedSpawn" src/core/map/GameObjectSystem.ts
# 119: placeAnimatedSpawn(map: MapData, x: number, y: number, team: Team): boolean {

# Check state fields exist
grep -n "spawnVariant" src/core/map/types.ts
# 137:   spawnVariant: number;  // 0 = static (3x3 cross), 1 = animated (single tile)

# Check dropdown configs exist
grep -n "tool: ToolType.SPAWN" src/components/ToolBar/ToolBar.tsx
# 223: tool: ToolType.SPAWN,

grep -n "tool: ToolType.WARP" src/components/ToolBar/ToolBar.tsx
# 232: tool: ToolType.WARP,
```

## Self-Check: PASSED

All commits exist, all key files modified, all constants and methods present.

---

**Phase status:** Plan 01 of phase 68 complete. Ready for verification.
**Next:** Verifier will test animated spawn/warp placement and animation cycling.
