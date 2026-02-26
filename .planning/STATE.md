# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.
**Current focus:** Defining requirements for v1.2.3

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-26 — Milestone v1.2.3 started

## Performance Metrics

**Velocity:**
- Total plans completed: 135 (132 formal + 3 ad-hoc)
- Total phases completed: 97 (94 formal + 3 ad-hoc)
- Total milestones shipped: 37
- Total execution time: ~90 hours across 37 milestones

**Recent Milestones:**
- v1.2.1 (ad-hoc): Map overview export, smart flood fill, batch rendering, MDI slim-down
- v1.1.4/v1.2.0 (Phases 95-97): Animated tool icons, theme-adaptive bunker, floating toolbar
- v1.1.3 (Phases 91-94): Fixes & Polish — move selection, map boundary, overlay z-index, settings fixes

**Trend:** Stable — consistent execution pace across recent milestones

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- [Phase 97]: Bunker uses CSS filter:invert(1) on dark/terminal themes via .png-tool-icon class
- [Phase 96]: All 7 tileset-rendered tools animate via canvas; bunker stays PNG with CSS invert
- [Phase 95]: Flag/pole/spawn icons track team settings independently via separate useState
- [v1.2.1]: Map overview export with BackgroundMode type (transparent/classic/farplane/color/image)
- [v1.2.1]: BUNDLED_PATCHES extracted to src/core/patches.ts as single source of truth

Full log in PROJECT.md Key Decisions table.

### Pending Todos

- Add bundled patch selector dropdown to desktop builds (Win/Linux) — same as web version
- Custom themed icons for game tools (bunker/conveyor/flag/switch/turret) — user will create assets later

### Blockers/Concerns

None active.

## Session Continuity

Last session: 2026-02-26
Stopped at: Defining v1.2.3 milestone requirements
Resume file: —

---

*State initialized: 2026-02-17 for milestone v1.0.5*
*Last updated: 2026-02-26 — Milestone v1.2.3 started*
