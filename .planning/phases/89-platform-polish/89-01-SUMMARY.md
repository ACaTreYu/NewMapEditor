---
phase: 89-platform-polish
plan: 01
subsystem: ui
tags: [electron, menu, linux, xdg, platform]

# Dependency graph
requires:
  - phase: 88-build-architecture
    provides: platform.ts with isLinux/isMac/isWindows exports and registerWindowAllClosed
provides:
  - Menu Alt-key accelerators (& prefixes) on all 5 top-level labels for Linux/Windows
  - getUserDataPath() documenting Electron XDG compliance on Linux
  - logPlatformPaths() for dev-mode XDG path verification on Linux
affects: [future-linux-testing, platform-compliance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All platform-specific logic lives in electron/platform.ts, not in main.ts"
    - "logPlatformPaths() accepts isDev parameter to avoid circular imports"
    - "Menu & prefixes applied unconditionally - macOS strips them natively"

key-files:
  created: []
  modified:
    - electron/main.ts
    - electron/platform.ts

key-decisions:
  - "No app.setPath() override needed - Electron already uses XDG on Linux by default"
  - "& prefixes applied to all top-level labels without platform guard (safe on all platforms)"
  - "logPlatformPaths() takes isDev as parameter to avoid circular dependency with main.ts"

patterns-established:
  - "XDG compliance: document via getUserDataPath() rather than override"
  - "Platform logging: gate behind isDev && isLinux to avoid production noise"

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 89 Plan 01: Menu Accelerators and XDG Path Documentation Summary

**Linux menu Alt-key accelerators via & prefixes on all 5 top-level labels, plus getUserDataPath() and logPlatformPaths() in platform.ts documenting Electron's built-in XDG compliance**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-18T10:54:00Z
- **Completed:** 2026-02-18T11:02:38Z
- **Tasks:** 1 of 1
- **Files modified:** 2

## Accomplishments

- Added `&` prefix to all 5 top-level menu labels (`&File`, `&Edit`, `&View`, `&Window`, `&Help`) enabling Alt+F/E/V/W/H keyboard navigation on Linux and Windows
- Added `getUserDataPath()` export to `electron/platform.ts` documenting that Electron already uses XDG Base Directory spec on Linux (`~/.config/ac-map-editor`) with no manual override needed
- Added `logPlatformPaths(isDev)` helper that logs userData and appData paths in dev mode on Linux for human verification of XDG compliance
- Wired `logPlatformPaths(isDev)` into `app.whenReady()` startup sequence

## Task Commits

Each task was committed atomically:

1. **Task 1: Add menu & prefixes and XDG path verification** - `aff4c94` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `electron/main.ts` - Import updated to include `logPlatformPaths`; all 5 top-level menu labels now have `&` prefix; `logPlatformPaths(isDev)` called in `app.whenReady()`
- `electron/platform.ts` - Added `import { app } from 'electron'`; added `getUserDataPath()` with XDG documentation JSDoc; added `logPlatformPaths(isDev: boolean)` with dev+Linux guard

## Decisions Made

- No `app.setPath()` override added -- Electron handles XDG natively on Linux. The plan explicitly called this out and it was confirmed correct. `getUserDataPath()` serves as documentation of this fact.
- `& ` prefixes applied unconditionally (no platform guard) -- on macOS the `&` is stripped by the native menu system harmlessly. On Linux/Windows it generates Alt accelerators. This is the standard cross-platform Electron approach.
- `logPlatformPaths()` accepts `isDev: boolean` parameter rather than importing `isDev` from `main.ts` -- prevents circular dependency.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PLAT-01 (XDG paths) satisfied: documented and verified via getUserDataPath()
- PLAT-04 (Linux menu conventions) satisfied: all 5 top-level labels have & prefixes
- Ready for plan 02 execution
- No macOS-only menu roles (`appMenu`, `services`, `hide`, `unhide`) exist in the menu template

---
*Phase: 89-platform-polish*
*Completed: 2026-02-18*

## Self-Check: PASSED

- `electron/main.ts` -- FOUND (5 labels with & prefix confirmed)
- `electron/platform.ts` -- FOUND (getUserDataPath and logPlatformPaths confirmed)
- `.planning/phases/89-platform-polish/89-01-SUMMARY.md` -- FOUND
- Commit `aff4c94` -- FOUND in git log
