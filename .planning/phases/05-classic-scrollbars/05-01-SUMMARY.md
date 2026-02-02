---
phase: 05-classic-scrollbars
plan: 01
subsystem: ui
tags: [canvas, scrollbars, navigation, windows-classic, css, react]

# Dependency graph
requires:
  - phase: 04-css-consolidation
    provides: CSS variable system with theme support
provides:
  - Classic Windows-style scrollbars with arrow buttons
  - Click and hold continuous scrolling (~8 tiles/sec)
  - Track click page jumping
  - Thinner 10px scrollbars for more canvas space
affects: [06-collapsible-panels]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CSS border triangles for theme-aware arrow glyphs
    - Continuous scroll with initial delay pattern

key-files:
  created: []
  modified:
    - src/components/MapCanvas/MapCanvas.tsx
    - src/components/MapCanvas/MapCanvas.css

key-decisions:
  - "CSS border triangles instead of SVG for simpler theme color support"
  - "10px scrollbar width (down from 14px) to maximize canvas space"
  - "250ms initial delay before continuous scroll starts"
  - "125ms repeat rate for ~8 tiles/sec continuous scroll"

patterns-established:
  - "Arrow button event handling with cleanup useEffects"
  - "Track click page jump calculation accounting for arrow button space"

# Metrics
duration: 2.5min
completed: 2026-02-02
---

# Phase 5 Plan 1: Classic Scrollbars Summary

**Classic Windows-style scrollbars with arrow buttons, continuous scroll on hold, and thin 10px design using CSS border triangles for theme-aware glyphs**

## Performance

- **Duration:** 2.5 min
- **Started:** 2026-02-02T08:02:39Z
- **Completed:** 2026-02-02T08:05:11Z
- **Tasks:** 2 (Task 3 merged into Task 1)
- **Files modified:** 2

## Accomplishments
- Arrow buttons at each end of both scrollbars with single-tile click scrolling
- Click and hold continuous scrolling after 250ms delay at ~8 tiles/sec
- Track click page jumping by visible viewport size
- Reduced scrollbar width from 14px to 10px for more canvas space
- Theme-aware arrow glyphs using CSS border triangles
- Corner piece filling scrollbar intersection

## Task Commits

Each task was committed atomically:

1. **Task 1: Add arrow button elements and scroll handlers to MapCanvas.tsx** - `94c08da` (feat)
2. **Task 2: Add CSS styling for arrow buttons and thin scrollbars** - `74528ac` (feat)

_Note: Task 3 (corner element and thumb calculations) was completed as part of Task 1_

## Files Created/Modified
- `src/components/MapCanvas/MapCanvas.tsx` - Added scrollByTiles helper, arrow button handlers, track click handler, cleanup useEffects, and JSX for arrow buttons and corner piece
- `src/components/MapCanvas/MapCanvas.css` - Reduced scrollbar width to 10px, added arrow button styles with CSS border triangle glyphs, added corner piece styling

## Decisions Made

**1. CSS border triangles instead of SVG data URIs for arrow glyphs**
- Rationale: Simpler theme color support via CSS variables (var(--text-secondary)) without string interpolation or multiple SVG definitions
- Result: Arrow colors automatically update on theme change

**2. 10px scrollbar width (reduced from 14px)**
- Rationale: Maximize canvas space while maintaining usability
- Result: Thinner, more modern appearance matching classic Windows aesthetic

**3. 250ms initial delay before continuous scroll**
- Rationale: Prevents accidental continuous scrolling from quick clicks
- Result: Clear distinction between single click and hold behavior

**4. 125ms repeat rate (~8 tiles/sec)**
- Rationale: Fast enough for efficient navigation, slow enough for control
- Result: Smooth continuous scrolling that doesn't feel too fast or slow

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Scrollbar navigation is complete and fully functional
- Ready for Phase 6 (Collapsible Panels) which will add panel collapse/expand controls
- Scrollbar implementation provides clean foundation for future navigation enhancements

---
*Phase: 05-classic-scrollbars*
*Completed: 2026-02-02*
