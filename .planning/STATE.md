# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The map editing experience should feel intuitive and professional -- tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.
**Current focus:** v1.1.4 — Animated Tool Icons & Update Audit (Phase 97)

## Current Position

Phase: 98 of 98 (Auto-Updater Audit)
Plan: 0 of TBD in current phase
Status: v1.2.0 shipped — Phases 95-97 complete + floating toolbar
Last activity: 2026-02-20 — v1.2.0 released (both platforms, auto-updater verified)

Progress: [████████░░] 80% (this milestone)

## Performance Metrics

**Velocity:**
- Total plans completed: 134 (131 formal + 3 ad-hoc)
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

- [Phase 96]: All 7 tileset-rendered tools animate via canvas; bunker stays PNG with CSS invert
- [Phase 96]: Flag/pole/spawn icons track team settings independently via separate useState
- [Phase 96]: Animation MM defs for red/blue cap pads are wrong -- use static center tiles [881, 1001, 1121, 1241]
- [Phase 96]: Switch center tile cycles through team colors; spawn shows full 3x3 cross for Type 1
- [Phase 95]: Bunker uses custom bunkericon.png with CSS filter:invert(1) on dark/terminal themes
- [Phase 95]: Line tool moved next to Pencil in core tools group

Full log in PROJECT.md Key Decisions table.

### Pending Todos

- User wants vertical toolbox redesign (GIMP-style) after icon animation work
- Add bundled patch selector dropdown to desktop builds (Win/Linux) — same as web version
- Custom themed icons for game tools (bunker/conveyor/flag/switch/turret)

### Blockers/Concerns

None active.

## Session Continuity

Last session: 2026-02-20
Stopped at: v1.2.0 shipped. Phases 95-97 + floating toolbar done. Phase 98 (Auto-Updater Audit) remaining but auto-updater already verified working on both platforms.
Resume file: —

---

*State initialized: 2026-02-17 for milestone v1.0.5*
*Last updated: 2026-02-20 -- v1.2.0 shipped, floating toolbar + animated icons + auto-updater verified*
