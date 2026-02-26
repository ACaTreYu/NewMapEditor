---
phase: 100-desktop-patch-dropdown-fix
plan: "01"
subsystem: patch-loading
tags: [electron, ipc, tileset, ui]
dependency_graph:
  requires: []
  provides: [ipc-patch-loading, active-patch-indicator]
  affects: [TilesetPanel, App, electron-main, electron-preload]
tech_stack:
  added: []
  patterns: [ipc-readfile-dataurl, extension-agnostic-findimage, react-state-prop-drilling]
key_files:
  created: []
  modified:
    - electron/main.ts
    - electron/preload.ts
    - src/vite-env.d.ts
    - src/App.tsx
    - src/components/TilesetPanel/TilesetPanel.tsx
    - src/components/TilesetPanel/TilesetPanel.css
decisions:
  - id: D1
    choice: "Add getPatchesDir to vite-env.d.ts (not just preload.ts)"
    rationale: "tsconfig.json includes only src/; preload.ts types are invisible to renderer. vite-env.d.ts is the established place for window.electronAPI type declarations."
metrics:
  duration: "2 minutes"
  completed: "2026-02-26"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 100 Plan 01: Patch Dropdown Fix Summary

IPC-based bundled patch loading via readFile+data URL (replaces broken URL loading in prod), extension-agnostic farplane discovery for AC Default .jpg, and active patch checkmark indicator in dropdown.

## What Was Built

### Task 1: IPC handler + App.tsx rewrite

- **`electron/main.ts`**: Added `patches:getDir` IPC handler returning platform-correct patches dir (`process.cwd()/public/assets/patches` in dev, `process.resourcesPath/patches` in prod)
- **`electron/preload.ts`**: Exposed `getPatchesDir` via contextBridge and added to `ElectronAPI` interface
- **`src/vite-env.d.ts`**: Added `getPatchesDir?` to the renderer-visible `ElectronAPI` type (required because `tsconfig.json` includes only `src/`, not `electron/`)
- **`src/App.tsx`**:
  - Extracted shared `loadImageFromPath` helper (useCallback) replacing duplicated `loadImage` inner functions
  - Rewrote startup `useEffect` to use IPC path resolution with web URL fallback
  - Rewrote `handleSelectBundledPatch` to use IPC readFile (no URL construction)
  - `handleChangeTileset` (custom folder Browse) now calls `setActivePatchName(null)` on success
  - Added `activePatchName` state (initialized `'AC Default'`), passed to TilesetPanel

### Task 2: TilesetPanel active patch indicator

- **`src/components/TilesetPanel/TilesetPanel.tsx`**: Added `activePatchName` prop, applied `.tileset-patch-option--active` class and checkmark span (`&#10003;`) for matching patch
- **`src/components/TilesetPanel/TilesetPanel.css`**: Added `.tileset-patch-option--active` (bold + accent color) and `.tileset-patch-check` (margin-right + accent color)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | d0b5c66 | feat(100-01): IPC-based bundled patch loading + activePatchName state |
| 2 | bf7fe5b | feat(100-01): TilesetPanel active patch indicator (checkmark + bold) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added getPatchesDir to vite-env.d.ts**
- **Found during:** Task 1 typecheck
- **Issue:** `tsconfig.json` includes only `src/`. The `ElectronAPI` interface in `electron/preload.ts` is invisible to renderer code. TypeScript reported `Property 'getPatchesDir' does not exist on type 'ElectronAPI'` for `window.electronAPI.getPatchesDir?.()` calls in App.tsx.
- **Fix:** Added `getPatchesDir?: () => Promise<string>` to `src/vite-env.d.ts` where all other `window.electronAPI` types are declared.
- **Files modified:** `src/vite-env.d.ts`
- **Commit:** d0b5c66 (included in Task 1 commit)

**2. [Rule 3 - Blocking] TilesetPanel activePatchName needed for Task 1 typecheck to pass**
- **Found during:** Task 1 typecheck
- **Issue:** Passing `activePatchName` to `<TilesetPanel>` caused TS error `Property 'activePatchName' does not exist on type 'IntrinsicAttributes & Props'` because the Props interface hadn't been updated yet (Task 2 work).
- **Fix:** Added `activePatchName` to Props interface and destructuring in TilesetPanel.tsx as part of the typecheck iteration. Task 2 CSS + JSX rendering changes were also implemented before final typecheck to resolve the `'activePatchName' is declared but its value is never read` TS6133 error.
- **Files modified:** `src/components/TilesetPanel/TilesetPanel.tsx`

Both deviations required no architectural decisions — they are correctness requirements for the TypeScript compiler. No user permission needed.

## Self-Check

### Files exist
- FOUND: electron/main.ts
- FOUND: electron/preload.ts
- FOUND: src/App.tsx
- FOUND: src/vite-env.d.ts
- FOUND: src/components/TilesetPanel/TilesetPanel.tsx
- FOUND: src/components/TilesetPanel/TilesetPanel.css

### Commits exist
- FOUND: d0b5c66 (Task 1)
- FOUND: bf7fe5b (Task 2)

### Key content
- `patches:getDir` in electron/main.ts: CONFIRMED
- `getPatchesDir` in electron/preload.ts: CONFIRMED
- `getPatchesDir` in src/App.tsx: CONFIRMED
- `activePatchName` in src/App.tsx: CONFIRMED
- `tileset-patch-option--active` in TilesetPanel.css: CONFIRMED

## Self-Check: PASSED
