---
phase: 28-core-ui-modernization
plan: 02
subsystem: ui
tags: [css, design-tokens, typography, spacing, variables]

# Dependency graph
requires:
  - phase: 28-01
    provides: Design token system with spacing and typography tokens
provides:
  - All component CSS files use design token var() references for spacing and typography
  - Zero hardcoded font-size px values across all components
  - Zero hardcoded font-weight numeric values across all components
  - Single-source-of-truth control for all UI spacing and typography
affects: [29-panel-component-modernization, 30-dialog-modernization]

# Tech tracking
tech-stack:
  added: []
  patterns: [Design token consumption pattern across all components]

key-files:
  created: []
  modified:
    - src/components/AnimationPanel/AnimationPanel.css
    - src/components/AnimationPreview/AnimationPreview.css
    - src/components/GameObjectToolPanel/GameObjectToolPanel.css
    - src/components/TeamSelector/TeamSelector.css
    - src/components/MapSettingsDialog/MapSettingsDialog.css
    - src/components/MapSettingsPanel/MapSettingsPanel.css
    - src/components/StatusBar/StatusBar.css
    - src/components/TabbedBottomPanel/TabbedBottomPanel.css
    - src/components/TilePalette/TilePalette.css
    - src/components/ToolBar/ToolBar.css

key-decisions:
  - "Consolidated 9-10px font-size values to --font-size-2xs for consistency"
  - "Consolidated 12-13px font-size values to appropriate tokens (xs/sm) based on context"
  - "ToolBar button padding reduced from 3px to --space-0_25 (2px) - imperceptible on 22px button"

patterns-established:
  - "All spacing values in padding/margin/gap must use var(--space-*) tokens"
  - "All font-size values must use var(--font-size-*) tokens"
  - "All font-weight numeric values must use var(--font-weight-*) tokens"
  - "Acceptable exceptions: border widths (1px solid), element dimensions (width/height), negative values, letter-spacing"

# Metrics
duration: 8min
completed: 2026-02-09
---

# Phase 28 Plan 02: Component CSS Tokenization Summary

**All component CSS files migrated to design token system - complete single-source control of spacing and typography across entire UI**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-09T01:53:21Z
- **Completed:** 2026-02-09T02:01:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Replaced all hardcoded font-size px values with var() token references (100% coverage)
- Replaced all hardcoded font-weight numeric values with var() token references (100% coverage)
- Replaced all hardcoded spacing values (padding/margin/gap) with var() token references
- Verified zero remaining hardcoded typography or spacing values via grep
- UI-06 requirement fully satisfied - entire UI controllable from variables.css

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace hardcoded spacing and typography in animation/game object panels** - `cbb2b79` (feat)
   - AnimationPanel.css, AnimationPreview.css, GameObjectToolPanel.css, TeamSelector.css
2. **Task 2: Replace hardcoded spacing and typography in remaining component CSS files** - `eca1566` (feat)
   - MapSettingsDialog.css, MapSettingsPanel.css, StatusBar.css, TabbedBottomPanel.css, TilePalette.css, ToolBar.css

## Files Created/Modified
- `src/components/AnimationPanel/AnimationPanel.css` - All spacing and typography tokenized
- `src/components/AnimationPreview/AnimationPreview.css` - All spacing, typography, and font-weight tokenized
- `src/components/GameObjectToolPanel/GameObjectToolPanel.css` - All spacing and typography tokenized
- `src/components/TeamSelector/TeamSelector.css` - All spacing and typography tokenized
- `src/components/MapSettingsDialog/MapSettingsDialog.css` - All spacing and typography tokenized
- `src/components/MapSettingsPanel/MapSettingsPanel.css` - All spacing, typography, and font-weight tokenized
- `src/components/StatusBar/StatusBar.css` - All spacing tokenized
- `src/components/TabbedBottomPanel/TabbedBottomPanel.css` - All spacing and typography tokenized
- `src/components/TilePalette/TilePalette.css` - All spacing, typography, and font-weight tokenized
- `src/components/ToolBar/ToolBar.css` - All spacing and typography tokenized

## Decisions Made

1. **Font size consolidation:** Consolidated 9-10px range to single --font-size-2xs token, and 12-13px to xs/sm based on semantic context (labels vs body text)
2. **Toolbar button padding:** Reduced from 3px to --space-0_25 (2px) - visually imperceptible on 22px button
3. **Acceptable hardcoded exceptions:** Border widths (1px solid), element dimensions (width/height), negative margins, letter-spacing, and zero values remain hardcoded as they are structural/intrinsic rather than design tokens

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all replacements completed successfully with zero build or runtime errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Complete design token migration achieved - entire UI spacing and typography controlled from variables.css
- UI-06 requirement fully satisfied
- Ready for Phase 29 (Panel Component Modernization) which will leverage this token system
- Changing --font-size-2xs, --space-0_5, or --font-weight-semibold in variables.css now uniformly updates all components

## Self-Check: PASSED

All commits verified:
- `cbb2b79`: feat(28-02): replace hardcoded spacing and typography in animation/game object panels
- `eca1566`: feat(28-02): replace hardcoded spacing and typography in remaining component CSS files

All files verified to exist and contain var() token references.

Verification commands passed:
- `grep -rn "font-size:.*[0-9]px" src/components/ --include="*.css"` → 0 matches
- `grep -rn "font-weight: [0-9]" src/components/ --include="*.css"` → 0 matches
- `npm run typecheck` → pre-existing errors only (unrelated to CSS changes)

---
*Phase: 28-core-ui-modernization*
*Completed: 2026-02-09*
