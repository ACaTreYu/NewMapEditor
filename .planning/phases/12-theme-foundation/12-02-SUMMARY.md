---
phase: 12-theme-foundation
plan: 02
subsystem: ui
tags: [react, typescript, hooks, theming, win98, css]

# Dependency graph
requires:
  - phase: 04-css-variables
    provides: CSS variable system for theming
provides:
  - Win98 color scheme switcher replacing dark/light mode
  - Three Win98 schemes: Standard, High Contrast, Desert
  - localStorage persistence for scheme preference
  - FOUC prevention for Win98 schemes
affects: [13-application-chrome, 14-panel-interiors]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Win98 color scheme management with CSS classes
    - Single state hook for scheme switching

key-files:
  created: []
  modified:
    - src/hooks/useTheme.ts
    - index.html
    - src/components/ToolBar/Toolbar.tsx
    - src/components/MapSettingsPanel/MapSettingsPanel.tsx

key-decisions:
  - "Repurposed existing theme toggle instead of removing it"
  - "Standard scheme uses default :root values without CSS class"
  - "High contrast and desert schemes apply CSS classes for overrides"

patterns-established:
  - "Win98Scheme type as foundation for color scheme management"
  - "FOUC prevention applies scheme classes before CSS loads"

# Metrics
duration: 3min
completed: 2026-02-04
---

# Phase 12 Plan 02: Win98 Scheme Switcher Summary

**Dark/light theme toggle repurposed to Win98 color scheme switcher with Standard, High Contrast, and Desert schemes persisted to localStorage**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-04T09:21:18Z
- **Completed:** 2026-02-04T09:24:05Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced dark/light/system theme modes with Win98 color schemes (standard, high-contrast, desert)
- Updated useTheme hook to manage Win98 schemes without system preference detection
- Updated Toolbar button to cycle through Win98 schemes with appropriate icons and labels
- Updated MapSettingsPanel dropdown to show Win98 scheme options
- Updated FOUC prevention script in index.html to apply Win98 scheme classes

## Task Commits

Each task was committed atomically:

1. **Task 1: Repurpose useTheme hook for Win98 color schemes** - `0830c92` (feat)
2. **Task 2: Update Toolbar and MapSettingsPanel theme toggle UI** - `a276039` (feat)

## Files Created/Modified
- `src/hooks/useTheme.ts` - Win98 color scheme management hook with three schemes (standard, high-contrast, desert)
- `index.html` - FOUC prevention script updated to apply Win98 scheme classes before CSS loads
- `src/components/ToolBar/Toolbar.tsx` - Theme button cycles through Win98 schemes with icons (W/H/D) and labels
- `src/components/MapSettingsPanel/MapSettingsPanel.tsx` - Theme dropdown replaced with Win98 scheme selector

## Decisions Made

**1. Repurposed existing theme toggle instead of removing it**
- THEME-02 task said "remove dark/light" but user decided to keep a scheme switcher
- Reusing existing infrastructure (localStorage, CSS classes, UI) minimized code changes
- Win98 schemes are functionally similar to dark/light modes but with period-appropriate naming

**2. Standard scheme uses default :root values without CSS class**
- Simplifies CSS logic - no class to apply for standard scheme
- High contrast and desert schemes apply overriding CSS classes
- Follows CSS cascade pattern where defaults are unclassed

**3. Removed system preference detection entirely**
- Win98 didn't have OS-level theme detection, so this is historically accurate
- Simplifies hook logic - no media query listeners needed
- Users explicitly choose schemes via UI

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Win98 scheme switching infrastructure complete
- Ready for theme CSS variable definition in next plans
- Standard scheme (default :root values) needs Win98 color variables defined
- High contrast and desert scheme overrides can be added after standard is established

---
*Phase: 12-theme-foundation*
*Completed: 2026-02-04*
