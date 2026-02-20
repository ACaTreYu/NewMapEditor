---
phase: 96-icon-animation
plan: 01
subsystem: ui
tags: [react, canvas, animation, toolbar, zustand, tileset]

# Dependency graph
requires:
  - phase: 95-tileset-rendered-icons
    provides: tilesetToolIcons useMemo with tileset-rendered static icons, bunkericon.png for bunker
provides:
  - toolbarAnimationActive boolean state + setToolbarAnimationActive action in GlobalSlice
  - useAnimationTimer extended smart-pause that keeps RAF alive when toolbar icons need animation
  - Canvas-rendered animated toolbar icons for all 7 animatable game object tools
  - Per-tool team/variant tracking so icon reflects current tool settings
  - Icons auto-update when different GFX patches are loaded (rendered from tileset, not PNGs)
affects: [97-theme-adaptive-bunker, any future toolbar work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "toolbarAnimationActive ref pattern: subscribe in useAnimationTimer via ref to avoid closure staleness"
    - "Canvas icon rendering: iconCanvasRefs keyed by icon name, drawing effect re-runs on animationFrame change"
    - "Keepalive effect: useEffect sets toolbarAnimationActive based on hoveredTool/currentTool, cleanup resets to false"
    - "Independent tool state tracking: separate useState per tool icon for team/variant so changes don't cross-contaminate"
    - "Composite icon pattern: 48x48 canvas (3x3 tiles) CSS-scaled to 16x16 for warp/switch/pole/spawn"

key-files:
  created: []
  modified:
    - src/core/editor/slices/globalSlice.ts
    - src/hooks/useAnimationTimer.ts
    - src/components/ToolBar/ToolBar.tsx
    - src/components/ToolBar/ToolBar.css

key-decisions:
  - "All 7 game object tools with tileset icons now use canvas rendering (spawn, flag, pole, conveyor, turret, warp, switch)"
  - "Flag icon shows waving flag per selected team color (green/red/blue/yellow/white)"
  - "Pole icon shows full 3x3 animated cap pad per selected team, with correct static center tiles"
  - "Switch icon cycles center tile through 4 team colors (green/red/blue/yellow)"
  - "Spawn icon: Type 1 shows full 3x3 cross (animated NSEW + static center), Type 2 shows single OnMapSpawn tile at full size"
  - "Independent team tracking per tool: changing flag team doesn't affect pole icon and vice versa"
  - "Animation MM defs for red/blue cap pads point to wrong tiles — use known-good static center tiles instead"
  - "Bunker remains as PNG with CSS invert — only tool not canvas-rendered"

patterns-established:
  - "Toolbar animation keepalive: setToolbarAnimationActive(true) in useEffect when hover/active on animated icon"
  - "Canvas ref pattern: iconCanvasRefs.current[iconName] = el via ref callback in JSX"
  - "Per-tool icon state: separate useState tracks last-seen settings when each tool is active"

# Metrics
duration: 45min
completed: 2026-02-20
---

# Phase 96 Plan 01: Animated Toolbar Icons Summary

**Canvas-rendered animated toolbar icons for all 7 game object tools — team/variant-aware, driven by global animationFrame counter, auto-updating with GFX patches**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-02-20
- **Completed:** 2026-02-20
- **Tasks:** 2 planned + 10 iterative refinements
- **Files modified:** 4

## Accomplishments
- Added `toolbarAnimationActive` state to GlobalSlice with animation timer keepalive
- All 7 tileset-rendered game object tools now use animated canvas icons (spawn, flag, pole, conveyor, turret, warp, switch)
- Flag icon shows waving flag matching selected team color (5 colors)
- Pole icon shows full 3x3 animated cap pad matching selected team (4 colors)
- Switch icon cycles center tile through green/red/blue/yellow team colors
- Spawn icon reflects both variant (Type 1 = 3x3 cross, Type 2 = single OnMapSpawn) and team color
- Independent team tracking: flag/pole/spawn icons don't cross-contaminate when changing settings
- Icons automatically update when loading different GFX patches (rendered from tileset, not static PNGs)

## Task Commits

1. **Task 1: Add toolbarAnimationActive state and timer keepalive** - `59fa25a` (feat)
2. **Task 2: Implement animated icon rendering with hover/active state** - `6756d72` (feat)
3. **Switch icon animation** - `fccbcff` (feat) — center cycles through team colors
4. **White flag animation** - `8a7391d` (feat) — flag icon uses White Flag (0x8C)
5. **Flag per team color** - `c4b6ca2` (feat) — flag shows selected team's waving flag
6. **Animated pole + icon size bump** - `cfaaa72` (feat) — full 3x3 cap pad per team
7. **Independent team tracking + size revert** - `0559513` (fix) — flag/pole don't cross-contaminate
8. **Pole center tile fix** - `4fd8a27` (fix) — use known-good tiles, not broken animation defs
9. **Spawn team + variant** - `302c7a5` (feat) — reflects selected team and type
10. **Spawn full 3x3 cross** - `8939781` (feat) — animated NSEW + static center
11. **Type 2 spawn full size** - `f2b5704` (fix) — single tile fills canvas instead of tiny center

**Plan metadata:** `8322ee3` (docs: complete plan)

## Files Created/Modified
- `src/core/editor/slices/globalSlice.ts` - toolbarAnimationActive boolean + setter action
- `src/hooks/useAnimationTimer.ts` - Extended smart-pause: `hasVisibleAnimatedRef || toolbarAnimActiveRef`
- `src/components/ToolBar/ToolBar.tsx` - ANIMATED_ICON_ANIMS, canvas refs, per-tool team tracking, drawing effects for all 7 tools
- `src/components/ToolBar/ToolBar.css` - .tileset-tool-icon-canvas with pixelated rendering

## Decisions Made
- All 7 tileset-rendered tools animate via canvas (bunker stays PNG with CSS invert)
- Flag/pole/spawn track their team settings independently via separate useState
- Animation MM definitions for red (0x4F=382) and blue (0x58=544) cap pads are wrong — use static center tiles [881, 1001, 1121, 1241]
- Spawn Type 2 renders single tile filling entire 48x48 canvas for proper display size
- Icon size kept at 16x16 CSS (tried 24x24, reverted per user preference)

## Deviations from Plan

### Iterative Refinements (user-directed)

1. **Switch animation added** — Plan excluded switch as "static (1-frame)". User wanted center tile cycling through team colors.
2. **Flag made team-aware** — Plan used fixed White Flag (0x8C). User wanted flag to match selected team color.
3. **Pole made animated** — Plan excluded pole as static. User wanted full 3x3 animated cap pad per team.
4. **Spawn made team+variant aware** — Plan used fixed Yellow OnMapSpawn. User wanted both team and type reflected.
5. **Independent team tracking** — Flag and pole share flagPadType state but user wanted icons independent.
6. **Pole center tile fix** — Discovered animation MM defs wrong for red/blue, used known-good tiles.

**Total deviations:** 6 user-directed refinements expanding scope from 5 animated tools to 7, all team-aware.
**Impact:** Significantly improved result — every tileset-rendered icon is now animated and reflects current tool settings.

## Issues Encountered
- Animation MM definitions for Red Cap Pad (0x4F→tile 382) and Blue Cap Pad (0x58→tile 544) point to wrong tiles. Fixed by using static center tiles from pole preview code.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 tileset-rendered game object tools have animated, team-aware icons
- Ready for Phase 97 (Theme-Adaptive Bunker Icon) or Phase 98 (Auto-Updater Audit)
- No blockers

---
*Phase: 96-icon-animation*
*Completed: 2026-02-20*
