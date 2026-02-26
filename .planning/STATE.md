# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.
**Current focus:** Phase 100 — Desktop Patch Dropdown Fix (v1.2.3)

## Current Position

Phase: 100 of 101 for milestone v1.2.3 (Phase 100: Desktop Patch Dropdown Fix)
Plan: 1 of 1 in current phase
Status: Phase complete
Last activity: 2026-02-26 — Completed 100-01-PLAN.md (Desktop Patch Dropdown Fix)

Progress: [██████░░░░] 67% (milestone v1.2.3, 2 of 3 phases done)

## Performance Metrics

**Velocity:**
- Total plans completed: 136 (133 formal + 3 ad-hoc)
- Total phases completed: 99
- Total milestones shipped: 38
- Total execution time: ~90 hours across 38 milestones

**Recent Milestones:**
- v1.2.1 (ad-hoc): Map overview export, smart flood fill, batch rendering, MDI slim-down
- v1.1.4 (Phases 95-98): Animated tool icons, theme-adaptive bunker, auto-updater audit
- v1.1.3 (Phases 91-94): Fixes & Polish — move selection, map boundary, overlay z-index, settings fixes

**Trend:** Stable — consistent execution pace across recent milestones

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- [Phase 99]: Wall neighbor type preservation — use findWallType(currentTile) not this.currentType in updateNeighbor/collectNeighborUpdate (same pattern as updateNeighborDisconnect)
- [Phase 99]: Auto-updater setInterval removed entirely — startup setTimeout(5000) is the correct and sufficient pattern
- [v1.2.1]: BackgroundMode type (transparent/classic/farplane/color/image) already exists in overviewRenderer.ts — reuse for live canvas
- [v1.2.1]: BUNDLED_PATCHES extracted to src/core/patches.ts as single source of truth
- [Phase 97]: Bunker uses CSS filter:invert(1) on dark/terminal themes via .png-tool-icon class
- [Research]: Background must render in blitToScreen AND blitDirtyRect — never into the off-screen tile buffer (causes incremental-patch holes)
- [Phase 100]: Patch dropdown fixed via getPatchesDir IPC + readFile + findImage pattern; activePatchName tracks active bundled patch with checkmark indicator
- [Phase 100]: vite-env.d.ts is the correct place for ElectronAPI types (tsconfig includes only src/; electron/preload.ts types are invisible to renderer)
- [Research]: Patch dropdown uses URL-based loader that silently 404s in production; fix via getPatchesDir IPC + readFile pattern (same as handleChangeTileset)

Full log in PROJECT.md Key Decisions table.

### Pending Todos

- Custom themed icons for game tools (bunker/conveyor/flag/switch/turret) — user will create assets later

### Blockers/Concerns

- Phase 101 (Canvas Background) can now proceed: Phase 100 patch dropdown fix complete, production patch loading is correct

## Session Continuity

Last session: 2026-02-26
Stopped at: Phase 100 complete (100-01); ready to plan Phase 101 (Canvas Background)
Resume file: .planning/phases/100-desktop-patch-dropdown-fix/100-01-SUMMARY.md

---

*State initialized: 2026-02-17 for milestone v1.0.5*
*Last updated: 2026-02-26 — Phase 100 complete, bundled patch dropdown fixed for production builds with active patch indicator*
