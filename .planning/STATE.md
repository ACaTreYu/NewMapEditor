# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The map editing experience should feel intuitive and professional -- tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.
**Current focus:** v1.1.3 — Fixes & Polish (Phase 93)

## Current Position

Phase: 92 of 94 (Settings Bug Fixes)
Plan: 2 of 2 in current phase
Status: Phase 92 complete
Last activity: 2026-02-20 — Phase 92 complete (unified weapon dropdowns, TurretAssassin, SETT-02 non-issue)

Progress: [██░░░░░░░░] 50% — 2/4 phases complete

## Performance Metrics

**Velocity:**
- Total plans completed: 132 (129 formal + 3 ad-hoc)
- Total phases completed: 92 (91 formal + 1 ad-hoc)
- Total milestones shipped: 33
- Total execution time: ~90 hours across 33 milestones

**Recent Milestones:**
- v1.1.2-linux (Phases 88-90): Linux port -- .deb package, cross-platform build, website dual-platform downloads
- v1.0.6 (Phase 87): Sidebar removal, overlay layout, 3-theme system
- v1.0.5 (Phase 86): Settings lifecycle fix, settingsSerializer.ts extraction

**Trend:** Stable -- consistent execution pace across recent milestones

## Accumulated Context

### Decisions

| ID | Decision | Phase | Rationale |
|----|----------|-------|-----------|
| D91-01-1 | Z-index 200000 for overlays | 91-01 | Exceeds MDI normalization ceiling (100000); matches toolbar dropdown pattern |
| D91-01-2 | Pixel-first minimap render loop | 91-01 | Correct for any MINIMAP_SIZE; more efficient (25,600 vs 65,536 iterations) |
| D92-01-1 | Unified weapon dropdowns (no per-weapon) | 92-01 | User preference: Special Damage/Recharge Rate control all weapons together |
| D92-01-2 | Damage dropdowns sync Flagger equivalents | 92-01 | User request: F-damage settings should match non-flagger on dropdown change |
| D92-01-3 | SETT-02 closed as non-issue | 92-01 | Triage confirmed 53 keys, 871 chars — user scroll issue in SEdit |
| D92-01-4 | TurretAssassin = ObjectiveType 6 | 92-01 | New game mode: kill all enemy turrets, no mode-specific settings |

### Blockers/Concerns

- Phase 93 (Minimap overlap): With minimap enlarged to 160x160, verify at 800x600 window height that minimap bottom and tool panel top do not collide. If collision: stack in a CSS flex column anchored top:8px right:8px.
- Phase 94 (Scope): Move selection is marquee-reposition ONLY (shift selection bounds without moving tiles). Tile-move-with-selection is explicitly deferred to v2+. Document in plan to prevent scope creep.

## Session Continuity

Last session: 2026-02-20
Stopped at: Phase 92 complete. Phase 93 is next.
Resume file: .planning/phases/92-settings-bug-fixes/92-01-SUMMARY.md

---

*State initialized: 2026-02-17 for milestone v1.0.5*
*Last updated: 2026-02-20 -- Phase 92 complete (unified weapon dropdowns, TurretAssassin, SETT-02 non-issue)*
