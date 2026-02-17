---
phase: 81-bug-fixes
plan: 01
subsystem: rendering
tags: [vite, canvas, animation, drag]

# Dependency graph
requires:
  - phase: 53-drag-batching
    provides: CanvasEngine beginDrag/commitDrag/cancelDrag pattern
  - phase: 48-animations
    provides: Animation frame rendering via patchAnimatedTiles
provides:
  - custom.dat served from public/assets/ for Vite compatibility
  - Animated tile transition tracking prevents ghost frames
affects: [rendering, editing, switch-tool, animation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "clearedAnimatedTiles Set pattern for tracking state transitions during drag"

key-files:
  created: []
  modified:
    - public/assets/custom.dat
    - src/core/canvas/CanvasEngine.ts

key-decisions:
  - "Use Set for tracking cleared animated tiles (efficient O(1) lookups during patchAnimatedTiles)"

patterns-established:
  - "Transition tracking pattern: Detect old vs new state during drag, skip stale updates in animation loop"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 81 Plan 01: Bug Fixes Summary

**Switch tool custom.dat served from public/assets/, animated tiles no longer ghost when overwritten**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T01:50:41Z
- **Completed:** 2026-02-17T01:52:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- custom.dat moved to public/assets/ for Vite static serving (fixes BUG-01, BUG-02)
- Animated tile transition tracking prevents ghost animation frames (fixes BUG-03)
- Zero TypeScript errors after all changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Move custom.dat to public/assets/** - `57ee4d2` (fix)
2. **Task 2: Track animated-to-non-animated tile transitions in CanvasEngine** - `342f20f` (fix)

## Files Created/Modified
- `public/assets/custom.dat` - Custom tile pattern data served by Vite from public directory
- `src/core/canvas/CanvasEngine.ts` - Added clearedAnimatedTiles Set tracking animated->non-animated transitions

## Decisions Made

**Use Set for cleared tile tracking** - Set provides O(1) lookup performance during patchAnimatedTiles' nested loop over visible tiles. Map would be overkill (only need existence check, not key-value mapping).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All core editing bugs fixed:
- Switch tool can now load custom.dat successfully
- Painting DEFAULT_TILE over animated tiles works correctly in single pass
- No residual animation frames appear after tile erasure

Ready for next phase of v1.0.2 milestone.

## Self-Check: PASSED

All claims verified:
- FOUND: public/assets/custom.dat
- FOUND: src/core/canvas/CanvasEngine.ts
- FOUND: 57ee4d2 (Task 1 commit)
- FOUND: 342f20f (Task 2 commit)

---
*Phase: 81-bug-fixes*
*Completed: 2026-02-17*
