# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Users can instantly see what any AC map looks like in any patch, and export high-quality overview images.
**Current focus:** Phase 7 -- Batch Rendering (Plan 02 Task 1 complete, awaiting human verification)

## Current Position

Phase: 7 of 8 (Batch Rendering)
Plan: 2 of 2 in current phase
Status: Checkpoint -- awaiting human verification
Last activity: 2026-02-24 -- Completed 07-02 Task 1 (batch dialog UI + state + menu trigger)

Progress: [█████████████████░░░] 85.0%

## Performance Metrics

**Velocity:**
- Total plans completed: 135 (132 formal + 3 ad-hoc)
- Total phases completed: 96 (93 formal + 3 ad-hoc)
- Total milestones shipped: 36
- Total execution time: ~90 hours across 36 milestones

**Recent Milestones:**
- v1.1.3 (Phases 91-94): Fixes & Polish -- move selection, map boundary, overlay z-index, settings fixes
- v1.1.2-linux (Phases 88-90): Linux port -- .deb package, cross-platform build, website dual-platform downloads
- v1.0.6 (Phase 87): Sidebar removal, overlay layout, 3-theme system

**Trend:** Stable -- consistent execution pace across recent milestones

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- [07-02]: BatchRenderDialog reads all state from Zustand (no props); orchestrates directory picker + executeBatchRender on mount
- [07-02]: Batch render triggered via File menu > 'batch-render' IPC action; state managed in globalSlice
- [07-01]: BUNDLED_PATCHES extracted to src/core/patches.ts as single source of truth (removed from TilesetPanel)
- [07-01]: Batch renderer fully self-contained -- no CanvasEngine/React/Zustand imports
- [07-01]: Uses toBlob (not toDataURL) for memory-efficient PNG conversion; single reusable canvas
- [07-01]: Animated tiles resolved to frame 0 for static export; DEFAULT_TILE (280) transparent
- [Phase 96]: All 7 tileset-rendered tools animate via canvas; bunker stays PNG with CSS invert
- [Phase 96]: Flag/pole/spawn icons track team settings independently via separate useState
- [Phase 95]: Bunker uses custom bunkericon.png with CSS filter:invert(1) on dark/terminal themes

Full log in PROJECT.md Key Decisions table.

### Pending Todos

- User wants vertical toolbox redesign (GIMP-style) after icon animation work
- Add bundled patch selector dropdown to desktop builds (Win/Linux) -- same as web version
- Custom themed icons for game tools (bunker/conveyor/flag/switch/turret)

### Blockers/Concerns

None active.

## Session Continuity

Last session: 2026-02-24
Stopped at: 07-02 Task 1 committed (f63c220). Checkpoint: human-verify batch render end-to-end.
Resume file: .planning/phases/07-batch-rendering/07-02-PLAN.md

---

*State initialized: 2026-02-17 for milestone v1.0.5*
*Last updated: 2026-02-24 -- Completed 07-02 Task 1 (batch dialog UI, Zustand state, menu trigger)*
