---
phase: 95-tileset-rendered-icons
plan: 01
subsystem: ui
tags: [toolbar, icons, tileset, canvas, css-filter]

requires:
  - phase: 79-toolbar-icons
    provides: "Initial tileset-rendered icon pattern for spawn/pole/warp"
provides:
  - "All 8 game object tools have tileset-rendered or PNG icons with SVG fallbacks"
  - "3x3 composite icon rendering pattern for switch and warp"
  - "CSS invert filter for PNG icons on dark themes"
affects: [96-icon-animation, 97-theme-adaptive-bunker]

tech-stack:
  added: []
  patterns: ["3x3 composite tile rendering into toolbar icon", "PNG dark-theme inversion via CSS filter"]

key-files:
  created: []
  modified:
    - src/components/ToolBar/ToolBar.tsx
    - src/components/ToolBar/ToolBar.css

key-decisions:
  - "Switch and warp icons rendered as 3x3 composites (48x48 canvas scaled to 16x16) for recognizable appearance"
  - "Bunker uses custom bunkericon.png with CSS filter:invert(1) on dark/terminal themes"
  - "Turret rendered from tileset tile 2728 (first frame of 4-frame animation)"
  - "Line tool moved from separate gameDrawTools section into coreTools after Pencil"

patterns-established:
  - "3x3 composite icon: create 48x48 canvas, draw 9 tiles, scale via img width/height attributes"
  - "PNG icon dark-theme inversion: png-tool-icon class + CSS [data-theme] filter:invert(1)"

duration: 25min
completed: 2026-02-20
---

# Phase 95 Plan 01: Tileset-Rendered Icons Summary

**All 8 game object toolbar icons now display tileset/PNG artwork with SVG fallbacks; switch and warp show 3x3 composites; bunker inverts on dark themes**

## Performance

- **Duration:** 25 min
- **Started:** 2026-02-20T11:36:00Z
- **Completed:** 2026-02-20T12:01:20Z
- **Tasks:** 2 (1 auto + 1 checkpoint)
- **Files modified:** 2

## Accomplishments
- Removed 5 dead PNG imports (bunkericon, conveyoricon, flagicon, switchicon, turreticon) that referenced non-existent files
- Flag (tile 905), conveyor (tile 1717), turret (tile 2728) rendered as single-tile icons from tileset
- Switch rendered as 3x3 composite (tiles 702-704/742-744/782-784) for recognizable appearance
- Warp rendered as 3x3 big warp first frame (tiles 1347-1349/1387-1389/1427-1429)
- Bunker restored to custom bunkericon.png with CSS filter:invert(1) on dark/terminal themes
- SVG fallbacks for all 8 game object tools when no tileset loaded (turret=LuTarget, conveyor=LuArrowRight)
- Line tool relocated from separate section to after Pencil in core tools

## Task Commits

1. **Task 1: Remove dead PNG imports, add tileset-rendered icons** - `8442640` (feat)
2. **Fix: 3x3 composites for switch/warp, restore bunker PNG, add turret** - `5edb2e4` (fix)
3. **Fix: Use custom bunkericon.png** - `5e14f21` (fix)
4. **Feature: Invert bunker PNG on dark/terminal themes** - `5b0c8c2` (feat)
5. **Fix: Move Line tool next to Pencil** - `bfaeef6` (fix)
6. **Revert: Section labels (user preference)** - `5db1b13` (revert)

## Files Created/Modified
- `src/components/ToolBar/ToolBar.tsx` - Tileset-rendered icons, 3x3 composites, PNG import, SVG fallbacks, line tool reorder
- `src/components/ToolBar/ToolBar.css` - png-tool-icon class, dark theme inversion filter

## Decisions Made
- Switch and warp icons use 3x3 composite rendering (48x48 canvas) instead of single tiles — user wanted recognizable multi-tile appearance
- Bunker uses custom bunkericon.png (user's hand-made icon) instead of GiStoneBridge SVG or bunker-sedit.png
- Dark theme inversion done via CSS filter:invert(1) on png-tool-icon class — simple, no JS needed
- Line tool moved next to Pencil per user preference (was in separate gameDrawTools section)
- Toolbar section labels attempted but reverted per user preference — vertical toolbox redesign planned instead

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dead PNG imports were partially wrong**
- **Found during:** Task 1 verification
- **Issue:** Plan said bunkericon.png doesn't exist, but src/assets/toolbar/bunkericon.png does exist
- **Fix:** Restored bunkericon.png import for bunker tool
- **Files modified:** src/components/ToolBar/ToolBar.tsx
- **Verification:** Bunker icon renders correctly
- **Committed in:** 5e14f21

**2. [Rule 1 - Bug] Bunker icon invisible on dark themes**
- **Found during:** User checkpoint feedback
- **Issue:** Black PNG icon invisible against dark toolbar backgrounds
- **Fix:** Added png-tool-icon class and CSS filter:invert(1) for dark/terminal themes
- **Files modified:** src/components/ToolBar/ToolBar.tsx, src/components/ToolBar/ToolBar.css
- **Verification:** Icon shows white on dark/terminal themes
- **Committed in:** 5b0c8c2

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both essential for correct icon display. No scope creep.

## Issues Encountered
- Plan incorrectly stated all 5 PNG files were missing; bunkericon.png existed in src/assets/toolbar/
- Switch/warp icons changed from single-tile to 3x3 composite per user feedback at checkpoint

## Next Phase Readiness
- All tileset-rendered icons in place, ready for Phase 96 (icon animation)
- Animation targets: switch middle cycling team colors, warp 4-frame 3x3, spawn animation when selected, turret 2728-2731

---
*Phase: 95-tileset-rendered-icons*
*Completed: 2026-02-20*
