---
phase: 72-9e-warp-routing
plan: 01
subsystem: game-objects
tags: [animated-tiles, warp-routing, tile-encoding, game-objects]

# Dependency graph
requires:
  - phase: 70-animation-offset-control
    provides: warpSrc/warpDest in GlobalSlice for routing state
provides:
  - Animated warp center tile (0x9E) encodes src/dest routing via offset
  - Picker decodes routing from both single (0xFA) and animated (0x9E) warps
affects: [future-game-object-phases, warp-functionality]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Center tile routing pattern: functional data in center, decorative border tiles"
    - "Unified routing decode: same logic for 0xFA and 0x9E animation IDs"

key-files:
  created: []
  modified:
    - src/core/map/GameObjectSystem.ts
    - src/core/editor/slices/documentsSlice.ts
    - src/components/MapCanvas/MapCanvas.tsx

key-decisions:
  - "Center tile only encodes routing (index 4, animId 0x9E), border tiles use offset=0"
  - "Routing encoding identical to single warp: dest*10 + src (0-99 range)"
  - "Picker decodes both 0xFA and 0x9E using same logic"

patterns-established:
  - "Functional center tile pattern: 3x3 blocks encode gameplay data in center tile only"

# Metrics
duration: 2min
completed: 2026-02-16
---

# Phase 72 Plan 01: 9E Warp Routing Summary

**Animated warp center tiles encode src/dest routing data using the same scheme as single warps, with picker decoding both variants identically**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-16T04:57:27Z
- **Completed:** 2026-02-16T04:59:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Animated warp center tile (0x9E) encodes routing as `dest*10 + src` in offset field
- Border tiles of animated warp block use offset=0 (decorative, not functional)
- Picker tool decodes routing from both 0xFA and 0x9E animation IDs
- Warp tool routing state (warpSrc/warpDest) now drives both warp variants

## Task Commits

Each task was committed atomically:

1. **Task 1: Route warp src/dest to animated warp placement** - `afb1d0a` (feat)
2. **Task 2: Extend picker to decode 0x9E warp routing** - `5cf9517` (feat)

## Files Created/Modified
- `src/core/map/GameObjectSystem.ts` - Changed `placeAnimatedWarp` signature from `offset` to `src/dest`, center tile encodes routing, border tiles use offset=0
- `src/core/editor/slices/documentsSlice.ts` - Dispatch passes `warpSrc/warpDest` to animated warp (not `animationOffsetInput`)
- `src/components/MapCanvas/MapCanvas.tsx` - Picker condition extended to decode routing from 0x9E tiles alongside 0xFA

## Decisions Made
- **Center tile only pattern:** Only the center tile (index 4, animId 0x9E) encodes routing data. Border tiles (0x9A-0x9D, 0x9F-0xA2) use offset=0 to keep them purely decorative/animated.
- **Routing vs animation offset separation:** Warp routing uses `warpSrc/warpDest` state, NOT the generic `animationOffsetInput` - maintains clear domain separation between routing (gameplay) and animation (visual).
- **Identical encoding scheme:** Animated warp routing uses same `dest*10 + src` encoding as single warps (0xFA) - enables unified picker decode logic.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Animated warps are now fully functional gameplay objects with routing data
- Both warp variants (single 0xFA, animated 3x3 with 0x9E center) support src/dest routing
- Picker inspect-adjust-replace workflow works for both warp types
- No blockers for future game object phases

## Self-Check: PASSED

All files and commits verified:
- ✓ src/core/map/GameObjectSystem.ts exists
- ✓ src/core/editor/slices/documentsSlice.ts exists
- ✓ src/components/MapCanvas/MapCanvas.tsx exists
- ✓ Commit afb1d0a exists (Task 1)
- ✓ Commit 5cf9517 exists (Task 2)

---
*Phase: 72-9e-warp-routing*
*Completed: 2026-02-16*
