---
phase: 96-icon-animation
plan: 01
subsystem: ui
tags: [react, canvas, animation, toolbar, zustand]

# Dependency graph
requires:
  - phase: 95-tileset-rendered-icons
    provides: tilesetToolIcons useMemo with tileset-rendered static icons, bunkericon.png for bunker
provides:
  - toolbarAnimationActive boolean state + setToolbarAnimationActive action in GlobalSlice
  - useAnimationTimer extended smart-pause that keeps RAF alive when toolbar icons need animation
  - Canvas-rendered animated toolbar icons for spawn/flag/conveyor/turret/warp
  - Hover/active state tracking for animated icon selection
affects: [97-vertical-toolbox, any future toolbar work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "toolbarAnimationActive ref pattern: subscribe in useAnimationTimer via ref to avoid closure staleness, same as hasVisibleAnimatedRef"
    - "Canvas icon rendering: iconCanvasRefs keyed by icon name, drawing effect re-runs on animationFrame change"
    - "Keepalive effect: useEffect sets toolbarAnimationActive based on hoveredTool/currentTool, cleanup resets to false"

key-files:
  created: []
  modified:
    - src/core/editor/slices/globalSlice.ts
    - src/hooks/useAnimationTimer.ts
    - src/components/ToolBar/ToolBar.tsx
    - src/components/ToolBar/ToolBar.css

key-decisions:
  - "Only animate icons with multi-frame animations: spawn(0xA6, 10f), flag(0x1C, 4f), conveyor(0xB7, 8f), turret(0xBD, 4f), warp(9 anims, 4f each)"
  - "Warp canvas is 48x48 (3x3 tiles at 16px) with CSS width/height 16px to scale down - consistent with Phase 95 composite pattern"
  - "animationFrame added to useShallow selector in ToolBar -- causes re-render every 150ms when animation active, acceptable for 5 icons"
  - "Static tools (pole, switch, bunker) remain as img elements from tilesetToolIcons useMemo"

patterns-established:
  - "Toolbar animation keepalive: setToolbarAnimationActive(true) in useEffect when hover/active on animated icon"
  - "Canvas ref pattern: iconCanvasRefs.current[iconName] = el via ref callback in JSX"

# Metrics
duration: 15min
completed: 2026-02-20
---

# Phase 96 Plan 01: Animated Toolbar Icons Summary

**Canvas-rendered animated toolbar icons for spawn/flag/conveyor/turret/warp cycling through tileset frames on hover/active, driven by global animationFrame counter**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-20T00:00:00Z
- **Completed:** 2026-02-20
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `toolbarAnimationActive` boolean state and `setToolbarAnimationActive` action to GlobalSlice
- Extended `useAnimationTimer` smart-pause to keep RAF alive when toolbar icons need animation (even on empty/static maps)
- Implemented canvas-rendered animated icons for 5 game object tools: spawn, flag, conveyor, turret, warp
- Hover/active state tracking: icons animate on hover, continue animating when that tool is active, freeze on first frame when idle

## Task Commits

Each task was committed atomically:

1. **Task 1: Add toolbarAnimationActive state and extend animation timer keepalive** - `59fa25a` (feat)
2. **Task 2: Implement animated icon rendering with hover/active state in ToolBar** - `6756d72` (feat)

## Files Created/Modified
- `src/core/editor/slices/globalSlice.ts` - Added toolbarAnimationActive boolean state + setToolbarAnimationActive action
- `src/hooks/useAnimationTimer.ts` - Extended smart-pause condition to include toolbarAnimActiveRef
- `src/components/ToolBar/ToolBar.tsx` - ANIMATED_ICON_ANIMS map, canvas refs, keepalive effect, canvas drawing effect, hover handlers
- `src/components/ToolBar/ToolBar.css` - Added .tileset-tool-icon-canvas rule with pixelated rendering

## Decisions Made
- Only 5 tools animate (spawn, flag, conveyor, turret, warp) -- pole/switch/bunker are static and unaffected
- Warp uses 9 separate animation IDs (0x9A-0xA2) rendered as 3x3 composite on 48x48 canvas, CSS-scaled to 16x16
- animationFrame included in useShallow selector -- re-renders ToolBar every 150ms when any animation active (acceptable cost for 5 icons)
- Static fallback: tilesetToolIcons useMemo kept intact for pole/switch/bunker and as fallback if tilesetImage is null

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Animated toolbar icons complete; Phase 96 plan 01 done
- Ready for Phase 97 (vertical toolbox redesign per user's pending request) or next milestone planning
- No blockers

---
*Phase: 96-icon-animation*
*Completed: 2026-02-20*
