---
phase: 88-build-architecture
plan: 01
subsystem: infra
tags: [electron-builder, cross-platform, linux, appimage, platform-detection]

# Dependency graph
requires: []
provides:
  - electron/platform.ts with isMac, isLinux, isWindows constants and registerWindowAllClosed helper
  - npm scripts electron:build:win and electron:build:linux using --win and --linux flags
  - main.ts free of process.platform references
affects: [89-linux-platform, 90-linux-updater]

# Tech tracking
tech-stack:
  added: []
  patterns: [platform-detection-module, centralized-platform-checks]

key-files:
  created: [electron/platform.ts]
  modified: [package.json, electron/main.ts]

key-decisions:
  - "All process.platform checks consolidated to electron/platform.ts; renderer (src/) code never checks platform"
  - "registerWindowAllClosed() helper abstracts the macOS quit behavior for reuse"

patterns-established:
  - "Platform isolation: electron/platform.ts is the single home for process.platform checks"
  - "Per-platform build scripts: use --win and --linux flags on electron-builder CLI"

# Metrics
duration: 15min
completed: 2026-02-18
---

# Phase 88 Plan 01: Build Architecture Summary

**Cross-platform electron-builder scripts added (electron:build:win, electron:build:linux) and process.platform consolidated into new electron/platform.ts module**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-18T10:27:24Z
- **Completed:** 2026-02-18T10:42:00Z
- **Tasks:** 1 of 2 complete (Task 2 is checkpoint: human-verify in WSL)
- **Files modified:** 3

## Accomplishments
- Created `electron/platform.ts` with `isMac`, `isLinux`, `isWindows` constants and `registerWindowAllClosed()` helper
- Added `electron:build:win` and `electron:build:linux` scripts to package.json
- Removed all `process.platform` references from `electron/main.ts`, replaced with platform.ts call
- Verified Windows build produces `release/AC Map Editor Setup 1.1.2.exe` with no regression

## Task Commits

Each task was committed atomically:

1. **Task 1: Add cross-platform build scripts and create platform.ts** - `e023281` (feat)

## Files Created/Modified
- `electron/platform.ts` - Centralized platform detection: isMac, isLinux, isWindows constants + registerWindowAllClosed() helper
- `package.json` - Added electron:build:win and electron:build:linux scripts
- `electron/main.ts` - Import from platform.ts, removed inline window-all-closed handler with process.platform check

## Decisions Made
- Placed `registerWindowAllClosed(app)` call after `app.whenReady().then(...)` block, not inside it, so the listener registers independently of the ready event (consistent with how Electron recommends structuring top-level app event listeners)
- Import added as 6th import line in main.ts, grouped with other Electron-related imports at the top

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Task 1 complete: Windows build verified, platform.ts in place, typecheck passes
- Task 2 (checkpoint): Linux AppImage verification requires WSL. User must:
  1. Open WSL2 terminal
  2. `cd /mnt/e/NewMapEditor`
  3. Run `npm install` (rebuilds native modules for Linux)
  4. Run `npm run electron:build:linux`
  5. Confirm `release/` contains `.AppImage` and `latest-linux.yml`
- Phase 89 (Linux Platform Polish) is unblocked for platform.ts additions (XDG paths, menu adjustments)
- Phase 90 (Linux Auto-Updater) depends on AppImage output from this phase

---
*Phase: 88-build-architecture*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: electron/platform.ts
- FOUND: package.json (modified)
- FOUND: electron/main.ts (modified)
- FOUND: .planning/phases/88-build-architecture/88-01-SUMMARY.md
- FOUND: commit e023281 (feat(88-01): add cross-platform build scripts and create platform.ts)
