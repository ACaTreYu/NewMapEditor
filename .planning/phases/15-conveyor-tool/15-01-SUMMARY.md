---
phase: 15-conveyor-tool
plan: 01
subsystem: ui
tags: [toolbar, conveyor, dropdowns, game-objects, variants]

requires:
  - phase: 14-toolbar-activation
    provides: Complete toolbar with all game object tools
provides:
  - CONVEYOR tool button with shortcut C
  - Visual variant dropdown pattern for all game object tools
  - Unified variant selection UX replacing separate panel controls
affects: []

tech-stack:
  added: []
  patterns:
    - Toolbar variant dropdowns (visual selection pattern)
    - Outside click detection for dropdown close

key-files:
  created:
    - src/components/GameObjectToolPanel/GameObjectToolPanel.tsx
    - src/components/GameObjectToolPanel/GameObjectToolPanel.css
  modified:
    - src/components/ToolBar/ToolBar.tsx
    - src/components/ToolBar/ToolBar.css

key-decisions:
  - "Variant selection via toolbar dropdown instead of separate panel controls"
  - "Dropdown toggles on tool button click when tool already active"
  - "GameObjectToolPanel now only shows team selector, warp settings, and custom.dat warnings"

duration: 5min
completed: 2026-02-04
---

# Phase 15 Plan 01: CONVEYOR Tool Button and Variant Dropdowns Summary

**Added CONVEYOR tool button and retrofitted all game object tools with visual variant dropdowns — click tool to see options, select to apply**

## Performance

- **Duration:** 5 min
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- CONVEYOR tool button added to toolbar with left-right arrows icon (↔) and 'C' shortcut
- Variant dropdown pattern implemented for 6 tools: SPAWN, SWITCH, BUNKER, HOLDING_PEN, BRIDGE, CONVEYOR
- Clicking a tool button with variants opens a dropdown showing all available options
- Selecting a variant closes dropdown and activates tool with that setting
- Outside click closes dropdown without making changes
- Small triangle indicator (▼) added to tool labels for tools with variants
- Win98-styled dropdown with beveled borders matching application theme
- GameObjectToolPanel simplified: removed duplicate spawn type, switch type, bunker direction/style, holding pen type, bridge direction, and conveyor direction selects
- GameObjectToolPanel still shows team selector for flag/pole/spawn/holding_pen, warp settings for warp tool, and custom.dat warnings

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CONVEYOR to toolbar and implement variant dropdown** - `24fc3b5` (feat)

## Files Created/Modified
- `src/components/ToolBar/ToolBar.tsx` - Added CONVEYOR button, variant config system, dropdown rendering logic, outside click handler
- `src/components/ToolBar/ToolBar.css` - Dropdown panel and item styling with Win98 bevels
- `src/components/GameObjectToolPanel/GameObjectToolPanel.tsx` - Created panel with team selector, warp settings, custom.dat warnings (removed duplicate variant controls)
- `src/components/GameObjectToolPanel/GameObjectToolPanel.css` - Created panel styling

## Decisions Made
- Variant dropdowns appear below tool buttons instead of in separate panel
- Dropdown shows text labels with arrows/icons instead of tile graphics (simpler, more accessible)
- Tool button with variants gets small triangle indicator (▼) in label
- Clicking active tool toggles dropdown; clicking inactive tool activates and opens dropdown
- BUNKER shows direction dropdown; style setting kept as secondary option (not in this plan's scope)
- SWITCH dropdown dynamically populated based on loaded custom.dat switch count

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in App.tsx, MapParser.ts, WallSystem.ts (unrelated to this change)
- GameObjectToolPanel was showing as untracked but was actually a new file being created, not a modification

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CONVEYOR tool now accessible via toolbar button with shortcut C
- Variant selection UX consistent across all game object tools
- Dropdown pattern can be extended to future tools if needed
- Ready for conveyor placement implementation (drag-to-rectangle with pattern fill)

---
*Phase: 15-conveyor-tool*
*Completed: 2026-02-04*
