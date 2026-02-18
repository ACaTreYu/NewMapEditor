---
phase: 89-platform-polish
plan: 02
subsystem: infra
tags: [electron, auto-updater, linux, appimage, electron-updater]

# Dependency graph
requires:
  - phase: 89-01
    provides: platform.ts with isLinux constant and app import; menu & accelerators foundation
provides:
  - tryLinuxAppImageRelaunch() in electron/platform.ts — Linux AppImage relaunch via execFile(APPIMAGE)
  - Defensive mkdirSync for userData directory before marker file write
  - update-install IPC handler calls Linux path first, falls back to quitAndInstall on Windows/macOS
affects: [future linux packaging, auto-updater, platform.ts consumers]

# Tech tracking
tech-stack:
  added: [child_process.execFile (Node.js built-in, no new npm dep)]
  patterns:
    - "All platform-specific logic in electron/platform.ts — no process.platform checks in main.ts"
    - "Linux AppImage relaunch via execFile(APPIMAGE) + app.quit() to bypass tmpfs mount issue"
    - "Defensive mkdirSync with recursive:true + swallowed error for userData dir creation"

key-files:
  created: []
  modified:
    - electron/platform.ts
    - electron/main.ts

key-decisions:
  - "Use execFile(APPIMAGE) + app.quit() on Linux instead of quitAndInstall — quitAndInstall installs correctly but relaunch fails because AppImages run from tmpfs mounts that disappear after quit"
  - "Write update marker BEFORE relaunch attempt on all platforms so splash shows 2s on next restart"
  - "Defensive mkdirSync for userData — Electron creates it on Windows/macOS but may not on first-run Linux before app.ready fires"

patterns-established:
  - "Platform functions: tryXxx() returns boolean — caller falls back to platform-agnostic path when false"
  - "All process.platform checks stay in platform.ts; main.ts imports named functions only"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 89 Plan 02: Linux AppImage Auto-Updater Relaunch Summary

**Linux AppImage auto-update relaunch wired via execFile(process.env.APPIMAGE) in platform.ts, with defensive userData mkdirSync and Windows/macOS quitAndInstall fallback unchanged**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-18T11:05:06Z
- **Completed:** 2026-02-18T11:06:16Z
- **Tasks:** 1 of 1
- **Files modified:** 2

## Accomplishments

- Added `tryLinuxAppImageRelaunch()` to `electron/platform.ts` using `execFile(process.env.APPIMAGE)` — fixes the tmpfs relaunch failure on Linux AppImage
- Updated `update-install` IPC handler in `main.ts` to call the Linux path first, falling back to `quitAndInstall(true, true)` for Windows/macOS — no change to existing Windows behavior
- Added defensive `mkdirSync` for userData directory before marker file write — guards against first-run Linux where Electron may not have created the dir yet
- All platform logic stays in `platform.ts` — `main.ts` has no new `process.platform` checks

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tryLinuxAppImageRelaunch and update IPC handler** - `3357a8a` (feat)

## Files Created/Modified

- `electron/platform.ts` - Added `import { execFile } from 'child_process'` and `tryLinuxAppImageRelaunch()` export function
- `electron/main.ts` - Added `tryLinuxAppImageRelaunch` to platform import, added defensive mkdirSync before updateMarkerPath, updated update-install IPC handler

## Decisions Made

- Used `execFile(APPIMAGE)` instead of `spawn` or `exec` — matches the pattern used in electron-builder docs and issues; no shell injection risk since APPIMAGE is an env var set by the AppImage runtime itself
- Wrote update marker BEFORE the relaunch attempt (Linux and Windows) — ensures the 2s splash duration applies on next startup regardless of which relaunch path is taken
- Defensive `mkdirSync` placed at module top level (before `updateMarkerPath` definition) rather than inside `setupAutoUpdater()` — the marker read (`fs.existsSync`) happens at module load time, so the dir must exist before that point

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 89 complete: both plans executed (89-01 menu/accelerators, 89-02 Linux AppImage relaunch)
- PLAT-01 and PLAT-02 requirements satisfied in code
- Linux packaging still requires building on a Linux host (`npm run electron:build:linux`) — this is a known constraint documented in STATE.md blockers
- Ready for Phase 90 or milestone v1.1.2-linux release

## Self-Check

**Files exist:**
- `electron/platform.ts` contains `tryLinuxAppImageRelaunch` export: CONFIRMED (grep line 66)
- `electron/main.ts` imports `tryLinuxAppImageRelaunch`: CONFIRMED (grep line 6)
- `electron/main.ts` calls `tryLinuxAppImageRelaunch()`: CONFIRMED (grep line 368)
- `electron/main.ts` has `mkdirSync` for userData: CONFIRMED (grep line 15)

**Commit exists:**
- `3357a8a`: CONFIRMED (git commit output)

**Typecheck:** PASSED (zero errors)

## Self-Check: PASSED

---
*Phase: 89-platform-polish*
*Completed: 2026-02-18*
