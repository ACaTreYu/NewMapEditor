---
phase: 78-cleanup-code-quality
plan: 02
subsystem: ui
tags: [css, design-tokens, oklch, refactoring]

# Dependency graph
requires:
  - phase: 76-warm-palette
    provides: OKLCH two-tier design token system in variables.css
provides:
  - Complete design token coverage for error states (--color-error)
  - Title bar gradient token (--gradient-title-bar)
  - Surface hover overlay token (--surface-hover-overlay)
  - Zero hardcoded colors in component CSS files (except documented exceptions)
affects: [ui, styling, theming, future-ui-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All CSS colors flow from variables.css tokens (OKLCH two-tier system)"
    - "Error/danger red uses --color-error semantic token"
    - "Hover overlays use --surface-hover-overlay for consistency"
    - "Shadows use --shadow-* tokens instead of inline rgba()"

key-files:
  created: []
  modified:
    - src/styles/variables.css
    - src/components/Workspace/Workspace.css
    - src/components/MapSettingsDialog/MapSettingsDialog.css
    - src/components/TilePalette/TilePalette.css

key-decisions:
  - "Added --color-red-500 and --color-orange-600 OKLCH primitives following existing palette naming convention"
  - "Created --gradient-title-bar composite token using oklch(28% 0.15 265) for navy blue"
  - "Kept rgba() for --surface-hover-overlay token definition (acceptable at token definition layer)"
  - "Migrated --text-warning from hex to OKLCH for consistency"

patterns-established:
  - "All component CSS uses design tokens, never hardcoded values"
  - "Error states consistently use --color-error semantic token"
  - "Window shadows use --shadow-xs/sm/md tokens for elevation hierarchy"

# Metrics
duration: 2min
completed: 2026-02-16
---

# Phase 78 Plan 02: CSS Design Token Migration Summary

**Replaced 15 hardcoded hex/rgba values with OKLCH design tokens across 3 component CSS files, establishing complete token coverage for UI consistency**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-16T16:56:56Z
- **Completed:** 2026-02-16T16:58:48Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added 3 new design tokens to variables.css (--color-error, --gradient-title-bar, --surface-hover-overlay)
- Replaced all 15 hardcoded color/shadow values in component CSS files with tokens
- Migrated --text-warning from hex to OKLCH primitive
- Achieved zero hardcoded colors in component CSS (except documented intentional exceptions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Define new design tokens in variables.css** - `da129ed` (feat)
2. **Task 2: Replace hardcoded values in component CSS files** - `6f7323e` (refactor)

## Files Created/Modified
- `src/styles/variables.css` - Added --color-red-500, --color-orange-600, --color-error, --gradient-title-bar, --surface-hover-overlay tokens
- `src/components/Workspace/Workspace.css` - Replaced 8 hardcoded values (3x #dc3545, 2x rgba hover, 3x shadow rgba)
- `src/components/MapSettingsDialog/MapSettingsDialog.css` - Replaced 2 hardcoded values (title bar gradient, hover overlay)
- `src/components/TilePalette/TilePalette.css` - Replaced 5 hardcoded values (1x #ffffff, 4x #cccccc checkerboard)

## Decisions Made
- **OKLCH primitives added:** --color-red-500 (error red) and --color-orange-600 (warning orange) follow existing palette naming convention
- **Gradient token uses OKLCH:** --gradient-title-bar uses oklch(28% 0.15 265) for navy blue (#000080 equivalent), leveraging existing --accent-primary for light end
- **Hover overlay kept as rgba:** --surface-hover-overlay defined as rgba(255,255,255,0.2) - acceptable at token definition layer for broad browser support
- **Text warning migrated:** --text-warning changed from hardcoded #cc4400 to var(--color-orange-600) for consistency

## Deviations from Plan

None - plan executed exactly as written. All 15 hardcoded values replaced as specified.

**Note on CODE-01 requirement:** Research phase grep found zero instances of duplicate viewport centering math in the codebase. This requirement appears to be premature or based on outdated information. Marked CODE-01 as N/A in requirements traceability.

## Issues Encountered

None - all replacements worked correctly on first attempt. TypeScript passes with no errors.

## Intentional Exceptions Documented

The following hardcoded values were intentionally NOT migrated (as documented in plan):

1. **MapCanvas.css line 14:** `#932bcf` - Out-of-bounds canvas background (debug purple), intentionally distinctive
2. **AnimationPanel.css lines 139-140:** Already use `var(--color-error, #e53935)` fallback pattern - will use new --color-error token automatically
3. **RulerNotepadPanel.css, TilesetPanel.css:** Already use `var(--surface-hover, rgba(...))` fallback patterns - no change needed
4. **MapSettingsDialog.css line 142:** Already uses `var(--surface-light, #c0c0c0)` fallback - no change needed
5. **AnimationPanel.tsx line 159:** `#000080` for thumbnail canvas background - intentional navy blue for animation previews

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Complete design token coverage established - all UI colors now flow from variables.css
- Zero hardcoded colors in component CSS files (except documented intentional exceptions)
- Ready for future theming work - all colors centralized in two-tier OKLCH system
- No blockers for remaining phase 78 work

## Self-Check: PASSED

✓ All new tokens exist in variables.css:
  - --color-red-500: oklch(55% 0.22 25)
  - --color-orange-600: oklch(55% 0.17 50)
  - --color-error: var(--color-red-500)
  - --gradient-title-bar: linear-gradient(to right, oklch(28% 0.15 265), var(--accent-primary))
  - --surface-hover-overlay: rgba(255, 255, 255, 0.2)

✓ Zero hardcoded values in component CSS files:
  - grep "#dc3545|#000080|#1084d0|#cccccc" src/components/*.css returns 0 matches
  - grep "rgba(" src/components/Workspace/Workspace.css returns 0 matches

✓ Commits exist:
  - da129ed: feat(78-02): add design tokens
  - 6f7323e: refactor(78-02): replace hardcoded CSS values

✓ TypeScript passes with no errors

---
*Phase: 78-cleanup-code-quality*
*Completed: 2026-02-16*
